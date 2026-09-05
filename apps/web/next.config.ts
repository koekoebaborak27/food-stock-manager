import type { NextConfig } from "next";

// バックエンド（NestJS）の置き場所。ローカルでは3001番、本番はデプロイ後のURLを設定する。
const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

// Next.js の動かし方の設定。
const nextConfig: NextConfig = {
  // next dev が起動のたびに AGENTS.md へ独自の注意書きを追記する機能を無効にする。
  // このリポジトリの AGENTS.md は Claude/Codex/Copilot共通の正本であり、
  // Next.js側から書き換えさせない。
  agentRules: false,
  // 動かすのに本当に必要なファイルだけを .next/standalone にまとめて出す。
  // これがあると、コンテナに node_modules を丸ごと入れずに済み、
  // Cloud Run へ載せるイメージが小さくなる。
  output: "standalone",
  // 画面はバックエンドのAPIだけを呼ぶ（docs/specs/02_basic-design/00_共通/02_API共通.md）。
  // ブラウザからは同一オリジンに見えるようにし、セッションCookie（SameSite=Lax）が
  // そのまま使えるようにする。
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiBaseUrl}/api/:path*` }];
  },
};

export default nextConfig;
