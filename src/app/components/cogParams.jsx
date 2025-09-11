// Utilities to parse a compact "COG params string", merge parameters, and build URLs.
//
// Expected cogParamsString formats:
//
// 1) Ampersand + colon format (no "?"):
//    http://host/cog/tiles/dynamic/{z}/{x}/{y}.png&colormap:"RdBu_r"&vmin:-2&plot:"discrete"&plot_options:{...}
//
// 2) Standard URL with query string ("?"):
//    http://host/cog/tiles/dynamic/{z}/{x}/{y}.png?colormap=RdBu_r&vmin=-2&plot=discrete&plot_options=%7B...%7D
//
// Note: The first segment is always the tile base template (with {z}/{x}/{y}).
// The remainder encodes key/value pairs for the dynamic tile service.

export const HARDCODED_BOUNDS = {
  lon_min: 100,
  lon_max: 300,
  lat_min: -45,
  lat_max: 45
};

// Build URLSearchParams string, JSON-stringifying nested plot_options.
export function buildParams(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    if (k === "plot_options") {
      p.set(k, JSON.stringify(v));
    } else {
      p.set(k, String(v));
    }
  }
  return p.toString();
}

// Convert JS-like object/array text into strict JSON so JSON.parse will work.
function parseLooseJson(loose) {
  let s = String(loose).trim();

  // Quote unquoted keys: {key: ...} -> {"key": ...}
  s = s.replace(/([{,]\s*)([A-Za-z_]\w*)(\s*:)/g, '$1"$2"$3');

  // Replace single-quoted strings with double-quoted
  s = s.replace(/'([^']*)'/g, (_, inner) => `"${inner.replace(/"/g, '\\"')}"`);

  // Remove trailing commas
  s = s.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(s);
}

function toInferredType(raw) {
  const v = String(raw).trim();

  // Handle quoted strings
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }

  // Booleans
  if (v === "true") return true;
  if (v === "false") return false;

  // Objects/arrays
  if (/^[\[{]/.test(v)) {
    try {
      return parseLooseJson(v);
    } catch {
      // If parsing fails, return raw
      return v;
    }
  }

  // Numbers
  const num = Number(v);
  if (!Number.isNaN(num)) return num;

  // Fallback string
  return v;
}

// Parse a cogParamsString into { base, params }
// - base: tile URL template with {z}/{x}/{y}.png
// - params: plain object of key/value pairs (plot_options as object if possible)
export function parseCogParams(cogStr) {
  if (typeof cogStr !== "string" || !cogStr.trim()) {
    throw new Error("cog_params must be a non-empty string");
  }

  // Case 2: already a proper URL with "?"
  if (cogStr.includes("?")) {
    const [base, qs] = cogStr.split("?");
    const params = Object.fromEntries(new URLSearchParams(qs));
    if (params.plot_options) {
      try {
        params.plot_options = JSON.parse(params.plot_options);
      } catch {
        // keep as string if not valid JSON
      }
    }
    return { base, params };
  }

  // Case 1: ampersand + colon style
  const parts = cogStr
    .split("&")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) throw new Error("Invalid cog_params string");

  const base = parts[0];
  const params = {};

  for (let i = 1; i < parts.length; i++) {
    const piece = parts[i];
    const idx = piece.indexOf(":");
    if (idx === -1) continue;

    const key = piece.slice(0, idx).trim();
    let val = piece.slice(idx + 1).trim();

    // Strip trailing comma if present
    if (val.endsWith(",")) val = val.slice(0, -1);

    params[key] = toInferredType(val);
  }

  return { base, params };
}

// Merge params with optional hardcoded bounds enforcement.
// Precedence: parsed < extraParams < HARDCODED_BOUNDS (if enforceBounds)
export function mergeParamsWithBounds(parsedParams = {}, extraParams = {}, { enforceBounds = false } = {}) {
  const merged = { ...parsedParams, ...extraParams };
  if (!enforceBounds) return merged;

  // Only apply hardcoded bounds for keys that are missing; never override provided values
  const boundsKeys = ["lon_min", "lon_max", "lat_min", "lat_max"];
  const toApply = {};
  for (const k of boundsKeys) {
    if (merged[k] === undefined || merged[k] === null || merged[k] === "") {
      toApply[k] = HARDCODED_BOUNDS[k];
    }
  }
  return { ...merged, ...toApply };
}

// Build full tile URL template from cogParamsString + extra params.
export function buildTileUrlFromCogParams(cogStr, extraParams = {}, options = {}) {
  const { base, params } = parseCogParams(cogStr);
  const finalParams = mergeParamsWithBounds(params, extraParams, options);
  const qs = buildParams(finalParams);
  return `${base}?${qs}`;
}

export default buildTileUrlFromCogParams;