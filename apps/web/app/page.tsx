import Link from "next/link";
import { BroadcastGenerator } from "../components/BroadcastGenerator";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] px-6 py-8 text-[#171717]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-between">
        <header className="flex items-center justify-between gap-4 border-b border-[#ddd3c1] pb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6f6a5f]">
            techmato
          </p>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-[#6f6a5f] sm:block">
              short or deep-dive tech broadcast
            </p>
            <Link
              href="/archive"
              className="border border-[#171717] bg-[#fffaf0] px-3 py-2 text-xs font-semibold text-[#171717] shadow-[4px_4px_0_#ded4c1] transition hover:-translate-y-0.5"
            >
              過去の放送 →
            </Link>
          </div>
        </header>

        <div className="grid gap-10 py-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:items-center">
          <div>
            <p className="mb-5 inline-flex border border-[#d8cfbd] bg-[#fffaf0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#756b5e]">
              Phase 2 / MVP
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight md:text-7xl">
              今日のテックニュースを、声で受け取る。
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4f4a42]">
              ボタンを押すとニュース取得から台本生成、音声合成までをサーバーで実行します。
              完成した放送はそのまま再生でき、読み上げ中のニュースと出典を確認できます。
            </p>
          </div>

          <div className="border border-[#d8cfbd] bg-[#fffaf0]/70 p-5 shadow-[10px_10px_0_#ded4c1] sm:p-7">
            <p className="text-sm font-semibold text-[#6f6a5f]">Generate</p>
            <h2 className="mt-2 text-3xl font-semibold">放送を生成</h2>
            <p className="mt-3 text-sm leading-6 text-[#5a5147]">
              進捗はリアルタイムで更新されます。音声合成中は cue の完了数も表示します。
            </p>
            <BroadcastGenerator />
          </div>
        </div>

        <footer className="border-t border-[#ddd3c1] pt-5 text-sm leading-6 text-[#6f6a5f]">
          VOICEVOX Engine をローカルで使用します。各ニュースの出典 URL は放送カードから開けます。
        </footer>
      </section>
    </main>
  );
}
