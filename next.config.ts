import type { NextConfig } from "next";

// Serve the app under a subpath by setting NEXT_PUBLIC_BASE_PATH (e.g. "/oceanportal").
// Leave it empty/unset to run at the root ("/"). It is inlined at build time, so it
// must be present when `next build` runs (see Dockerfile / docker-compose build args).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
};

export default nextConfig;
