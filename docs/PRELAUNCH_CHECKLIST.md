# β 公開前チェックリスト

> **使い方**: 上から順番にチェックを入れて進めてください。
> 全て完了したら β 公開可能な状態です。
> 不明点は [docs/DEPLOY.md](./DEPLOY.md) を参照してください。

## 0. 前提確認

このチェックリストの完了で達成すること:

- 自宅 PC + Cloudflare Tunnel で公開できる状態
- BYOK 方式でユーザーが API キー持参して生成できる
- 字幕・X 共有・履歴管理が機能する
- 法的ドキュメント (利用規約・プライバシーポリシー) が整備済み
- Rate Limit と Turnstile で連打対策がされている

このチェックリストで達成しないこと (β 後追加):

- Stripe 寄付機能
- 特商法表記
- 多言語対応 (Phase 5)

## 1. 技術的準備

### 1.1 リポジトリの状態

- [ ] `git status` で working tree clean
- [ ] `pnpm test` 全 pass
- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean
- [ ] シークレット混入なし (PowerShell):
  - `git log --all -p | Select-String "sk-ant-"`
  - `git log --all -p | Select-String "TURNSTILE_SECRET"`
  - 出力が無ければ OK
- [ ] シークレット混入なし (bash/zsh の場合):
  - `git log --all -p | grep "sk-ant-"`
  - `git log --all -p | grep "TURNSTILE_SECRET"`
- [ ] `output/` ディレクトリが `.gitignore` に含まれている

### 1.2 環境準備

- [ ] Windows PC が常時稼働可能 (スリープ無効化済み)
- [ ] Docker Desktop + WSL2 が起動済み
- [ ] VOICEVOX docker compose が安定起動 (`docker compose ps` で確認)
- [ ] Node.js / pnpm のバージョンが README 記載と一致
- [ ] ffmpeg がインストール済み (`ffmpeg -version` で確認)

### 1.3 動作確認

- [ ] CLI: `pnpm cli` で短尺の生成完走
- [ ] CLI: `pnpm cli --mode long` で長尺の生成完走
- [ ] Web: トップで設定モーダルから API キー保存できる
- [ ] Web: 短尺・長尺どちらも生成完走
- [ ] Web: archive 一覧で履歴表示 + フィルタ + お気に入り toggle + 削除
- [ ] Web: 個別ページで再生 + 字幕表示 + X 共有ボタン
- [ ] CLI と Web の両方で `[NEWS_BREAK]` が読み上げられない
- [ ] CLI と Web の両方で `[NEWS_BREAK]` が字幕に出ない

## 2. Cloudflare 設定

詳細手順は [docs/DEPLOY.md](./DEPLOY.md) を参照。

### 2.1 アカウントとドメイン

- [ ] Cloudflare アカウント作成済み
- [ ] アカウントに 2 段階認証設定済み
- [ ] 公開用ドメイン取得済み
- [ ] ドメインの DNS が Cloudflare に向いている

### 2.2 Tunnel

- [ ] Cloudflare Zero Trust の Tunnel を作成済み
- [ ] cloudflared が自宅 PC で起動中 (Windows Service or 常駐)
- [ ] Public hostname が設定済み (例: techmato.example.com → localhost:3000)
- [ ] `https://your-domain.com` で自宅 PC の Next.js が表示される

### 2.3 Turnstile

- [ ] Cloudflare Turnstile で site 作成済み
- [ ] Site Key と Secret Key を取得済み
- [ ] `apps/web/.env.local` に以下を設定:
  - [ ] `PUBLIC_BASE_URL=https://your-domain.com`
  - [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY=...`
  - [ ] `TURNSTILE_SECRET_KEY=...`
- [ ] dev server 再起動でトップに Turnstile ウィジェット表示
- [ ] チェック通過後に生成完走することを確認

### 2.4 Rate Limiting

- [ ] Cloudflare WAF で Rate Limiting Rules 作成済み
- [ ] `/api/broadcast` への POST が 1分3リクエストで制限される
- [ ] 4 連打で 429 が返ることを確認

### 2.5 セキュリティ追加設定

- [ ] Bot Fight Mode: ON
- [ ] Browser Integrity Check: ON
- [ ] Security Level: Medium
- [ ] Windows ファイアウォールで localhost 以外からの 3000 番遮断 (Tunnel 経由のみアクセス可能)

## 3. 法的ドキュメント

### 3.1 ページ表示確認

- [ ] `/legal/terms` が表示される
- [ ] `/legal/privacy` が表示される
- [ ] `/legal/credits` が表示される
- [ ] フッターから3ページ全てに 200 で遷移できる

### 3.2 内容確認 (テンプレートのまま公開しない)

- [ ] `/legal/terms` の TODO マーカー解消済み
  - [ ] 最終更新日を実際の日付に書き換え
  - [ ] 必要ならお問い合わせメール追記 (空欄なら GitHub Issues のみで運用)
- [ ] `/legal/privacy` の TODO マーカー解消済み
  - [ ] 最終更新日を実際の日付に書き換え
  - [ ] サーバーアクセスログの記述を実態と整合
    (techmato 自体はログ取得しないので "Cloudflare 経由のアクセスログのみ" 等に修正)
  - [ ] 必要ならお問い合わせメール追記
- [ ] 各ページの内容を音読確認、サービスの実態と一致しているか確認
- [ ] VOICEVOX クレジット表記が credits / footer / archive 個別ページに表示されている

## 4. クレジットと表記

### 4.1 VOICEVOX

- [ ] フッターに "VOICEVOX:ずんだもん" のリンク表示
- [ ] archive 個別ページにも VOICEVOX クレジット表示
- [ ] `/legal/credits` で VOICEVOX 公式・ずんだもん公式リンク張られている

### 4.2 サービス情報

- [ ] トップページに techmato のサービス概要が分かる説明
- [ ] X 共有時の OGP メタタグが本番ドメインで表示
  (View Page Source で `og:url` が `https://your-domain.com/...` になっている)

## 5. 運用準備

### 5.1 監視

- [ ] Cloudflare の Tunnel 状態を定期的に確認する習慣
- [ ] VOICEVOX docker のヘルスチェック手順を把握
- [ ] Anthropic API のステータスページをブックマーク (`status.anthropic.com`)
- [ ] Cloudflare のステータスページをブックマーク (`status.cloudflare.com`)

### 5.2 障害対応

- [ ] PC が停止 / 再起動した場合の Tunnel 再起動手順を把握
- [ ] VOICEVOX が落ちた場合の `docker compose restart` 手順を把握
- [ ] 公開を一時停止する手順を把握 (Cloudflare で Tunnel 停止)

### 5.3 容量管理

- [ ] `output/` ディレクトリのサイズを確認 (大きすぎないか)
- [ ] historyStore の cleanup ロジック (30件保持) が動作確認済み
- [ ] 公開後にユーザー多数が生成した場合の容量増加について把握

### 5.4 BYOK ユーザー向けの案内

- [ ] トップページから設定モーダルが開けることを確認
- [ ] API キーの取得方法をどこかに記載
  (Anthropic Console URL: https://console.anthropic.com/settings/keys)
- [ ] localStorage 保存の説明が プライバシーポリシー / 利用規約 にある

## 6. 公開直前

### 6.1 最終動作確認 (本番ドメインで)

- [ ] `https://your-domain.com` にアクセス可能
- [ ] HTTPS が有効 (Cloudflare 経由で自動)
- [ ] 設定モーダルから API キー入力 → 生成 → 完走
- [ ] archive 一覧 → 個別ページ → 再生 → 字幕表示
- [ ] X 共有ボタンクリックで Twitter intent 開く + URL が本番ドメイン
- [ ] `/legal/terms` / `/legal/privacy` / `/legal/credits` 全て表示

### 6.2 アナウンス準備 (任意)

- [ ] X (Twitter) で公開を告知するツイート文の下書き
  (例: "techmato β を公開しました。AI が今日のテックニュースを音声で読み上げます。 https://...")
- [ ] GitHub README.md にライブデモ URL を追加
- [ ] 個人ブログ等で紹介記事を書く (任意)

### 6.3 心理的準備

- [ ] β 期間中はバグや問題が見つかる前提
- [ ] フィードバックは GitHub Issues 等で受ける覚悟
- [ ] 一時停止できることを忘れない (問題発覚時に Tunnel を止める)
- [ ] β 期間中の運用コスト (電気代 + ドメイン年額) を把握

## 7. β 公開後の継続作業 (参考)

β 公開後、以下を様子見しながら追加実装。

- 寄付機能 (Step F4): Stripe Checkout で寄付受付
- 特商法表記 (Step F5-d): 寄付実装と同時に必須
- 多言語対応 (Phase 5): 英語版の生成
- 動的 OGP 画像生成: X 共有時の見栄え向上
- 字幕の polish: 表示位置・フォントサイズ調整

---

> **重要**: このチェックリストは β 公開のための実務リストです。
> 法的文書の専門家チェック、税務相談、本格的な運用監視は別途検討してください。
