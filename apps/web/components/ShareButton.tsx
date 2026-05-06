"use client";

type Props = {
  title: string;
  url: string;
};

export function ShareButton({ title, url }: Props) {
  const tweetText = `${title} #techmato`;
  const intentUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(tweetText)}`;

  return (
    <a
      href={intentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-12 items-center gap-2 border-2 border-[#171717] bg-[#fffaf0] px-4 py-2 text-sm font-semibold text-[#171717] shadow-[5px_5px_0_#ded4c1] transition hover:-translate-y-0.5"
      aria-label={`「${title}」をXで共有`}
    >
      <span aria-hidden="true">𝕏</span>
      Xで共有
    </a>
  );
}
