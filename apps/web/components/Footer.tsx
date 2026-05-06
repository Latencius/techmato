import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#ddd3c1] pt-5 text-sm leading-6 text-[#6f6a5f]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          本サービスは{" "}
          <a
            href="https://voicevox.hiroshiba.jp/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#171717] underline underline-offset-4"
          >
            VOICEVOX:ずんだもん
          </a>{" "}
          の音声を使用しています。
        </p>
        <nav className="flex flex-wrap gap-3">
          <Link href="/legal/credits" className="underline underline-offset-4">
            クレジット
          </Link>
          <Link href="/legal/terms" className="underline underline-offset-4">
            利用規約
          </Link>
          <Link href="/legal/privacy" className="underline underline-offset-4">
            プライバシー
          </Link>
        </nav>
      </div>
    </footer>
  );
}
