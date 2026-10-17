import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a parent pnpm-lock.yaml otherwise
  // confuses Next's root inference).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
