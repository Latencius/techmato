import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../../components/Footer";

export const metadata: Metadata = {
  title: "techmato — 利用規約",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] px-6 py-8 text-[#171717]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-between">
        <div>
          <header className="border-b border-[#ddd3c1] pb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6f6a5f]">
              techmato
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">利用規約</h1>
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
              本利用規約 (以下「本規約」) は、techmato (以下「本サービス」)
              の利用条件を定めるものです。本サービスを利用される方 (以下「利用者」)
              は、本規約に同意の上で利用してください。
            </p>

            <section>
              <h2 className="mb-3 text-xl font-semibold">1. サービスの概要</h2>
              <p>
                本サービスは、利用者が指定した Anthropic API キーを用いて AI
                によるニュース台本生成と音声合成を行い、AI
                ニュース放送を提供するものです。本サービスは個人によって運営されており、無償で提供されます。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">2. 利用者の責任</h2>
              <ul className="list-inside list-disc space-y-2">
                <li>本サービスの利用には、利用者が自身で取得した Anthropic API キーが必要です。</li>
                <li>
                  利用者は、自身の API キーの管理および利用に関する一切の責任を負うものとします。
                </li>
                <li>
                  利用者は、Anthropic, PBC. の利用規約および VOICEVOX
                  の利用規約を遵守するものとします。
                </li>
                <li>
                  本サービスを利用して生成された音声・テキスト等のコンテンツは、利用者の責任において利用してください。
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">3. 禁止事項</h2>
              <p>利用者は、以下の行為を行ってはなりません。</p>
              <ul className="mt-3 list-inside list-disc space-y-2">
                <li>法令または公序良俗に違反する行為</li>
                <li>本サービスのサーバー・ネットワークに過度な負荷をかける行為</li>
                <li>本サービスの運営を妨害する行為</li>
                <li>第三者の権利を侵害する行為</li>
                <li>
                  本サービスを通じて生成されたコンテンツを、第三者の権利を侵害する形で利用する行為
                </li>
                <li>その他、運営者が不適切と判断する行為</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">4. 生成コンテンツについて</h2>
              <ul className="list-inside list-disc space-y-2">
                <li>本サービスで生成された放送は archive ページにて全て公開されます。</li>
                <li>
                  生成されたコンテンツに事実誤認、不正確な情報、AI による幻覚 (hallucination)
                  が含まれる可能性があります。
                </li>
                <li>
                  生成内容を業務・報道・公的目的で利用する場合は、利用者の責任で内容の正確性を確認してください。
                </li>
                <li>引用元のニュース記事の著作権は、各発行元に帰属します。</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">5. クレジット表記</h2>
              <p>
                本サービスは VOICEVOX のずんだもん音声を使用しています。詳細は{" "}
                <Link href="/legal/credits" className="font-semibold underline underline-offset-4">
                  クレジット
                </Link>{" "}
                をご確認ください。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">6. 免責事項</h2>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  運営者は、本サービスの提供に関して、明示・黙示を問わず一切の保証を行いません。
                </li>
                <li>
                  本サービスの利用により利用者または第三者に生じた損害について、運営者は一切の責任を負いません。
                </li>
                <li>
                  本サービスの一部または全部について、予告なく変更・停止・終了する場合があります。
                </li>
                <li>
                  Anthropic API・VOICEVOX
                  等の外部サービスの障害・仕様変更により、本サービスが正常に動作しない場合があります。
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">7. API キーの取り扱い</h2>
              <ul className="list-inside list-disc space-y-2">
                <li>利用者の Anthropic API キーは、ブラウザの localStorage に保存されます。</li>
                <li>
                  生成リクエスト時のみサーバーに送信され、リクエスト処理中のメモリ内でのみ保持されます。
                </li>
                <li>サーバーログ、データベース、その他の永続的な保存先には記録されません。</li>
                <li>
                  詳細は{" "}
                  <Link
                    href="/legal/privacy"
                    className="font-semibold underline underline-offset-4"
                  >
                    プライバシーポリシー
                  </Link>{" "}
                  をご確認ください。
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">8. 本規約の変更</h2>
              <p>
                運営者は、必要と判断した場合、利用者への事前通知なく本規約を変更することがあります。
                変更後の規約は、本ページに掲載した時点から効力を生じるものとします。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">9. 準拠法・管轄</h2>
              <p>
                本規約の解釈および適用は日本法に準拠するものとします。
                本サービスに関して訴訟の必要が生じた場合、運営者の所在地を管轄する裁判所を
                専属的合意管轄裁判所とします。
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">10. お問い合わせ</h2>
              <p>本規約に関するお問い合わせは、以下からご連絡ください。</p>
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
