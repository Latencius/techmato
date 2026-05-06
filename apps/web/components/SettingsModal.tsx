"use client";

import { useEffect, useState } from "react";
import { maskApiKey } from "../lib/client/apiKeyStorage";

type Props = {
  open: boolean;
  initialApiKey: string | null;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  onClear: () => void;
};

type ClientValidation = { ok: true } | { ok: false; message: string };

export function SettingsModal({ open, initialApiKey, onClose, onSave, onClear }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [showPlain, setShowPlain] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setInputValue("");
    setShowPlain(false);
    setError(null);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function handleSave() {
    const trimmed = inputValue.trim();
    const validation = validateClientApiKey(trimmed);

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    onSave(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#171717]/35 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-xl border border-[#171717] bg-[#fffaf0] p-6 shadow-[12px_12px_0_#171717]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e7ddca] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#756b5e]">
              Settings
            </p>
            <h2 id="settings-title" className="mt-1 text-2xl font-semibold text-[#171717]">
              Anthropic API キー
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center border border-[#d8cfbd] text-lg font-bold transition hover:border-[#171717]"
            aria-label="設定を閉じる"
          >
            ×
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {initialApiKey ? (
            <div className="border border-[#d8cfbd] bg-[#f6f4ef] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#756b5e]">
                保存済み
              </p>
              <p className="mt-1 font-mono text-sm text-[#171717]">{maskApiKey(initialApiKey)}</p>
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm font-semibold text-[#4f463d]">API キーを入力</span>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                type={showPlain ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-ant-..."
                className="min-h-12 min-w-0 flex-1 border border-[#171717] bg-[#fffdf8] px-3 font-mono text-sm outline-none focus:shadow-[4px_4px_0_#ded4c1]"
              />
              <button
                type="button"
                onClick={() => setShowPlain((value) => !value)}
                className="min-h-12 border border-[#d8cfbd] px-4 text-sm font-semibold transition hover:border-[#171717]"
              >
                {showPlain ? "隠す" : "表示"}
              </button>
            </div>
          </label>

          {error ? (
            <div className="border border-[#c96f62] bg-[#fff0ed] px-4 py-3 text-sm font-semibold text-[#8d2e24]">
              {error}
            </div>
          ) : null}

          <p className="text-sm leading-6 text-[#6f665b]">
            API キーはこのブラウザの localStorage
            に保存され、生成リクエスト時だけサーバへ送信されます。
            サーバは保存せず、ログやレスポンスにも含めません。
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[#e7ddca] pt-5 sm:flex-row sm:justify-between">
          <div>
            {initialApiKey ? (
              <button
                type="button"
                onClick={onClear}
                className="min-h-12 border border-[#c96f62] bg-[#fff0ed] px-5 py-3 text-sm font-semibold text-[#8d2e24] transition hover:bg-[#8d2e24] hover:text-[#fff0ed]"
              >
                キーを削除
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 border border-[#d8cfbd] px-5 py-3 text-sm font-semibold transition hover:border-[#171717]"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-12 border border-[#171717] bg-[#171717] px-5 py-3 text-sm font-semibold text-[#fffaf0] transition hover:-translate-y-0.5"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function validateClientApiKey(value: string): ClientValidation {
  if (!value.trim()) {
    return { ok: false, message: "API キーを入力してください。" };
  }
  if (!value.startsWith("sk-ant-")) {
    return { ok: false, message: "Anthropic API キーは sk-ant- で始まる必要があります。" };
  }
  if (value.length < 100) {
    return { ok: false, message: "API キーが短すぎます。" };
  }

  return { ok: true };
}
