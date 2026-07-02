import {
  parseCogParams,
  mergeParamsWithBounds,
  buildParams,
} from './cogParams';
import { Z, uniqueId } from './maplibreLayers';

/**
 * Expand a cogParamsString into base, params object, query string, and full URL.
 * Useful for logging/diagnostics. (Unchanged from the Leaflet version.)
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
 * Create a MapLibre raster source/layer from a COG dynamic tile API param string.
 *
 * The param string already yields a full `{z}/{x}/{y}` tile URL template, so this
 * is a plain XYZ raster source (no WMS bbox token needed).
 *
 * @param {maplibregl.Map} map   - MapLibre map (must have `map.__mgr` = MapLayerManager).
 * @param {string} cogParamsString
 * @param {Object} opts - { extraParams, enforceBounds, tileOptions:{opacity,maxNativeZoom}, onParams, onUrl }
 * @returns {Object} manager entry { sourceId, layerIds, remove() }.
 */
export function addCOGTileLayer(
  map,
  cogParamsString,
  {
    extraParams = {},
    enforceBounds = false,
    tileOptions = {},
    onParams,
    onUrl,
  } = {}
) {
  const { url, params } = getCOGUrlParts(cogParamsString, extraParams, { enforceBounds });

  if (typeof onParams === 'function') {
    try { onParams(params); } catch {}
  }
  if (typeof onUrl === 'function') {
    try { onUrl(url); } catch {}
  }

  const mgr = map.__mgr;
  const datasetId = extraParams && extraParams.layer_id != null ? extraParams.layer_id : null;
  const sourceId = uniqueId(`cog-${datasetId != null ? datasetId : 'x'}`);
  const opacity = typeof tileOptions.opacity === 'number' ? tileOptions.opacity : 1;
  // maxNativeZoom -> source maxzoom (MapLibre overzooms beyond it).
  const maxzoom = typeof tileOptions.maxNativeZoom === 'number' ? tileOptions.maxNativeZoom : 8;

  const entry = mgr.add({
    sourceId,
    source: {
      type: 'raster',
      tiles: [url],
      tileSize: 256,
      minzoom: 0,
      maxzoom,
    },
    layers: [
      {
        id: sourceId,
        type: 'raster',
        source: sourceId,
        paint: { 'raster-opacity': opacity },
      },
    ],
    datasetId,
    kind: 'cog',
    layerName: (extraParams && extraParams.variable) || '',
    group: Z.wms,
    meta: { url },
  });

  return entry;
}

export default addCOGTileLayer;
