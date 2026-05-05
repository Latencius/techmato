# ROADMAP — フェーズ別実装計画

各フェーズの完了条件をクリアしてから次へ。Claude Codeには各フェーズを別セッションで渡すのが推奨。

---

## Phase 1: CLI プロトタイプ ⭐ 最重要

**目的**: パイプライン全体を最小コストで通し、台本品質と音声品質を検証する。

### 成果物
- `apps/cli/` 配下のCLIツール
- `pnpm cli` で実行可能(引数なしで「今のニュース」を生成)
- 出力: `output/{timestamp}/` 配下に
  - `broadcast.wav` - 結合音声
  - `segments.json` - セグメント情報
  - `stories.json` - 元記事情報
  - `script.txt` - 生成された台本(目視確認用)

### 実装タスク

1. **環境セットアップ**
   - pnpm workspaces初期化
   - TypeScript / Vitest / Biome設定
   - VOICEVOX用 `infra/voicevox/docker-compose.yml`
   - `.env.example` 作成 (`ANTHROPIC_API_KEY`, `VOICEVOX_BASE_URL`)

2. **ニュース取得モジュール** (`packages/pipeline/src/sources/`)
   - `docs/SOURCES.md` を読み込む(またはTSで定数化)
   - `rss-parser`でRSS取得
   - 過去24時間フィルタ、URL+タイトルでデデュープ
   - 並列取得、一部失敗は許容

3. **記事本文抽出** (`packages/pipeline/src/extract/`)
   - `@mozilla/readability` + `jsdom`
   - User-Agent設定(ボット拒否回避)、タイムアウト10秒
   - 抽出失敗時はRSSのsummaryフォールバック

4. **記事選定モジュール** (`packages/pipeline/src/select/`)
   - Claude APIで上位N件を選定
   - プロンプトは `docs/PROMPTS.md` から読み込み

5. **台本生成モジュール** (`packages/pipeline/src/script/`)
   - 選定された記事を基にClaudeで台本生成
   - 文字数チェック、超過時は短縮再生成(最大1回)

6. **TTSモジュール** (`packages/pipeline/src/tts/`)
   - VOICEVOX HTTP API呼び出し
   - セグメントごとに合成、wavを保存

7. **音声結合モジュール** (`packages/pipeline/src/merge/`)
   - ffmpegでセグメントを連結
   - 各セグメントの開始時刻を計算してJSONに保存
   - セグメント間に短い無音(300ms程度)を挟むと自然

8. **CLI本体** (`apps/cli/src/index.ts`)
   - 引数: `--speaker`(デフォルト3=ずんだもん), `--max-stories`(デフォルト4)
   - 進捗をconsoleに表示
   - 失敗時のエラーは具体的に

### 完了条件 ✅

- [ ] `pnpm cli` 一発で実行成功
- [ ] **生成された`script.txt`を読んで違和感ないこと**(これが最重要)
- [ ] **`broadcast.wav`を聞いて60秒前後で4〜5件のニュースがちゃんと聞き取れること**
- [ ] 出典(URL)が`stories.json`に正しく記録されている
- [ ] 全体の処理時間が60秒以内

### このフェーズで詰まりやすい点

- **台本の長さ調整**: Claudeは指示しても文字数オーバーしがち。プロンプトに「日本語で450文字以内」を強く指示+チェックロジック
- **本文抽出失敗**: 一部サイト(特にCloudflare保護)は本文取れない。フォールバック必須
- **VOICEVOXの読み間違い**: 英単語の発音が変。固有名詞は事前にカタカナ変換するプロンプト指示を入れる
- **ffmpeg依存**: ローカルにffmpegが必要。Windowsなら `winget install Gyan.FFmpeg`

---

## Phase 2: Webアプリ化

**目的**: CLIで動いたパイプラインをブラウザから叩けるようにする。「ボタン押す→1分で再生」を実現。

### 実装タスク

1. **Next.jsアプリ初期化** (`apps/web/`)
   - App Router構成
   - Tailwind CSS
   - パッケージは`packages/pipeline`を共有

2. **トップページ** (`/`)
   - 中央に「今日のニュースを生成」ボタン
   - 過去の生成があれば「最後の放送を再生」ボタン
   - フッター(ソース一覧、VOICEVOXクレジット)

3. **APIルート**
   - `POST /api/broadcast` - ジョブ起動、broadcastIdを返却
   - `GET /api/broadcast/[id]/events` - SSEで進捗
   - `GET /api/broadcast/[id]` - メタデータ
   - `GET /api/broadcast/[id]/audio` - 音声配信(ファイルストリーム)

4. **進捗UI**
   - SSE受信用 `EventSource` フック
   - ステップインジケータ(取得中/要約中/音声生成中)

5. **再生UI**
   - `<audio>` 要素 + カスタムコントロール
   - `timeupdate`イベントで現在セグメント特定
   - 該当ニュースカードをハイライト
   - 全ニュースリスト表示(タイトル、ソース、URL)

6. **localStorage管理**
   - 生成した放送のbroadcastIdを保存
   - 「最後の放送を再生」で参照

### 完了条件 ✅
- [ ] ブラウザでボタン押下から再生開始まで通しで動く
- [ ] 進捗が画面に反映される
- [ ] 再生中、現在のニュース見出しがハイライトされる
- [ ] 出典URLをクリックで元記事が開く
- [ ] ページリロード後も「最後の放送を再生」で再生可能

---

## Phase 3: 体験改善

### タスク
- ニュースカテゴリフィルタ(AI / Web / セキュリティ / 全部)
- 話者選択ドロップダウン(VOICEVOXキャラ)
- 再生速度切替(1.0x / 1.25x / 1.5x)
- 台本のテキスト表示トグル(目視で確認したい時用)
- ダーク/ライトモード

### 完了条件 ✅
- [ ] 自分が毎日使いたいUIになっている

---

## Phase 4: 履歴

### タスク
- `/history` ページ
- 過去N日分の放送一覧(localStorageベース)
- 各放送を再生可能
- 古い放送のクリーンアップ(7日超は削除)

---

## Phase 5: (任意) 公開準備

- Vercelデプロイ
- VOICEVOXをFly.io等にホスト + 認証
- レート制限(Upstash Redis)
- Anthropic API使用量モニタリング
- 利用規約・プライバシーポリシー
- ランディングページ

---

## 各フェーズでClaude Codeに渡す指示テンプレ

```
@CLAUDE.md と @docs/SPEC.md @docs/ARCHITECTURE.md @docs/ROADMAP.md @docs/PROMPTS.md @docs/SOURCES.md を読んで。

今からPhase X の実装を始めたい。

このフェーズの完了条件を確認して、最初のタスクから順番に実装していって。
不明点があれば実装する前に必ず質問すること。

実装中は以下を守って:
- 各タスク完了ごとにテストを書いてpass確認
- コミットメッセージはConventional Commits
- プロンプトの変更はdocs/PROMPTS.mdに必ず反映
- ニュースソースの追加・変更はdocs/SOURCES.mdを更新
```
