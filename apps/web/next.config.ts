import type { NextConfig } from "next";

// Next.js の動かし方の設定。
const nextConfig: NextConfig = {
  // 動かすのに本当に必要なファイルだけを .next/standalone にまとめて出す。
  // これがあると、コンテナに node_modules を丸ごと入れずに済み、
  // Cloud Run へ載せるイメージが小さくなる。
  output: "standalone",
};

export default nextConfig;
