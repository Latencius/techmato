"use client";

import { useEffect, useRef } from "react";

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export function TurnstileWidget({ siteKey, onToken }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let intervalId: number | undefined;
    let cancelled = false;

    if (!document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    function renderWidget(): boolean {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) {
        return false;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onToken(token),
        "error-callback": () => onToken(""),
        "expired-callback": () => onToken(""),
      });

      return true;
    }

    if (!renderWidget()) {
      intervalId = window.setInterval(() => {
        if (renderWidget() && intervalId) {
          window.clearInterval(intervalId);
          intervalId = undefined;
        }
      }, 100);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken]);

  return <div ref={containerRef} />;
}
