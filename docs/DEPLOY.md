# techmato デプロイ手順

## 概要

この手順書は、techmato を自宅 PC + Cloudflare Tunnel + 自前ドメインで公開するためのメモです。
Cloudflare Tunnel は、自宅 PC の Next.js サーバーをインターネットへ安全に公開するための接続経路です。
ルーターのポート開放は不要です。

想定環境:

- Windows + Docker Desktop + WSL2
- VOICEVOX を Docker Compose で起動
- Next.js web app を `localhost:3000` で起動
- Cloudflare 無料プラン

主なコストは、ドメイン年額と自宅 PC の電気代です。Cloudflare Tunnel、Turnstile、基本的な WAF / Rate Limiting は無料枠で運用できます。

## 1. 事前準備

1. Cloudflare アカウントを作成します。
2. 公開用ドメインを取得します。Cloudflare Registrar が使える場合は管理が楽です。お名前.com など他のレジストラでも運用できます。
3. 自宅 PC が公開中にスリープしないよう、Windows の電源設定を確認します。
4. Docker Desktop と VOICEVOX が安定して起動することを確認します。
5. Cloudflare アカウントの 2 段階認証を有効化します。

## 2. ドメインと DNS の設定

1. Cloudflare ダッシュボードでドメインを追加します。
2. Cloudflare Registrar で取得したドメインなら、そのまま Cloudflare 管理になります。
3. 他社レジストラで取得したドメインの場合は、Cloudflare が表示するネームサーバーへ変更します。
4. DNS レコードはこの段階では追加不要です。Tunnel の Public hostname 設定時に Cloudflare が自動で追加します。

## 3. Cloudflare Tunnel のセットアップ

1. Cloudflare Zero Trust ダッシュボードへ移動します。
2. `Networks` → `Tunnels` → `Add a tunnel` を選択します。
3. Connector type は `Cloudflared` を選択します。
4. Tunnel 名を入力します。例: `techmato`
5. Connector のインストール画面で Windows 用 PowerShell コマンドをコピーして実行します。
   - 表示されるコマンドにはトークンが含まれます。第三者と共有しないでください。
6. Public hostname を設定します。
   - Subdomain: `techmato` または空欄
   - Domain: 取得したドメイン
   - Service Type: `HTTP`
   - Service URL: `localhost:3000`
7. 保存後、`https://techmato.example.com` のような公開 URL にアクセスし、自宅 PC の Next.js が表示されることを確認します。

## 4. 環境変数の設定

`apps/web/.env.local` を作成します。このファイルは Git にコミットしないでください。

```env
PUBLIC_BASE_URL=https://techmato.example.com
TURNSTILE_SECRET_KEY=<後の手順で取得>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<後の手順で取得>
```

環境変数を変更したら、Next.js dev server または production server を再起動してください。

## 5. Turnstile の設定

Turnstile は、生成ボタン押下時に人間かどうかを確認する Cloudflare の CAPTCHA 代替機能です。

1. Cloudflare ダッシュボード → `Turnstile` → `Add a site` を選択します。
2. Site name に `techmato` を入力します。
3. Domain に Tunnel 経由で公開するドメインを入力します。
4. Widget mode は `Managed` を推奨します。UX を優先する場合は `Non-Interactive` も検討できます。
5. 作成後、Site Key と Secret Key を取得します。
6. `apps/web/.env.local` に設定します。

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<Site Key>
TURNSTILE_SECRET_KEY=<Secret Key>
```

7. Next.js を再起動します。
8. トップページの生成 UI に Turnstile ウィジェットが表示されることを確認します。
9. 生成ボタン押下前に Turnstile の確認を通過する必要があることを確認します。

`TURNSTILE_SECRET_KEY` が未設定の場合、サーバー側の検証は開発環境としてスキップされます。本番公開時は必ず設定してください。

## 6. Rate Limiting Rules の設定

生成処理は VOICEVOX とローカル CPU を使うため、連打対策が必要です。

1. Cloudflare ダッシュボードで対象ドメインを選択します。
2. `Security` → `WAF` → `Rate Limiting Rules` を開きます。
3. `Create rule` を選択します。
4. Rule name: `techmato-generate-rate-limit`
5. 条件を設定します。
   - Field: `URI Path`
   - Operator: `equals`
   - Value: `/api/broadcast`
   - Method: `POST`
6. Rate を設定します。
   - 例: `3 requests per 1 minute`
7. 超過時の動作を設定します。
   - Action: `Block`
   - Custom response: `HTTP 429`
8. `Save and Deploy` で適用します。
9. 同一 IP から短時間に 4 回以上 POST して、429 が返ることを確認します。

## 7. WAF の追加設定 (任意)

以下は無料プランでも利用しやすい追加設定です。

- Security Level: `Medium`
- Bot Fight Mode: `ON`
- Browser Integrity Check: `ON`

強くしすぎると正規ユーザーも弾く可能性があります。β 公開中はログを見ながら調整してください。

## 8. 動作確認チェック

公開前に以下を確認します。

- `https://techmato.example.com` でトップページが表示される
- 設定モーダルから Anthropic API キーを保存できる
- Turnstile が表示され、確認後に生成を開始できる
- 生成が fetch → select → extract → script → tts → merge → write まで完走する
- archive 個別ページが表示される
- X 共有ボタンを押すと Twitter Web Intent が開く
- intent URL の共有先が公開ドメインになっている
- View Page Source で `og:url` が公開ドメインになっている
- Rate Limiting Rules が 4 連打程度で 429 を返す

## 9. 障害対応とメンテナンス

### 自宅 PC が停止した場合

Tunnel が切れ、Cloudflare 側では 502 になることがあります。Windows のスリープ設定と自動再起動設定を確認してください。

### VOICEVOX が落ちた場合

```powershell
docker compose -f infra/voicevox/docker-compose.yml ps
docker compose -f infra/voicevox/docker-compose.yml restart
```

### Anthropic API が失敗する場合

利用者の API キーの権限、残高、レート制限、Anthropic のステータスページを確認してください。

### Cloudflare 側の障害

[Cloudflare Status](https://www.cloudflarestatus.com/) を確認してください。

## 10. セキュリティ運用

- `.env.local` を絶対に Git にコミットしないでください。
- `TURNSTILE_SECRET_KEY` は外部に漏らさないでください。
- Cloudflare アカウントの 2 段階認証を必ず有効化してください。
- 自宅 PC のファイアウォールで外部から 3000 番ポートへ直接アクセスできないようにしてください。
- 公開は Cloudflare Tunnel 経由のみにします。
- Cloudflare の監査ログと WAF イベントを定期的に確認してください。

## 11. 公開停止と再開

一時停止する場合は、Cloudflare ダッシュボードで Tunnel を停止します。

完全に停止する場合は、Tunnel を削除し、関連する DNS レコードも削除します。

再開する場合は、Tunnel connector と Next.js server を起動し直します。
