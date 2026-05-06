import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../../../components/Footer";

export const metadata: Metadata = {
  title: "techmato — クレジット",
};

export default function CreditsPage() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] px-6 py-8 text-[#171717]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col justify-between">
        <div>
          <header className="border-b border-[#ddd3c1] pb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6f6a5f]">
              techmato
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-6xl">クレジット</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#4f4a42]">
              techmato が利用している音声・ソフトウェアへのクレジットです。
            </p>
          </header>

          <div className="mt-8 space-y-6">
            <section className="border border-[#171717] bg-[#fffaf0] p-5 shadow-[8px_8px_0_#ded4c1]">
              <h2 className="text-2xl font-semibold">音声合成</h2>
              <p className="mt-3 text-lg font-semibold">VOICEVOX:ずんだもん</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                <a
                  href="https://voicevox.hiroshiba.jp/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  VOICEVOX 公式サイト
                </a>
                <a
                  href="https://zunko.jp/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  ずんだもん公式サイト
                </a>
              </div>
            </section>

            <section className="border border-[#d8cfbd] bg-[#fffaf0] p-5">
              <h2 className="text-2xl font-semibold">主な OSS / ツール</h2>
              <ul className="mt-4 list-inside list-disc space-y-2 text-sm leading-6 text-[#4f4a42]">
                <li>Next.js / React / TypeScript / Tailwind CSS</li>
                <li>Vitest / Biome</li>
                <li>jsdom / Mozilla Readability / rss-parser</li>
                <li>ffmpeg</li>
              </ul>
            </section>

            <Link
              href="/"
              className="inline-flex min-h-12 border border-[#171717] bg-[#fffaf0] px-5 py-3 text-sm font-semibold text-[#171717] shadow-[5px_5px_0_#ded4c1] transition hover:-translate-y-0.5"
            >
              ホームに戻る
            </Link>
          </div>
        </div>

        <Footer />
      </section>
    </main>
  );
}
