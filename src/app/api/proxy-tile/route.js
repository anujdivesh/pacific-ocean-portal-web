// Same-origin proxy for map raster tiles. Used for hosts that either lack CORS
// (SPC-hosted OSM + Satellite basemaps) or are intermittently flaky under
// MapLibre's burst of concurrent tile requests (the ocean-plotter overlay proxy).
//
// MapLibre fetches tiles via XHR and does NOT retry failed tiles, so a transient
// upstream blip leaves a permanent gap until the user pans. Here we:
//  - retry the upstream a couple of times on network error / 5xx (absorbs blips)
//  - buffer the bytes (avoids re-streaming issues that yield empty/garbage tiles)
//  - pass through the real image content-type + cache for a day
//  - return an EMPTY body on final failure so MapLibre logs a clean tile error
//    instead of trying to decode an HTML/text error page (InvalidStateError)

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 150;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  if (!target) return new Response(null, { status: 400 });

  let lastStatus = 502;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const upstream = await fetch(target, { redirect: 'follow' });
      if (!upstream.ok) {
        lastStatus = upstream.status || 502;
        // Retry only transient server-side failures; 4xx won't get better.
        if (upstream.status >= 500 && attempt < MAX_ATTEMPTS) { await sleep(RETRY_DELAY_MS * attempt); continue; }
        return new Response(null, { status: lastStatus });
      }
      const buf = await upstream.arrayBuffer();
      if (!buf || buf.byteLength === 0) {
        lastStatus = 502;
        if (attempt < MAX_ATTEMPTS) { await sleep(RETRY_DELAY_MS * attempt); continue; }
        return new Response(null, { status: 502 });
      }
      const headers = new Headers();
      headers.set('Content-Type', upstream.headers.get('Content-Type') || 'image/png');
      headers.set('Cache-Control', 'public, max-age=86400');
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(buf, { status: 200, headers });
    } catch (err) {
      // Network error (connection reset / timeout) — retry.
      lastStatus = 502;
      if (attempt < MAX_ATTEMPTS) { await sleep(RETRY_DELAY_MS * attempt); continue; }
    }
  }
  return new Response(null, { status: lastStatus });
}
