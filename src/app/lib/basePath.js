// Central base-path helper.
//
// NEXT_PUBLIC_BASE_PATH is inlined at build time and MUST match `basePath` in
// next.config.ts (e.g. "" for root, "/oceanportal" for the subpath deploy).
//
// Use `withBasePath()` for the things Next.js does NOT auto-prefix:
//   - raw <img src="/...">
//   - fetch('/api/...') to local API routes
//   - MapLibre asset/tile URLs (map.loadImage, tile proxy)
// next/image, next/link and /_next/* assets are prefixed automatically.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const withBasePath = (path = '') => {
  if (!path) return path;
  // Leave absolute URLs / data / blob URIs untouched.
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
};

export default withBasePath;
