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

// Bare Node fetch headers (UA "node", Accept "*/*") get flagged as bots by
// Cloudflare in front of some upstreams when called from the production server.
const UPSTREAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 PacificOceanPortal',
  'Accept': 'image/avif,image/webp,image/png,image/*,*/*;q=0.8',
  'Referer': 'https://oceanportal.spc.int/',
};

// ocean-plotter's /plotter/proxy?url=<inner> wrapper only adds CORS; since we're
// already server-side we can hit <inner> directly if the wrapper refuses us.
function unwrapPlotterProxy(target) {
  try {
    const u = new URL(target);
    if (u.hostname === 'ocean-plotter.spc.int' && u.pathname.startsWith('/plotter/proxy')) {
      return u.searchParams.get('url');
    }
  } catch {}
  return null;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  if (!target) return new Response(null, { status: 400 });

  const candidates = [target];
  const inner = unwrapPlotterProxy(target);
  if (inner) candidates.push(inner);

  let lastStatus = 502;
  for (const url of candidates) {
    const res = await fetchTile(url);
    if (res.ok) return res.response;
    lastStatus = res.status;
  }
  return new Response(null, { status: lastStatus, headers: { 'X-Upstream-Status': String(lastStatus) } });
}

async function fetchTile(target) {
  let lastStatus = 502;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const upstream = await fetch(target, { redirect: 'follow', headers: UPSTREAM_HEADERS });
      if (!upstream.ok) {
        lastStatus = upstream.status || 502;
        // Retry only transient server-side failures; 4xx won't get better.
        if (upstream.status >= 500 && attempt < MAX_ATTEMPTS) { await sleep(RETRY_DELAY_MS * attempt); continue; }
        return { ok: false, status: lastStatus };
      }
      const buf = await upstream.arrayBuffer();
      if (!buf || buf.byteLength === 0) {
        lastStatus = 502;
        if (attempt < MAX_ATTEMPTS) { await sleep(RETRY_DELAY_MS * attempt); continue; }
        return { ok: false, status: 502 };
      }
      const headers = new Headers();
      headers.set('Content-Type', upstream.headers.get('Content-Type') || 'image/png');
      headers.set('Cache-Control', 'public, max-age=86400');
      headers.set('Access-Control-Allow-Origin', '*');
      return { ok: true, response: new Response(buf, { status: 200, headers }) };
    } catch (err) {
      // Network error (connection reset / timeout) — retry.
      lastStatus = 502;
      if (attempt < MAX_ATTEMPTS) { await sleep(RETRY_DELAY_MS * attempt); continue; }
    }
  }
  return { ok: false, status: lastStatus };
}
