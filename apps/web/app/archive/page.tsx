import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveList } from "../../components/ArchiveList";
import { Footer } from "../../components/Footer";

export const metadata: Metadata = {
  title: "techmato — 過去の放送",
};

export default function ArchivePage() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] px-6 py-8 text-[#171717]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-between">
        <div>
          <header className="flex flex-col gap-5 border-b border-[#ddd3c1] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6f6a5f]">
                techmato
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-6xl">過去の放送</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#4f4a42]">
                生成済みの techmato broadcast を一覧で確認できます。お気に入りを残し、
                不要になった放送はこの画面から削除できます。
              </p>
            </div>
            <Link
              href="/"
              className="min-h-12 w-fit border border-[#171717] bg-[#fffaf0] px-5 py-3 text-sm font-semibold text-[#171717] shadow-[5px_5px_0_#ded4c1] transition hover:-translate-y-0.5"
            >
              ホームに戻る
            </Link>
          </header>

          <ArchiveList />
        </div>

        <Footer />
      </section>
    </main>
  );
}
