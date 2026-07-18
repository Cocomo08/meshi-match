# メシマチ

「今日なに食べる？」を二人でスワイプして決めるスマホ向けアプリ。

- **1階：ジャンルマッチ（全国どこでも）** — 二人が交代でジャンルカード（ラーメン・寿司・韓国料理など）をスワイプし、両者「アリ！」だったジャンルがマッチ。店データ不要で今日から使える。
- **2階：店マッチ（四谷限定）** — ジャンルが決まったあと、四谷にいる人だけが厳選30店の店スワイプに進める。

## 技術構成

Next.js (App Router) / React / Tailwind CSS。GitHub Pages に静的エクスポートで公開。

公開URL: https://cocomo08.github.io/meshi-match/

## 開発

```bash
npm install
npm run dev
```

## ビルド（GitHub Pages 用）

```bash
GITHUB_PAGES=true npm run build   # out/ に静的サイトを書き出し
```

※ 収録している店舗情報はすべてデモ用のサンプルデータです。
