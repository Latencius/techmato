# techmato

AI/テック関連の最新ニュースを収集して、約60秒の音声ニュースとして再生するWebアプリ。

ボタンを1回押すと、Claude APIで要約・台本化して、VOICEVOXで読み上げ → ブラウザで再生。

## ドキュメント

開発を始める前に以下を順に読んでください:

1. **[CLAUDE.md](./CLAUDE.md)** — プロジェクト全体のコンテキスト
2. **[docs/SPEC.md](./docs/SPEC.md)** — 機能仕様・ユーザーストーリー
3. **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — 技術構成・データフロー
4. **[docs/ROADMAP.md](./docs/ROADMAP.md)** — フェーズ別実装計画
5. **[docs/PROMPTS.md](./docs/PROMPTS.md)** — Claudeプロンプト(品質の要)
6. **[docs/SOURCES.md](./docs/SOURCES.md)** — ニュースソース一覧

## 開発の進め方

```bash
# 1. リポジトリ準備
pnpm install

# 2. VOICEVOX起動
docker compose -f infra/voicevox/docker-compose.yml up -d

# 3. 環境変数設定
cp .env.example .env.local
# ANTHROPIC_API_KEY=sk-ant-...

# 4. Phase 1 から順に実装
# Claude Codeに「@CLAUDE.md と @docs/ROADMAP.md を読んで、Phase 1 から実装して」
```

## 必要なツール

- Node.js 20+
- pnpm 9+
- Docker Desktop(VOICEVOX用)
- ffmpeg(音声結合用)

## ライセンス・クレジット

- VOICEVOX: 各キャラクターの利用規約に従う
- 各ニュースソース: それぞれの利用規約・著作権に従う
- 本アプリは個人開発の実験プロジェクト
