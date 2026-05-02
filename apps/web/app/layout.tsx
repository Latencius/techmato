import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "techmato",
  description: "AI and tech news broadcast generator",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
