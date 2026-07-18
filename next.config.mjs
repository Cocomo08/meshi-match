// GitHub Pages (https://cocomo08.github.io/meshi-match/) 公開時は
// GITHUB_PAGES=true でビルドし、静的エクスポート＋basePathを有効化する
const isGitHubPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isGitHubPages && {
    output: "export",
    basePath: "/meshi-match",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
