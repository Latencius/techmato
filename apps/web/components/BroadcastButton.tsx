"use client";

type BroadcastButtonProps = {
  busy: boolean;
  label?: string;
  onClick: () => void;
};

export function BroadcastButton({
  busy,
  label = "今日のニュースを生成",
  onClick,
}: BroadcastButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="group inline-flex min-h-14 w-full max-w-sm items-center justify-center gap-3 border border-[#171717] bg-[#171717] px-6 py-4 text-base font-semibold text-[#f8f4ea] shadow-[6px_6px_0_#d7cdb7] transition duration-200 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#d7cdb7] disabled:cursor-not-allowed disabled:border-[#b8ad9a] disabled:bg-[#8c8374] disabled:shadow-none sm:w-auto"
    >
      {busy ? (
        <span className="size-5 animate-spin rounded-full border-2 border-[#f8f4ea]/35 border-t-[#f8f4ea]" />
      ) : (
        <span className="grid size-5 place-items-center rounded-full border border-[#f8f4ea]/80 text-xs transition group-hover:translate-x-0.5">
          ▶
        </span>
      )}
      <span>{busy ? "生成中" : label}</span>
    </button>
  );
}
