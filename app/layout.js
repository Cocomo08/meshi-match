import "./globals.css";
import { Inter, Noto_Sans_JP } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata = {
  title: "メシマチ | 今日なに食べる？をスワイプで決める",
  description:
    "二人でスワイプして食べるジャンルをマッチで決めるアプリ。全国どこでも使えるジャンルマッチと、四谷限定の厳選30店の店マッチ。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJp.variable}`}>
      <body className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 antialiased">
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
