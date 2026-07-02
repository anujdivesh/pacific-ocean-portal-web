import maplibregl from 'maplibre-gl';
import $ from 'jquery';
import { toast } from 'react-hot-toast';
import { Z, uniqueId } from './maplibreLayers';

/**
 * Add a WMS layer to a MapLibre GL map as a raster source/layer.
 *
 * Mirrors the previous Leaflet `L.tileLayer.wms` behavior: tiles are requested
 * per-tile in EPSG:3857 (via MapLibre's `{bbox-epsg-3857}` token), and a single
 * map-level click handler performs GetFeatureInfo against the topmost non-"dir"
 * WMS layer, showing the same popup + "open timeseries" link.
 *
 * @param {maplibregl.Map} map   - MapLibre map (must have `map.__mgr` = MapLayerManager).
 * @param {string} url           - Base WMS service URL.
 * @param {Object} options       - id, layers, styles, format, transparent, opacity,
 *                                  colorscalerange, numcolorbands, abovemaxcolor,
 *                                  belowmincolor, logscale, time, bgcolor, version.
 * @param {function} handleShow  - Callback for the "open timeseries" link click.
 * @returns {Object} manager entry { sourceId, layerIds, remove() }.
 */
const addWMSTileLayer = (map, url, options = {}, handleShow) => {
  const mgr = map.__mgr;
  const {
    id,
    layers = '',
    styles = '',
    format = 'image/png',
    transparent = true,
    opacity = 1,
    version = '1.1.1',
  } = options;

  // Build the WMS GetMap request parameters (uppercase keys, EPSG:3857 tiles).
  const params = {
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: version,
    LAYERS: layers,
    STYLES: styles == null ? '' : styles,
    FORMAT: format,
    TRANSPARENT: transparent ? 'true' : 'false',
    WIDTH: 256,
    HEIGHT: 256,
    SRS: 'EPSG:3857',
  };
  // Optional ncWMS-style params (only appended when provided).
  const optional = {
    COLORSCALERANGE: options.colorscalerange,
    NUMCOLORBANDS: options.numcolorbands,
    ABOVEMAXCOLOR: options.abovemaxcolor,
    BELOWMINCOLOR: options.belowmincolor,
    LOGSCALE: options.logscale,
    TIME: options.time,
    BGCOLOR: options.bgcolor,
  };
  for (const [k, v] of Object.entries(optional)) {
    if (v !== undefined && v !== null && v !== '') params[k] = v;
  }

  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  // BBOX token must stay unencoded so MapLibre substitutes it per tile.
  const sep = url.includes('?') ? '&' : '?';
  const tileUrl = `${url}${sep}${qs}&BBOX={bbox-epsg-3857}`;

  const sourceId = uniqueId(`wms-${id}`);

  const entry = mgr.add({
    sourceId,
    source: {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
    },
    layers: [
      {
        id: sourceId,
        type: 'raster',
        source: sourceId,
        paint: { 'raster-opacity': typeof opacity === 'number' ? opacity : 1, 'raster-fade-duration': 0 },
      },
    ],
    datasetId: id,
    kind: 'wms',
    layerName: layers,
    group: Z.wms,
    meta: { url, layers, styles: params.STYLES, format, transparent, version },
  });

  // Attach the single map-level GetFeatureInfo click handler once per map.
  if (!map.__wmsFeatureInfoAttached) {
    map.__wmsFeatureInfoAttached = true;
    map.on('click', (evt) => {
      const target = map.__mgr && map.__mgr.getTopmostNonDirWms();
      if (!target) return;
      getFeatureInfo(evt.lngLat, target, map, handleShow);
    });
  }

  return entry;
};

// GetFeatureInfo (WMS 1.1.1, EPSG:4326) — same request shape as the Leaflet version.
const getFeatureInfo = (lngLat, entry, map, handleShow) => {
  const meta = entry.meta || {};
  const b = map.getBounds();
  const canvas = map.getCanvas();
  const width = Math.round(canvas.clientWidth || canvas.width);
  const height = Math.round(canvas.clientHeight || canvas.height);
  const pt = map.project(lngLat);

  const params = {
    request: 'GetFeatureInfo',
    service: 'WMS',
    srs: 'EPSG:4326',
    styles: meta.styles || '',
    transparent: meta.transparent,
    version: meta.version || '1.1.1',
    format: meta.format,
    // EPSG:4326 / v1.1.1 axis order is lon,lat => west,south,east,north
    bbox: `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`,
    height,
    width,
    layers: meta.layers,
    query_layers: meta.layers,
    info_format: 'text/html',
  };
  params[params.version === '1.3.0' ? 'i' : 'x'] = Math.round(pt.x);
  params[params.version === '1.3.0' ? 'j' : 'y'] = Math.round(pt.y);

  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const baseUrl = meta.url || '';
  let featureInfoUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${qs}`;
  // Preserve the same URL clean-ups the Leaflet implementation applied.
  featureInfoUrl = featureInfoUrl.replace(/wms\?.*?REQUEST=[^&]*?&.*?REQUEST=[^&]*?&/, '');
  featureInfoUrl = featureInfoUrl.replace(/VERSION=1\.3\.0&/g, '');
  featureInfoUrl = featureInfoUrl.replace(/\/ncWMS\/?(?!wms\?)/i, '/ncWMS/wms?REQUEST=GetFeatureInfo&');

  $.ajax({
    url: featureInfoUrl,
    success: function (data) {
      const doc = new DOMParser().parseFromString(data, 'text/html');
      if (doc.body.innerHTML.trim().length > 0) {
        showFeatureInfoPopup(doc.body.innerHTML, lngLat, map, entry.datasetId, handleShow);
      } else {
        toast('No feature information available for this location.', {
          icon: '⚠️',
          style: { background: '#fffbe6', color: '#ad8b00' },
        });
      }
    },
    error: function () {
      toast('Feature info is not available for this layer.', {
        icon: '⚠️',
        style: { background: '#fffbe6', color: '#ad8b00' },
      });
    },
  });
};

const showFeatureInfoPopup = (content, lngLat, map, id, handleShow) => {
  const el = document.createElement('html');
  el.innerHTML = content;

  // Extract variable name + value (same td-index assumptions as before).
  const p = el.getElementsByTagName('td');
  let variableName = 'Value';
  let featureInfo = 'No Data';
  if (p.length > 5) {
    variableName = p[0] ? p[0].textContent.trim() : 'Value';
    featureInfo = p[5] ? p[5].textContent.trim() : 'No Data';
    const num = Number(featureInfo);
    if (!isNaN(num)) featureInfo = num.toFixed(2);
  }

  const popupContent = `
      <p>${variableName}: ${featureInfo}</p>
  `;

  const popup = new maplibregl.Popup({ maxWidth: '800px' })
    .setLngLat(lngLat)
    .setHTML(popupContent)
    .addTo(map);

  const link = popup.getElement()?.querySelector('.open-timeseries-link');
  if (link) {
    link.addEventListener('click', () => {
      handleShow(id);
    });
  }
};

export default addWMSTileLayer;
