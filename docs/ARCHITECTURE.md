# ARCHITECTURE — システム構成

## 全体図

```
                ┌──────────────────────────┐
                │   Browser (Client)       │
                │  ┌──────────────────┐    │
                │  │ <audio> player   │    │
                │  │ + headline view  │    │
                │  └────────┬─────────┘    │
                │           │ SSE         │
                └───────────┼──────────────┘
                            │
                     ┌──────┴──────┐
                     │  Next.js    │
                     │  (Web+API)  │
                     └──────┬──────┘
                            │
     ┌──────────────────────┼──────────────────────┐
     │                      │                      │
┌────▼────┐         ┌───────▼─────┐         ┌──────▼─────┐
│ News    │         │ Claude API  │         │ VOICEVOX   │
│ Sources │         │ (要約・台本) │        │ (TTS)      │
│ (RSS等) │         └─────────────┘         └────────────┘
└─────────┘
```

## パイプライン(1回の生成フロー)

```
1. POST /api/broadcast (ボタン押下時)
   └─ ジョブを開始、SSE接続返却

2. fetchAllSources()
   ├─ docs/SOURCES.mdに定義されたソースを並列取得
   ├─ 過去24時間の記事のみフィルタ
   ├─ URL+タイトルで重複除去
   └─ 結果: { source: string, title: string, url: string, content: string, publishedAt: Date }[]

3. selectTopStories(articles, n=4)
   ├─ Claude API: 全記事のタイトル+要約をリストで渡し、上位N件を選定
   ├─ プロンプト: "技術者にとって重要・独自・有用な記事を選ぶ"
   └─ 選定理由付きで返却

4. extractFullContent(selectedArticles)
   ├─ 各記事のURLをfetch → @mozilla/readabilityで本文抽出
   ├─ 抽出失敗時はRSSの要約フォールバック
   └─ 各記事に full_text を追加

5. composeScript(stories)
   ├─ Claude API: 全記事を渡して台本生成
   ├─ 出力: { opening, segments: [{title, url, narration}], closing }
   └─ 全体で日本語300〜400文字に収める

6. synthesizeAudio(script)
   ├─ 各セグメントをVOICEVOXに投げる
   ├─ 個別.wavを生成
   ├─ ffmpegで連結 → broadcast.wav
   ├─ セグメント境界のタイムスタンプを記録 → segments.json
   └─ ファイルパスを返却

7. SSEで完了通知
   └─ クライアント: <audio src="..."> を設定して自動再生
```

## API設計

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/broadcast` | 新しい放送を生成、broadcastIdを返却 |
| GET | `/api/broadcast/[id]/events` | SSE進捗ストリーム |
| GET | `/api/broadcast/[id]` | 放送のメタデータ(セグメント情報、ニュースリスト) |
| GET | `/api/broadcast/[id]/audio` | 音声ファイル配信(.wav or .mp3) |

## ファイル構造(ローカル動作時)

```
output/
├── 2026-05-02_T093000/         ← 生成日時ごと
│   ├── broadcast.wav            ← 結合された音声
│   ├── segments.json            ← セグメント開始時刻
│   ├── stories.json             ← 元ニュース一覧
│   └── script.txt               ← 生成された台本(デバッグ用)
└── ...
```

## データ構造

### Article (取得した個別記事)
```typescript
type Article = {
  source: string;       // "Hacker News" | "TechCrunch" | ...
  title: string;
  url: string;
  summary: string;      // RSSのdescription
  content?: string;     // 本文抽出後に埋まる
  publishedAt: Date;
};
```

### Script (Claudeが生成する台本)
```typescript
type Script = {
  opening: string;      // "おはようございます。本日のテックニュースをお届けします。"
  segments: {
    title: string;      // 元ニュースのタイトル
    url: string;        // 元ニュースのURL
    narration: string;  // 読み上げ用テキスト
  }[];
  closing: string;      // "以上、本日のニュースでした。"
};
```

### Broadcast (最終出力)
```typescript
type Broadcast = {
  id: string;                    // タイムスタンプ
  audioUrl: string;
  durationSec: number;
  segments: {
    title: string;
    url: string;
    source: string;
    startSec: number;            // 音声内での開始時刻
    endSec: number;
  }[];
  generatedAt: Date;
};
```

## デプロイ構成

### MVP(ローカル動作)
- Next.jsを `pnpm dev` で起動 → `http://localhost:3000`
- VOICEVOXをDockerで `http://localhost:50021`
- 出力ファイルはローカルディスク(`./output/`)
- 履歴はlocalStorageに `broadcastId` を保存、`output/`から配信

### 将来公開時(Phase 5)
- Next.js → Vercel
- VOICEVOX → Fly.io等のVPS
- ファイルストレージ → Supabase Storage or R2
- レート制限 → Upstash Redis

## コスト試算 (1回の生成)

| 項目 | コスト |
|------|--------|
| ニュース取得(RSS) | $0 |
| 記事本文取得(自前fetch) | $0 |
| Claude API(選定+台本生成、入力10K+出力2Kトークン) | ~$0.06 |
| VOICEVOX(セルフホスト) | $0 |
| **合計** | **~$0.06/生成** |

1日5回使っても月$10未満。ローカル動作なら他の固定費なし。

## エラーハンドリング戦略

| エラー | 対処 |
|--------|------|
| 一部ソース取得失敗 | スキップして続行、UIに警告表示 |
| 全ソース取得失敗 | エラー画面、リトライボタン |
| Claude API失敗 | 1回リトライ、ダメなら明確なエラーメッセージ |
| 本文抽出失敗 | RSSの要約でフォールバック |
| VOICEVOX接続失敗 | 「Dockerが起動しているか確認」のメッセージ |
| 台本が長すぎる(60秒超想定) | Claudeに再生成依頼(短縮指示) |

## セキュリティ・運用

- **API Key**: `.env.local`に格納、絶対にコミットしない(.gitignore)
- **VOICEVOX**: ローカル動作のため認証不要
- **コスト保護**: MVPでは特に対策なし(個人利用前提)、Phase 5で追加
- **ログ**: コンソール出力のみ、本番化時にSentry検討
