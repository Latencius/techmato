export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] px-6 py-10 text-[#171717]">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#6f6a5f]">
          techmato
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-tight md:text-7xl">
          Phase 2 構築中
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4f4a42]">
          ブラウザから今日のAI・テックニュースを生成して再生する体験を準備しています。
        </p>
      </section>
    </main>
  );
}
