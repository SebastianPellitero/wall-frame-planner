import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pure static SPA: `next build` emits `out/`, deployable to any static host.
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
