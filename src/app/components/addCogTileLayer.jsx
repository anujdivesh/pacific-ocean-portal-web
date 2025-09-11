import L from "leaflet";
import buildTileUrlFromCogParams, {
  parseCogParams,
  mergeParamsWithBounds,
  buildParams
} from "./cogParams";

/**
 * Expand a cogParamsString into base, params object, query string, and full URL.
 * Useful for logging/diagnostics.
 */
export function getCOGUrlParts(
  cogParamsString,
  extraParams = {},
  { enforceBounds = true } = {}
) {
  const { base, params } = parseCogParams(cogParamsString);
  const effectiveParams = mergeParamsWithBounds(params, extraParams, { enforceBounds });
  const queryString = buildParams(effectiveParams);
  const url = `${base}?${queryString}`;
  return { base, params: effectiveParams, queryString, url };
}

/**
 * Create a Leaflet TileLayer from a COG dynamic tile API param string.
 *
 * Usage:
 *  const layer = addCOGTileLayer(map, cogParamsString, {
 *    extraParams: { url, variable, time }, // REQUIRED by your service
 *    enforceBounds: true,
 *    tileOptions: { opacity: 0.9 },
 *    onParams: (params) => console.log(params),
 *    onUrl: (url) => console.log(url)
 *  });
 *  layer.addTo(map);
 *
 * Options:
 *  - extraParams: merge-in URL params (e.g., { url, variable, time })
 *  - enforceBounds: boolean, when true adds lon_min/lon_max/lat_min/lat_max
 *  - tileOptions: Leaflet TileLayer options
 *  - onParams(params): callback for effective params object
 *  - onUrl(url): callback for the final URL template (with {z}/{x}/{y})
 */
export function addCOGTileLayer(
  map,
  cogParamsString,
  {
    extraParams = {},
  enforceBounds = false,
    tileOptions = {},
    onParams,
    onUrl
  } = {}
) {
  const { url, params } = getCOGUrlParts(cogParamsString, extraParams, {
    enforceBounds
  });

  if (typeof onParams === "function") {
    try {
      onParams(params);
    } catch {}
  }
  if (typeof onUrl === "function") {
    try {
      onUrl(url);
    } catch {}
  }

  const layer = L.tileLayer(url, {
    tileSize: 256,
    minZoom: 0,
    maxZoom: 8,
    crossOrigin: true,
    ...tileOptions
  });

  return layer;
}

export default addCOGTileLayer;