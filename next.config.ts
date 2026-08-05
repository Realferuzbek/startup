import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Side-effect import: validates required environment variables the moment Next
// loads its config — before dev/build compiles anything. This is what makes a
// missing variable fail fast, immediately and legibly, at server/build startup.
// A relative path is used (not the "@/*" alias) because the config loader does
// not resolve tsconfig path aliases.
import "./src/lib/env";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// The env import above guarantees this is set.
const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;

const nextConfig: NextConfig = {
  images: {
    // Property photos are served from the public Supabase Storage bucket.
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Uploads: photos cap at 2 MB, verification documents at 5 MB. This raises
      // the framework's default 1 MB body limit above the largest (5 MB) with
      // headroom for multipart overhead. The server actions still enforce the
      // real per-file limits.
      bodySizeLimit: "6mb",
    },
  },
};

export default withNextIntl(nextConfig);
