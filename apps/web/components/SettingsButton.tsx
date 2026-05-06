"use client";

type Props = {
  onClick: () => void;
};

export function SettingsButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 border border-[#171717] bg-[#fffaf0] px-4 py-2 text-sm font-semibold text-[#171717] shadow-[4px_4px_0_#ded4c1] transition hover:-translate-y-0.5"
      aria-label="API キー設定を開く"
    >
      ⚙ 設定
    </button>
  );
}
