import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 图片优化配置
  images: {
    // Cloudflare 不支持默认的图片优化，使用 unoptimized 或配置 loader
    unoptimized: true,
  },
};

export default nextConfig;
