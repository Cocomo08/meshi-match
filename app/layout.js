import "./globals.css";
import { Noto_Serif_JP } from "next/font/google";

// 明朝体（Noto Serif JP）でサイト全体に高級感を出す
const notoSerifJp = Noto_Serif_JP({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-jp",
  display: "swap",
});

export const metadata = {
  title: "メシマチ | 今日なに食べる？をスワイプで決める",
  description:
    "二人でスワイプして食べるジャンルをマッチで決めるアプリ。全国どこでも使えるジャンルマッチと、四谷限定の厳選30店の店マッチ。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={notoSerifJp.variable}>
      <body className="flex min-h-screen flex-col bg-neutral-950 font-sans text-stone-200 antialiased">
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
