import "./globals.css";
import { Zen_Maru_Gothic, Klee_One } from "next/font/google";

// 丸ゴシック（Zen Maru Gothic）で明るく親しみやすいトーンに
const zenMaru = Zen_Maru_Gothic({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-zen-maru",
  display: "swap",
});

// 手書き風（のれんロゴ用）
const kleeOne = Klee_One({
  weight: ["600"],
  subsets: ["latin"],
  variable: "--font-klee",
  display: "swap",
});

export const metadata = {
  title: "メシマチ | 今日なに食べる？をスワイプで決める",
  description:
    "二人でスワイプして食べるジャンルをマッチで決めるアプリ。全国どこでも使えるジャンルマッチと、四谷限定の厳選30店の店マッチ。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={`${zenMaru.variable} ${kleeOne.variable}`}>
      <body className="app-body flex min-h-screen flex-col font-sans text-white antialiased">
        <main className="app-main flex flex-1 flex-col">
          <div className="app-frame flex flex-1 flex-col">{children}</div>
        </main>
      </body>
    </html>
  );
}
