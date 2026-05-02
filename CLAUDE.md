# techmato — Project Context

## What we're building

AI/テック関連の最新ニュースを複数ソースから収集し、Claude APIで日本語要約・台本化して、VOICEVOXで読み上げ、**約1分の音声ニュースとして再生**するWebアプリ。

ユーザー体験はシンプル:「ボタンを押す → 30秒〜1分待つ → 今日のテックニュースが流れる」

## Why this design

- **同期再生不要**: 1本の連続音声を生成して再生するだけなので、YouTube字幕同期のような複雑さがない
- **オンデマンド生成**: ボタン押下で都度生成。cronやバックグラウンドジョブが不要 → インフラがシンプル
- **MVPはローカル動作**: 公開判断は後回し、まず自分が毎日使えるツールにする

## Critical constraints

- 1回の再生時間は**目安60秒、最大90秒**(これを超える台本は短縮させる)
- ニュースソースは**RSS/公式APIを優先**、スクレイピングは最終手段
- 各ニュースの**出典(タイトル+URL)を画面に表示**(著作権・出典明示の観点)
- 要約は**事実ベース**、Claude側の意見・憶測を含めない指示をプロンプトで徹底

## Tech stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (Node runtime)
- **Translation/Summarization**: Anthropic Claude API (`claude-sonnet-4-6`)
- **TTS**: VOICEVOX Engine (Dockerコンテナ、ローカル動作)
- **RSS取得**: `rss-parser` (npm)
- **HTML本文抽出**: `@mozilla/readability` + `jsdom`
- **再生**: HTML `<audio>` 要素(単一ファイル再生のみ、複雑な制御不要)
- **DB**: なし(MVPはローカルファイル/sessionStorageで履歴保持)
- **Deploy**: ローカル動作のみ(将来公開時にVercel + VOICEVOXホスティング検討)

## Repository layout

```
/
├── CLAUDE.md              ← このファイル
├── docs/
│   ├── SPEC.md            ← 機能仕様
│   ├── ARCHITECTURE.md    ← データフロー・パイプライン
│   ├── ROADMAP.md         ← フェーズ別実装計画
│   ├── PROMPTS.md         ← Claude用プロンプトテンプレート
│   └── SOURCES.md         ← ニュースソース定義
├── apps/
│   ├── web/               ← Next.jsフロント+APIルート
│   └── cli/               ← Phase 1のCLI実装
├── packages/
│   ├── pipeline/          ← 取得→要約→台本→TTSのコアロジック
│   └── types/             ← TypeScript型定義
└── infra/
    └── voicevox/          ← VOICEVOXコンテナ用Dockerfile・compose
```

## Coding conventions

- **言語**: TypeScript (strict mode), ESM
- **パッケージマネージャ**: pnpm + workspaces
- **テスト**: Vitest
- **Lint / Format**: Biome
- **エラーハンドリング**: `neverthrow`の`Result<T, E>`型
- **環境変数**: `.env.local`

## Commands

```bash
# ルートで
pnpm install
pnpm dev          # Next.js起動
pnpm cli          # CLI実行(Phase 1)
pnpm test
pnpm lint

# Windows では PowerShell の実行ポリシーで pnpm.ps1 が止まることがあるため pnpm.cmd を使う

# VOICEVOX起動
docker compose -f infra/voicevox/docker-compose.yml up -d
```

## Implementation order

**フェーズ順守**。前フェーズの完了条件をクリアしてから次へ。

1. **Phase 1**: CLI — ニュース取得→要約→台本→音声ファイル生成までを通す
2. **Phase 2**: Webアプリ化 — 「再生」ボタンで上記パイプラインをWebから実行、音声ストリーミング
3. **Phase 3**: 体験改善 — 再生中のニュース見出し表示、出典リンク、ニュース選択フィルタ
4. **Phase 4**: 履歴・お気に入り — 過去生成した放送の保存・再生
5. **Phase 5**: (任意) 公開準備 — レート制限、コスト保護、デプロイ

詳細は `docs/ROADMAP.md`。

## Quality bar

- **Phase 1完了** = ターミナルで`pnpm cli`を叩くと、その日のAI/テックニュース3〜5件を要約した約60秒の音声ファイルが`output/`に出力され、人間が聞いて違和感ないこと
- **Phase 2完了** = ブラウザで「今日のニュース」ボタンを押し、30秒〜1分待ってから音声再生開始、見出しと出典も表示されること

## Out of scope (MVPでは作らない)

- 自動定時生成(cron / Inngest等)
- 認証・マルチユーザー
- 過去のニュースアーカイブ検索
- 多言語対応(日本語固定)
- 動画生成(音声のみ)
- ライブ配信機能

## Notes for Claude Code

- 各フェーズは順番に。前フェーズが動かない状態で次に進まない
- プロンプトは`docs/PROMPTS.md`で一元管理、コード内ハードコード禁止
- ニュースソースの追加・変更は`docs/SOURCES.md`を更新してから実装
- 不明点があれば実装前に質問
