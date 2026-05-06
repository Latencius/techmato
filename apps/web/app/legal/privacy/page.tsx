import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../../components/Footer";

export const metadata: Metadata = {
  title: "techmato — プライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] px-6 py-8 text-[#171717]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-between">
        <div>
          <header className="border-b border-[#ddd3c1] pb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6f6a5f]">
              techmato
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">
              プライバシーポリシー
            </h1>
            <nav className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex min-h-12 border border-[#171717] bg-[#fffaf0] px-5 py-3 text-sm font-semibold text-[#171717] shadow-[5px_5px_0_#ded4c1] transition hover:-translate-y-0.5"
              >
                ホームに戻る
              </Link>
            </nav>
          </header>

          <article className="mt-8 space-y-7 text-base leading-7 text-[#171717]">
            <p>
              techmato (以下「本サービス」) は、本サービスを利用される方 (以下「利用者」)
              のプライバシーを尊重し、個人情報の取り扱いについて 以下のとおり定めます。
            </p>

            <section>
              <h2 className="mb-3 text-xl font-semibold">1. 取得する情報</h2>
              <p>本サービスは、以下の情報を取得・処理します。</p>

              <h3 className="mb-2 mt-5 text-base font-semibold">Anthropic API キー</h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  取得目的: AI 台本生成のため、利用者が指定した Anthropic API へのリクエスト送信
                </li>
                <li>
                  保存場所: 利用者のブラウザの localStorage (本サービスのサーバーには保存しません)
                </li>
                <li>
                  サーバー側の取り扱い:
                  生成リクエスト処理中のメモリ内でのみ保持し、リクエスト完了後は破棄します。
                  ログ・データベース等への記録は行いません。
                </li>
              </ul>

              <h3 className="mb-2 mt-5 text-base font-semibold">生成された放送データ</h3>
              <ul className="list-inside list-disc space-y-2">
                <li>取得目的: archive 機能の提供</li>
                <li>保存場所: 本サービスのサーバー (自宅 PC) のローカルストレージ</li>
                <li>
                  公開範囲: 生成された放送は全て公開されます。プライベートな放送は作成できません。
                </li>
              </ul>

              <h3 className="mb-2 mt-5 text-base font-semibold">サーバーアクセスログ</h3>
              <ul className="list-inside list-disc space-y-2">
                <li>取得目的: 運営上の不正利用防止、障害対応</li>
                <li>内容: アクセス時刻、IP アドレス、リクエスト内容 (API キーは含みません)</li>
                <li>保存期間: 30 日程度</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">2. 取得しない情報</h2>
              <p>本サービスは以下の情報を取得しません。</p>
              <ul className="mt-3 list-inside list-disc space-y-2">
                <li>利用者の氏名、メールアドレス、電話番号等の個人識別情報</li>
                <li>利用者のアカウント (本サービスはアカウント登録を必要としません)</li>
                <li>第三者の Cookie 情報</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">3. localStorage の利用</h2>
              <p>本サービスは、以下の目的で利用者のブラウザの localStorage を使用します。</p>
              <ul className="mt-3 list-inside list-disc space-y-2">
                <li>Anthropic API キーの保存 (techmato:anthropicApiKey)</li>
                <li>最後に生成した放送 ID の記憶 (techmato:lastBroadcastId)</li>
              </ul>
              <p className="mt-3">
                これらの情報は利用者のブラウザ内に平文で保存されます。 共用 PC
                を使用する場合は、本サービスの利用後に設定モーダルから API キーを
                削除することを推奨します。ブラウザの開発者ツール (DevTools)
                からこれらの情報は閲覧可能です。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">4. Cookie の利用</h2>
              <p>本サービスは Cookie を使用しません。</p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">5. 第三者サービスの利用</h2>
              <p>本サービスは以下の第三者サービスを利用します。</p>

              <h3 className="mb-2 mt-5 text-base font-semibold">Anthropic (Claude API)</h3>
              <ul className="list-inside list-disc space-y-2">
                <li>利用者の API キーで利用者から直接呼び出されます (BYOK 方式)</li>
                <li>利用者が入力した記事内容・台本生成プロンプトが Anthropic に送信されます</li>
                <li>
                  詳細:{" "}
                  <a
                    href="https://www.anthropic.com/legal/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline underline-offset-4"
                  >
                    Anthropic Privacy Policy
                  </a>
                </li>
              </ul>

              <h3 className="mb-2 mt-5 text-base font-semibold">Cloudflare</h3>
              <ul className="list-inside list-disc space-y-2">
                <li>DDoS 防御・WAF・Tunnel として利用します</li>
                <li>利用者の IP アドレスが Cloudflare に渡されます</li>
                <li>
                  詳細:{" "}
                  <a
                    href="https://www.cloudflare.com/privacypolicy/"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline underline-offset-4"
                  >
                    Cloudflare Privacy Policy
                  </a>
                </li>
              </ul>

              <h3 className="mb-2 mt-5 text-base font-semibold">VOICEVOX</h3>
              <ul className="list-inside list-disc space-y-2">
                <li>音声合成エンジンとしてサーバー内で利用 (ローカル実行、外部送信なし)</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">6. 第三者への情報提供</h2>
              <p>
                本サービスは、法令に基づく場合を除き、利用者の情報を第三者に提供しません。
                ただし、利用者が生成した放送は archive
                ページにて全て公開されることに留意してください。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">7. セキュリティ</h2>
              <p>
                本サービスは、運営者が合理的に可能な範囲で、利用者の情報を保護するための措置を講じます。
                ただし、本サービスは個人運営のため、エンタープライズ級のセキュリティを保証することはできません。
                重要な情報の取り扱いには十分ご注意ください。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">8. 本ポリシーの変更</h2>
              <p>
                運営者は、必要と判断した場合、利用者への事前通知なく本ポリシーを変更することがあります。
                変更後のポリシーは、本ページに掲載した時点から効力を生じるものとします。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">9. お問い合わせ</h2>
              <p>本ポリシーに関するお問い合わせは、以下からご連絡ください。</p>
              <ul className="mt-3 list-inside list-disc space-y-2">
                <li>
                  GitHub Issues:{" "}
                  <a
                    href="https://github.com/Latencius/techmato/issues"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline underline-offset-4"
                  >
                    https://github.com/Latencius/techmato/issues
                  </a>
                </li>
              </ul>
              {/* TODO: 必要に応じてメールアドレスを追加 */}
            </section>

            <div className="border-t border-[#ddd3c1] pt-5 text-sm text-[#6f6a5f]">
              最終更新日: {/* TODO: 公開時点の日付 */}未設定
            </div>
          </article>
        </div>

        <div className="mt-12">
          <Footer />
        </div>
      </section>
    </main>
  );
}
