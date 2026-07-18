// GitHub Pages (https://cocomo08.github.io/meshi-match/) 公開時は
// GITHUB_PAGES=true でビルドし、静的エクスポート＋basePathを有効化する
const isGitHubPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // public/ 配下の画像をbasePath込みで参照できるようにクライアントへ公開
  env: {
    NEXT_PUBLIC_BASE_PATH: isGitHubPages ? "/meshi-match" : "",
  },
  ...(isGitHubPages && {
    output: "export",
    basePath: "/meshi-match",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
