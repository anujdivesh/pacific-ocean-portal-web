"use client"; // client side rendering
import React, { useEffect, useState, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppSelector, useAppDispatch } from '@/app/GlobalRedux/hooks';
import { setCenter, setZoom, setBaseMapLayer, setEEZEnable, setCoastlineEnable, setCityNameEnable, setBounds, setDataLimit } from '@/app/GlobalRedux/Features/map/mapSlice';
import addWMSTileLayer from './addWMSTileLayer';
import { addCOGTileLayer } from './addCogTileLayer';
import { MapLayerManager, Z } from './maplibreLayers';
import { withBasePath } from '@/app/lib/basePath';
import '@/app/components/legend.css';
import { showoffCanvas } from '@/app/GlobalRedux/Features/offcanvas/offcanvasSlice';
import ShareWorkbench from './shareWorkbench';
import Loading from '@/app/loading';
import { setCoordinates } from '@/app/GlobalRedux/Features/coordinate/mapSlice';

const MapBox = () => {
  const mapRef = useRef();
  const mgrRef = useRef(null);
  const isMapInitialized = useRef(false); // Track if map is initialized
  const [mapReady, setMapReady] = useState(false); // flips true after style 'load'

  const dispatch = useAppDispatch();
  const { center, zoom, bounds, maxBounds, layers, basemap, eezoverlay, enable_eez, enable_coastline, coastlineoverlay, citynamesoverlay, enable_citynames, sidebarCollapsed, rerenderKey } = useAppSelector((state) => state.mapbox);

  // Build a lightweight signature of layer params that should force a visual refresh when they change
  const layerSignature = useMemo(() => {
    if (!layers || !Array.isArray(layers)) return '';
    return layers.map(l => {
      const info = l.layer_information || {};
      return [
        info.id,
        info.enabled ? 1 : 0,
        info.enable_cog ? 1 : 0,
        info.layer_type,
        info.url,
        info.layer_name,
        info.timeIntervalStart,
        info.timeIntervalEnd,
        info.colormin, info.colormax, info.opacity,
        info.style,
        info.is_composite ? 1 : 0,
        info.numcolorbands,
        info.logscale ? 1 : 0,
        String(info.cog_params || ''),
        Array.isArray(info.selectedSofarTypes) ? info.selectedSofarTypes.join(',') : ''
      ].join(':');
    }).join('|');
  }, [layers]);

  const isBing = useRef(false);
  const selectedOptionRef = useRef('bing');
  const [selectedOption, setSelectedOption] = useState('bing');
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [checkboxCheckedCoast, setCheckboxCheckedCoast] = useState(true);
  const [checkboxCheckedCity, setCheckboxCheckedCity] = useState(true);
  const [showTime, setShowTime] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Current basemap URL (used to avoid redundant basemap swaps from the [basemap] effect)
  const currentBasemapUrlRef = useRef(null);
  // Shared popups for point layers
  const hoverPopupRef = useRef(null);
  const clickPopupRef = useRef(null);
  // Track which point sources already have interaction handlers wired (once per source id)
  const pointHandlersRef = useRef(new Set());
  // Debounce for SOFAR fetches
  const pendingRequestRef = useRef(null);

  const handleShow = (id) => { dispatch(showoffCanvas(id)); };
  const handleShowShareModal = () => setShowShareModal(true);
  const handleHideShareModal = () => setShowShareModal(false);

  // ---------------------------------------------------------------------------
  // Small geometry / URL helpers
  // ---------------------------------------------------------------------------
  // MapLibre has no {s} subdomain token: expand into a multi-entry tiles array.
  const expandTiles = (url) => {
    if (typeof url === 'string' && url.includes('{s}')) {
      return ['a', 'b', 'c'].map((s) => url.replace('{s}', s));
    }
    return [url];
  };

  // Unlike Leaflet's <img> tiles, MapLibre fetches tiles via XHR (and never
  // retries a failed tile). Route the SPC-hosted tile hosts through the
  // same-origin proxy so they get CORS + server-side retry + caching:
  //  - spc-osm: OSM basemap (no CORS)
  //  - ocean-plotter: Satellite basemap + EEZ/coastline/names overlays
  //    (intermittently drops tiles under concurrent load -> proxy retries them)
  const PROXY_TILE_PATTERNS = [
    'spc-osm.spc.int',
    'ocean-plotter.spc.int',
  ];
  // Use an ABSOLUTE same-origin URL: MapLibre fetches tiles inside a Web Worker
  // where a relative "/api/..." can resolve incorrectly and yield a bad/empty
  // response (which then fails createImageBitmap with InvalidStateError).
  const proxyOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const transformRequest = (url, resourceType) => {
    if ((resourceType === 'Tile' || resourceType === 'Image') && /^https?:\/\//i.test(url)) {
      if (!url.includes('/api/proxy-tile') && PROXY_TILE_PATTERNS.some((p) => url.includes(p))) {
        return { url: `${proxyOrigin}${withBasePath('/api/proxy-tile')}?url=${encodeURIComponent(url)}` };
      }
    }
    return { url };
  };

  // Leaflet maxBounds [[s,w],[n,e]] -> MapLibre [[w,s],[e,n]]
  const toLngLatBounds = (b) => {
    if (!b) return undefined;
    if (Array.isArray(b) && b.length === 2 && Array.isArray(b[0])) {
      const [[s, w], [n, e]] = b;
      return [[w, s], [e, n]];
    }
    return b;
  };

  const runWhenReady = (fn) => {
    const map = mapRef.current;
    if (!map) return;
    if (map.loaded()) { try { fn(); } catch {} }
    else map.once('idle', () => { try { fn(); } catch {} });
  };

  // Raster tiles (satellite/OSM basemap + WMS dataset layers) are only crisp at
  // integer zoom levels; at a fractional zoom MapLibre stretches the nearest
  // pyramid level and they look blurry. fitBounds lands on a fractional zoom
  // almost every time, so snap DOWN to the nearest integer (floor keeps the full
  // region visible with a touch more margin).
  const snapZoomToInteger = () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const z = map.getZoom();
      const rz = Math.floor(z);
      if (rz !== z) map.setZoom(rz);
    } catch {}
  };

  // Fit to a serializable bounds object {south,west,north,east}
  const safeFitBoundsGlobal = (input, options = {}) => {
    const map = mapRef.current;
    if (!map || !input) return;
    let s, w, n, e;
    if (Array.isArray(input) && Array.isArray(input[0])) {
      [[s, w], [n, e]] = input;
    } else if (typeof input === 'object' && 'south' in input) {
      s = input.south; w = input.west; n = input.north; e = input.east;
    } else return;
    runWhenReady(() => {
      map.fitBounds([[w, s], [e, n]], { animate: false, ...options });
      snapZoomToInteger();
    });
  };

  // Zoom to a dataset's declared bounds (lat/lng, order-agnostic).
  // ---------------------------------------------------------------------------
  // Basemap + overlays
  // ---------------------------------------------------------------------------
  const setBasemap = (obj) => {
    const map = mapRef.current; const mgr = mgrRef.current;
    if (!map || !mgr || !obj || !obj.url) return;
    mgr.removeByKind('basemap');
    const source = { type: 'raster', tiles: expandTiles(obj.url), tileSize: 256, attribution: obj.attribution || '© Pacific Community SPC' };
    if (typeof obj.maxZoom === 'number') source.maxzoom = obj.maxZoom;
    mgr.add({
      sourceId: 'basemap',
      source,
      layers: [{ id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-fade-duration': 0 } }],
      kind: 'basemap', layerName: 'basemap', group: Z.basemap,
    });
  };

  const addOverlay = (key, rawUrl) => {
    const map = mapRef.current; const mgr = mgrRef.current;
    if (!map || !mgr || !rawUrl) return;
    const isTms = rawUrl.includes('{-y}');
    const url = rawUrl.replace('{-y}', '{y}');
    const source = { type: 'raster', tiles: expandTiles(url), tileSize: 256 };
    if (isTms) source.scheme = 'tms';
    setIsLoading2(true);
    mgr.add({
      sourceId: key,
      source,
      layers: [{ id: key, type: 'raster', source: key, paint: { 'raster-fade-duration': 0 } }],
      kind: 'overlay', layerName: key, group: Z.overlay,
    });
    map.once('idle', () => setIsLoading2(false));
  };

  // Vector-tile overlay renderer — used for EEZ, coastline and place names.
  // These come from the GeoWebCache PBF endpoint so they stay crisp at every zoom level.
  const VECTOR_OVERLAY_DEFS = {
    eez: {
      sourceLayer: 'global_eez_200nm',
      layers: (key) => [{
        id: key, type: 'line', source: key, 'source-layer': 'global_eez_200nm',
        paint: {
          'line-color': '#2196F3',
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 8, 1.5, 12, 2.2],
          'line-opacity': 0.9,
          'line-dasharray': [5, 3],
        },
      }],
    },
    coastline: {
      sourceLayer: 'pac_coastline',
      layers: (key) => [{
        id: key, type: 'line', source: key, 'source-layer': 'pac_coastline',
        paint: {
          'line-color': '#888888',
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.4, 8, 0.8, 12, 1.2],
          'line-opacity': 0.85,
        },
      }],
    },
    pacnames: {
      sourceLayer: 'pacific_names',
      layers: (key) => [{
        id: key, type: 'symbol', source: key, 'source-layer': 'pacific_names',
        minzoom: 4,
        layout: {
          'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name'], ['get', 'NAME'], ['get', 'place_name']],
          'text-font': ['Open Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 8, 11, 12, 13],
          'text-anchor': 'center',
          'text-max-width': 7,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#1a1a2e',
          'text-halo-color': 'rgba(255,255,255,0.92)',
          'text-halo-width': 1.5,
        },
      }],
    },
  };

  const addVectorOverlay = (key, rawUrl) => {
    const map = mapRef.current; const mgr = mgrRef.current;
    if (!map || !mgr || !rawUrl) return;
    const def = VECTOR_OVERLAY_DEFS[key];
    if (!def) { addOverlay(key, rawUrl); return; } // fallback for unknown keys
    const isTms = rawUrl.includes('{-y}');
    const url = rawUrl.replace('{-y}', '{y}');
    const source = { type: 'vector', tiles: expandTiles(url), minzoom: 0, maxzoom: 14 };
    if (isTms) source.scheme = 'tms';
    setIsLoading2(true);
    mgr.add({
      sourceId: key,
      source,
      layers: def.layers(key),
      kind: 'overlay', layerName: key, group: Z.overlay,
    });
    map.once('idle', () => setIsLoading2(false));
  };

  // ---------------------------------------------------------------------------
  // Point layers (SOFAR / WFS / TIDE) via MapLibre native clustering
  // ---------------------------------------------------------------------------
  const jitter = (fc) => ({
    ...fc,
    features: (fc.features || []).map((f) => {
      if (f && f.geometry && f.geometry.type === 'Point') {
        const d = 0.0005;
        const [lng, lat] = f.geometry.coordinates;
        return { ...f, geometry: { ...f.geometry, coordinates: [lng + (Math.random() * d * 2 - d), lat + (Math.random() * d * 2 - d)] } };
      }
      return f;
    }),
  });

  // SOFAR raw payload -> GeoJSON (same shape/props as the Leaflet implementation)
  const transformToGeoJSON = (raw, selectedTypes = []) => {
    const entries = Array.isArray(raw) ? raw : [raw];
    let filteredEntries = entries;
    if (selectedTypes && selectedTypes.length > 0) {
      filteredEntries = entries.filter((entry) => selectedTypes.includes(entry.type_id));
    }
    return {
      type: 'FeatureCollection',
      features: filteredEntries.map((entry) => {
        let lon = entry.longitude;
        if (entry.longitude < 0) lon = entry.longitude + 360;
        const lat = entry.latitude;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties: {
            spotter_id: entry.station_id || 'Unknown',
            display_name: entry.display_name || null,
            is_active: (entry.is_active ? String(entry.is_active).toUpperCase() : 'FALSE'),
            owner: entry.owner || 'Unknown',
            sensor: entry.type_value || '',
            type_id: entry.type_id || null,
            data_limit: entry.data_limit || 100,
          },
        };
      }),
    };
  };

  // Normalize longitudes to [-180,180] and duplicate points near the dateline.
  const processDateline = (geojson) => {
    const normalizeLongitude = (lon) => {
      while (lon > 180) lon -= 360;
      while (lon < -180) lon += 360;
      return lon;
    };
    return {
      ...geojson,
      features: (geojson.features || []).map((feature) => {
        const geometry = feature.geometry;
        if (geometry && geometry.type === 'Point') {
          const [lon, lat] = geometry.coordinates;
          const normalizedLon = normalizeLongitude(lon);
          if (Math.abs(normalizedLon) > 150) {
            return [
              { ...feature, geometry: { ...geometry, coordinates: [normalizedLon, lat] } },
              { ...feature, geometry: { ...geometry, coordinates: [normalizedLon + 360, lat] } },
            ];
          }
          return { ...feature, geometry: { ...geometry, coordinates: [normalizedLon, lat] } };
        }
        return feature;
      }).flat(),
    };
  };

  const cleanupPoints = (id) => {
    const mgr = mgrRef.current;
    if (mgr) { try { mgr.pruneByDatasetId(id); } catch {} }
  };

  const buildTooltip = (kind, p) => {
    if (kind === 'sofar') {
      const displayName = p.display_name || p.spotter_id || 'Unknown';
      return `<div style="min-width:120px;"><strong>${displayName}</strong><br>Status: ${p.is_active === 'TRUE' ? 'Active' : 'Inactive'}<br>Owner: ${p.owner || 'Unknown'}</div>`;
    }
    if (kind === 'tide') return `${p.location || 'No name provided'}`;
    return `${p.station_na || 'No name provided'}`; // wfs
  };

  const handlePointClick = (kind, id, feature) => {
    const p = feature.properties || {};
    if (kind === 'sofar') {
      dispatch(setDataLimit(p.data_limit || 100));
      dispatch(setCoordinates({
        id,
        x: p.owner,
        y: p.is_active,
        sizex: p.type_id != null ? Number(p.type_id) : null,
        sizey: null,
        bbox: null,
        station: p.spotter_id,
        country_code: p.owner,
        display_name: p.display_name,
      }));
      dispatch(showoffCanvas(id));
    } else if (kind === 'tide') {
      dispatch(setCoordinates({ id, x: p.country_na, y: p.location, sizex: null, sizey: null, bbox: null, station: p.station_id }));
      dispatch(showoffCanvas(id));
    } else { // wfs
      dispatch(setDataLimit(p.data_limit || 100));
      dispatch(setCoordinates({ id, x: 0, y: 0, sizex: 0, sizey: 0, bbox: 0, station: p.station_id }));
      dispatch(showoffCanvas(id));
    }
  };

  const attachPointHandlers = (id, kind, ids) => {
    const map = mapRef.current;
    if (!map || pointHandlersRef.current.has(ids.sourceId)) return;
    pointHandlersRef.current.add(ids.sourceId);

    // Cluster click -> expand (replaces markercluster zoom-to-bounds / spiderfy)
    map.on('click', ids.clusterLayerId, (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [ids.clusterLayerId] });
      const clusterId = features[0] && features[0].properties && features[0].properties.cluster_id;
      const src = map.getSource(ids.sourceId);
      if (clusterId == null || !src) return;
      src.getClusterExpansionZoom(clusterId).then((z) => {
        map.easeTo({ center: features[0].geometry.coordinates, zoom: z });
      }).catch(() => {});
    });
    map.on('mouseenter', ids.clusterLayerId, (e) => {
      map.getCanvas().style.cursor = 'pointer';
      if (kind === 'sofar' && e.features && e.features[0]) {
        const count = e.features[0].properties.point_count;
        hoverPopupRef.current
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(`<div style='min-width:100px;text-align:center;'><strong>${count} buoys here</strong><br/>Zoom in to see details.</div>`)
          .addTo(map);
      }
    });
    map.on('mouseleave', ids.clusterLayerId, () => {
      map.getCanvas().style.cursor = '';
      hoverPopupRef.current.remove();
    });

    // Unclustered points
    map.on('mouseenter', ids.pointLayerId, (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features && e.features[0];
      if (!f) return;
      hoverPopupRef.current.setLngLat(f.geometry.coordinates).setHTML(buildTooltip(kind, f.properties)).addTo(map);
    });
    map.on('mouseleave', ids.pointLayerId, () => {
      map.getCanvas().style.cursor = '';
      hoverPopupRef.current.remove();
    });
    map.on('click', ids.pointLayerId, (e) => {
      const f = e.features && e.features[0];
      if (!f) return;
      // Detail popup (mirrors Leaflet bindPopup) + dispatch to open bottom canvas
      clickPopupRef.current.setLngLat(f.geometry.coordinates).setHTML(buildTooltip(kind, f.properties)).addTo(map);
      handlePointClick(kind, id, f);
    });
  };

  const addPointLayer = (rawFc, id, kind) => {
    const map = mapRef.current; const mgr = mgrRef.current;
    if (!map || !mgr) return;
    const fc = jitter(rawFc);
    const sourceId = `points-${id}`;
    mgr.removeByKey(sourceId);

    const clusterRadius = kind === 'sofar' ? 30 : 35;
    const clusterTextColor = kind === 'sofar' ? '#000000' : '#ffffff';
    const clusterLayerId = `${sourceId}-clusters`;
    const countLayerId = `${sourceId}-count`;
    const pointLayerId = `${sourceId}-unclustered`;

    const mlLayers = [];
    mlLayers.push({
      id: clusterLayerId, type: 'circle', source: sourceId, filter: ['has', 'point_count'],
      paint: { 'circle-color': '#C7D444', 'circle-radius': 20, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
    });
    mlLayers.push({
      id: countLayerId, type: 'symbol', source: sourceId, filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Open Sans Bold'], 'text-size': 14 },
      paint: { 'text-color': clusterTextColor },
    });
    if (kind === 'sofar') {
      mlLayers.push({
        id: pointLayerId, type: 'circle', source: sourceId, filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['match', ['get', 'type_id'], 3, '#3f51b5', 4, '#fe7e0f', '#01dddd'],
          'circle-radius': 9, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff',
        },
      });
    } else {
      mlLayers.push({
        id: pointLayerId, type: 'symbol', source: sourceId, filter: ['!', ['has', 'point_count']],
        layout: { 'icon-image': 'blue-marker', 'icon-size': 0.6, 'icon-anchor': 'bottom', 'icon-allow-overlap': true },
      });
    }

    mgr.add({
      sourceId,
      source: { type: 'geojson', data: fc, cluster: true, clusterMaxZoom: 11, clusterRadius },
      layers: mlLayers,
      datasetId: id, kind: 'point', layerName: kind, group: Z.point,
    });
    attachPointHandlers(id, kind, { clusterLayerId, countLayerId, pointLayerId, sourceId });
    setIsLoading(false);
  };

  const fetchWaveBuoy = async (url, id, selectedTypes = []) => {
    if (!selectedTypes || selectedTypes.length === 0) {
      cleanupPoints(id);
      setIsLoading(false);
      return;
    }
    cleanupPoints(id);
    setIsLoading(true);
    if (pendingRequestRef.current) clearTimeout(pendingRequestRef.current);
    pendingRequestRef.current = setTimeout(async () => {
      try {
        const response = await fetch(url);
        const rawData = await response.json();
        const processedGeoJSON = transformToGeoJSON(rawData, selectedTypes);
        addPointLayer(processedGeoJSON, id, 'sofar');
      } catch (error) {
        // ignore
      } finally {
        pendingRequestRef.current = null;
      }
    }, 100);
    setIsLoading(false);
  };

  const fetchAndPlotGeoJSON = async (url, id) => {
    try {
      setIsLoading(true);
      const response = await fetch(url);
      const geojsonData = await response.json();
      addPointLayer(processDateline(geojsonData), id, 'wfs');
    } catch (error) {
      // ignore
    }
  };

  const fetchAndPlotGeoJSONTIDE = async (url, id) => {
    try {
      setIsLoading(true);
      const response = await fetch(url);
      const geojsonData = await response.json();
      addPointLayer(processDateline(geojsonData), id, 'tide');
    } catch (error) {
      // ignore
    }
  };

  // Clean up debounce on unmount
  useEffect(() => () => { if (pendingRequestRef.current) clearTimeout(pendingRequestRef.current); }, []);

  // ---------------------------------------------------------------------------
  // Map events
  // ---------------------------------------------------------------------------
  const handleMoveEnd = () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const c = map.getCenter();
      const z = map.getZoom();
      const b = map.getBounds();
      dispatch(setCenter([c.lat, c.lng]));
      dispatch(setZoom(z));
      dispatch(setBounds({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }));
    } catch (error) {
      console.error('Error handling map move/zoom:', error);
    }
  };

  const handleBaseClick = (e) => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const x = Math.round(e.point.x);
      const y = Math.round(e.point.y);
      const canvas = map.getCanvas();
      const sizex = canvas.clientWidth;
      const sizey = canvas.clientHeight;
      const b = map.getBounds();
      const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
      dispatch(setCoordinates({ id: 2, x, y, sizex, sizey, bbox, station: null }));
    } catch (error) {
      console.error('Error handling map click:', error);
    }
  };

  // ---------------------------------------------------------------------------
  // Control panel handlers
  // ---------------------------------------------------------------------------
  const handleRadioChange = (event) => {
    const value = event.target.value;
    let basemapObj;
    if (value === 'osm') {
      isBing.current = false;
      basemapObj = { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '© Pacific Community SPC', option: value };
    } else if (value === 'bing') {
      isBing.current = true;
      basemapObj = {
        url: 'https://ocean-plotter.spc.int/plotter/cache/basemap/{z}/{x}/{y}.png',
        attribution: '© Pacific Community SPC | Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 10, minZoom: 2, option: value,
      };
    } else {
      isBing.current = false;
      basemapObj = { url: 'https://spc-osm.spc.int/tile/{z}/{x}/{y}.png', attribution: '© Pacific Community SPC', option: value };
    }
    setBasemap(basemapObj);
    currentBasemapUrlRef.current = basemapObj.url;
    localStorage.setItem('basemap', JSON.stringify(basemapObj));
    dispatch(setBaseMapLayer(basemapObj));
    setSelectedOption(value);
    selectedOptionRef.current = value;
  };

  const handleCheckboxChange = (event) => {
    setCheckboxChecked(event.target.checked);
    dispatch(setEEZEnable(event.target.checked));
  };
  const handleCheckboxChangeCoast = (event) => {
    setCheckboxCheckedCoast(event.target.checked);
    dispatch(setCoastlineEnable(event.target.checked));
  };
  const handleCheckboxChangeCity = (event) => {
    setCheckboxCheckedCity(event.target.checked);
    dispatch(setCityNameEnable(event.target.checked));
  };

  // ---------------------------------------------------------------------------
  // Controls (zoom + share, attribution, north arrow, base map / layers panel)
  // ---------------------------------------------------------------------------
  const injectControlStyles = () => {
    if (document.getElementById('maplibre-map-control-styles')) return;
    const style = document.createElement('style');
    style.id = 'maplibre-map-control-styles';
    style.textContent = `
      .maplibregl-ctrl-bottom-right { margin-bottom: 0; margin-right: 0; }
      .maplibregl-ctrl-bottom-right .maplibregl-ctrl { margin-bottom: 4px; margin-right: 14px; }
      /* Zoom + share pill (dark default) */
      .maplibregl-ctrl-group {
        border: 1px solid #48515a !important;
        background: #3F4854 !important;
        border-radius: 26px !important;
        box-shadow: 0 4px 14px -2px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.35) !important;
        overflow: hidden; display: flex; flex-direction: column; padding: 3px 0;
      }
      .maplibregl-ctrl-group button {
        background: transparent !important; color: #f1f5f9 !important;
        border: none !important; width: 32px; height: 30px; margin: 0 5px; border-radius: 11px;
      }
      .maplibregl-ctrl-group button + button { border-top: none !important; margin-top: 3px; }
      .maplibregl-ctrl-group button:hover { background: rgba(255,255,255,0.08) !important; }
      .maplibregl-ctrl-group button:active { background: rgba(255,255,255,0.15) !important; }
      .maplibregl-ctrl-group button .maplibregl-ctrl-icon { filter: invert(1) brightness(1.6); }
      .maplibregl-ctrl-share { display:flex; align-items:center; justify-content:center; cursor:pointer; }
      .maplibregl-ctrl-share svg { width: 17px; height: 17px; fill: currentColor; }
      /* Light mode overrides */
      html.light-mode .maplibregl-ctrl-group { background:#ffffff !important; border:1px solid #d0d5dc !important; box-shadow:0 2px 6px rgba(0,0,0,0.18) !important; }
      html.light-mode .maplibregl-ctrl-group button { color:#2b3338 !important; }
      html.light-mode .maplibregl-ctrl-group button:hover { background:#f2f4f7 !important; }
      html.light-mode .maplibregl-ctrl-group button .maplibregl-ctrl-icon { filter: none; }
      /* Attribution */
      .maplibregl-ctrl-bottom-right .map-attribution { margin-right: 0 !important; }
      .map-attribution {
        background: hsla(0,0%,100%,.85); color:#333 !important; font-size:11px !important;
        white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important;
        max-width:300px !important; line-height:1.2 !important; padding:1px 6px !important;
        border-radius:4px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important;
      }
      .map-attribution a { color:#0066cc !important; text-decoration:none !important; font-weight:500 !important; }
      .map-attribution a:hover { text-decoration:underline !important; }
      /* Popups (marker hover/click tooltips + WMS feature info) — force readable
         text so dark-mode global white text does not bleed onto the light popup. */
      .maplibregl-popup-content {
        color:#222 !important; background:#ffffff !important;
        border-radius:6px; box-shadow:0 1px 6px rgba(0,0,0,0.3);
      }
      .maplibregl-popup-content, .maplibregl-popup-content * { color:#222 !important; }
      .maplibregl-popup-content strong { color:#111 !important; }
      .maplibregl-popup-content a { color:#0066cc !important; }
      .maplibregl-popup-anchor-top .maplibregl-popup-tip,
      .maplibregl-popup-anchor-top-left .maplibregl-popup-tip,
      .maplibregl-popup-anchor-top-right .maplibregl-popup-tip { border-bottom-color:#ffffff !important; }
      .maplibregl-popup-anchor-bottom .maplibregl-popup-tip,
      .maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip,
      .maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip { border-top-color:#ffffff !important; }
      .maplibregl-popup-anchor-left .maplibregl-popup-tip { border-right-color:#ffffff !important; }
      .maplibregl-popup-anchor-right .maplibregl-popup-tip { border-left-color:#ffffff !important; }
      /* Base Map / Layers panel */
      .map-controls-container { z-index: 305; position: relative; }
      .map-controls-container .map-controls { position: relative; z-index: 306; }
      .map-controls {
        background: #3F4854 !important; padding: 14px 14px 12px; border-radius: 10px;
        box-shadow: 0 4px 14px -2px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.35);
        color: #e2e8f0 !important; font-family: inherit; font-size: 13px; line-height: 1.5;
        border: 1px solid #4b5560; backdrop-filter: saturate(1.2) blur(4px);
      }
      .map-controls .section-title { font-weight:600; margin:0 0 8px 0; color:#f5f7fa; font-size:12px; text-transform:uppercase; letter-spacing:.55px; opacity:.9; }
      .map-controls label { display:flex; align-items:center; padding:5px 8px 5px 6px; margin:1px 0; border-radius:6px; cursor:pointer; transition: background-color .18s, color .18s; color:#d7dde5; position:relative; }
      .map-controls label:hover { background:#4a5461; }
      .map-controls input[type="radio"], .map-controls input[type="checkbox"] { margin-right:8px; accent-color:#4da3ff; cursor:pointer; width:16px; height:16px; }
      .map-controls .divider { height:1px; background:linear-gradient(to right, rgba(255,255,255,0.08), rgba(255,255,255,0.35), rgba(255,255,255,0.08)); margin:10px 0 8px; border:none; }
      .map-controls .toggle-icon { font-weight:600; color:#b8c7d6; }
      html.light-mode .map-controls { background:#ffffff !important; color:#222 !important; border:1px solid #d0d5dc; box-shadow:0 2px 8px rgba(0,0,0,0.12); }
      html.light-mode .map-controls .section-title { color:#444; opacity:1; }
      html.light-mode .map-controls label { color:#222; }
      html.light-mode .map-controls label:hover { background:#f4f6f8; }
      html.light-mode .map-controls input[type="radio"], html.light-mode .map-controls input[type="checkbox"] { accent-color:#2563eb; }
      html.light-mode .map-controls .toggle-icon { color:#5b6b78; }
      /* Keep sidebar toggle above the map */
      .sidebar-toggle, button[data-sidebar-toggle], .sb-toggle, #sidebarToggle { position: relative; z-index: 5000 !important; }
    `;
    document.head.appendChild(style);
  };

  const makeControl = (el) => ({ onAdd() { return el; }, onRemove() { if (el.parentNode) el.parentNode.removeChild(el); } });

  const buildPanelElement = () => {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl map-controls-container';
    const div = document.createElement('div');
    div.className = 'map-controls';
    container.appendChild(div);

    div.innerHTML = `
      <div class="section-title" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; position: relative;">
        <span>Base Map</span>
        <span class="toggle-icon">-</span>
      </div>
      <div class="basemap-options" >
        <label>
          <input type="radio" name="option" value="opentopo" id="opentopo-radio" ${selectedOptionRef.current === 'opentopo' ? 'checked' : ''}/> OpenStreetMap
        </label>
        <label>
          <input type="radio" name="option" value="osm" id="osm-radio" ${selectedOptionRef.current === 'osm' ? 'checked' : ''}/> OpenTopoMap
        </label>
        <label>
          <input type="radio" name="option" value="bing" id="bing-radio" ${selectedOptionRef.current === 'bing' ? 'checked' : ''}/> Satellite
        </label>
      </div>
      <div class="divider"></div>
      <div class="section-title layers-title" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
        <span>Layers</span>
        <span class="toggle-icon">-</span>
      </div>
      <div class="layer-options">
        <label>
          <input id="eez-check" type="checkbox" ${checkboxChecked ? 'checked' : ''}/> Pacific EEZ
        </label>
        <label>
          <input id="coast-check" type="checkbox" ${checkboxCheckedCoast ? 'checked' : ''}/> Pacific Coastline
        </label>
        <label>
          <input id="city-check" type="checkbox" ${checkboxCheckedCity ? 'checked' : ''}/> Pacific Names
        </label>
      </div>
    `;

    const basemapTitle = div.querySelector('.section-title:first-child');
    const layersTitle = div.querySelector('.layers-title');
    const basemapOptions = div.querySelector('.basemap-options');
    const layerOptions = div.querySelector('.layer-options');

    basemapTitle.addEventListener('click', function () {
      const isHidden = basemapOptions.style.display === 'none';
      basemapOptions.style.display = isHidden ? 'block' : 'none';
      this.querySelector('.toggle-icon').textContent = isHidden ? '-' : '+';
    });
    layersTitle.addEventListener('click', function () {
      const isHidden = layerOptions.style.display === 'none';
      layerOptions.style.display = isHidden ? 'block' : 'none';
      this.querySelector('.toggle-icon').textContent = isHidden ? '-' : '+';
    });

    // Initialize: basemap collapsed, layers expanded
    basemapOptions.style.display = 'none';
    const basemapToggleIcon = basemapTitle.querySelector('.toggle-icon');
    if (basemapToggleIcon) basemapToggleIcon.textContent = '+';
    layerOptions.style.display = 'block';

    div.querySelector('#opentopo-radio').addEventListener('change', handleRadioChange);
    div.querySelector('#osm-radio').addEventListener('change', handleRadioChange);
    div.querySelector('#bing-radio').addEventListener('change', handleRadioChange);
    div.querySelector('#eez-check').addEventListener('change', handleCheckboxChange);
    div.querySelector('#coast-check').addEventListener('change', handleCheckboxChangeCoast);
    div.querySelector('#city-check').addEventListener('change', handleCheckboxChangeCity);

    // Prevent map interactions while using the panel
    ['mousedown', 'dblclick', 'wheel', 'touchstart'].forEach((ev) => container.addEventListener(ev, (e) => e.stopPropagation()));
    return container;
  };

  const addControls = (map) => {
    injectControlStyles();

    // NOTE: for BOTTOM positions MapLibre prepends each new control (inserts
    // before the first child), so the LAST control added renders on TOP. To get
    // the attribution BELOW the zoom pill, add the attribution FIRST, then the
    // zoom control.

    // Attribution (custom, compact) — added first so it sits at the very bottom
    const attrEl = document.createElement('div');
    attrEl.className = 'maplibregl-ctrl map-attribution';
    attrEl.innerHTML = '<a href="https://www.spc.int/" target="_blank">SPC</a> | © Pacific Community SPC';
    map.addControl(makeControl(attrEl), 'bottom-right');

    // Zoom control + share button (appended into the same pill) — sits above attribution
    const nav = new maplibregl.NavigationControl({ showCompass: false, showZoom: true, visualizePitch: false });
    map.addControl(nav, 'bottom-right');
    try {
      const navGroup = nav._container;
      if (navGroup) {
        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'maplibregl-ctrl-share';
        shareBtn.title = 'Share Workbench';
        shareBtn.setAttribute('aria-label', 'Share Workbench');
        shareBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>';
        navGroup.insertBefore(shareBtn, navGroup.firstChild);
        shareBtn.addEventListener('click', (e) => { e.preventDefault(); handleShowShareModal(); });
      }
    } catch (e) { /* ignore */ }

    // North arrow (bottom-left)
    const northEl = document.createElement('div');
    northEl.className = 'maplibregl-ctrl legend';
    northEl.style.cssText = 'background:transparent; margin:0; z-index:999;';
    northEl.innerHTML = `<img src='${withBasePath('/north_arrow.png')}' alt='North Arrow' width='50px' height='60px'>`;
    map.addControl(makeControl(northEl), 'bottom-left');

    // Base Map / Layers panel (top-right)
    map.addControl(makeControl(buildPanelElement()), 'top-right');
  };

  const ensureMarkerImage = async () => {
    const map = mapRef.current;
    if (!map || map.hasImage('blue-marker')) return;
    try {
      const resp = await map.loadImage(withBasePath('/blue_marker.png'));
      if (resp && resp.data && !map.hasImage('blue-marker')) map.addImage('blue-marker', resp.data);
    } catch (e) { /* ignore */ }
  };

  // ---------------------------------------------------------------------------
  // Map initialization
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const container = document.getElementById('map');
    if (!container) { console.warn('Map container not found'); return; }
    if (isMapInitialized.current) { console.warn('Map already initialized'); return; }

    // Always open the camera at the region bounds stored in Redux (pre-populated
    // from localStorage by getInitialBounds, or the Pacific default on first visit).
    // This means the map NEVER renders at an arbitrary center/zoom first.
    const initialBounds = (bounds && typeof bounds === 'object' && 'west' in bounds)
      ? [[bounds.west, bounds.south], [bounds.east, bounds.north]]
      : null;
    const cameraOptions = initialBounds
      ? { bounds: initialBounds, fitBoundsOptions: { animate: false, padding: 0 } }
      : { center: [center[1], center[0]], zoom }; // safety-net only (bounds should always be set)

    let map;
    try {
      map = new maplibregl.Map({
        container: 'map',
        style: {
          version: 8,
          glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
          sources: {},
          layers: [],
        },
        ...cameraOptions,
        minZoom: 2,
        maxZoom: 12,
        maxBounds: toLngLatBounds(maxBounds),
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        renderWorldCopies: true,
        transformRequest,
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      return;
    }
    mapRef.current = map;
    isMapInitialized.current = true;
    try { map.touchZoomRotate.disableRotation(); } catch {}
    try { map.dragRotate.disable(); } catch {}
    window.mapInstance = map; // kept for parity (nothing external depends on Leaflet methods)

    // Swallow harmless tile-abort noise. When a MapLibre map has no 'error'
    // listener it dumps every event to console.error; tiles whose fetch is
    // aborted mid-flight (common during rapid load/pan, esp. Firefox) surface as
    // InvalidStateError/AbortError from createImageBitmap even though the visible
    // tiles render fine. Ignore those; log anything genuinely unexpected.
    map.on('error', (e) => {
      const err = e && e.error;
      const name = err && err.name;
      const msg = (err && err.message) || '';
      if (name === 'InvalidStateError' || name === 'AbortError' || msg.includes('no longer, usable') || msg.includes('aborted')) {
        return;
      }
      console.error('Map error:', err || e);
    });

    // Shared popups for point layers
    hoverPopupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
    clickPopupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 12 });

    map.on('load', () => {
      // The constructor framed the camera via fitBounds (fractional zoom). Snap
      // to an integer zoom BEFORE any basemap/WMS raster tiles are added, so they
      // load once at native resolution instead of blurry-scaled. The Redux bounds
      // then reconcile through the bounds-sync effect once mapReady flips true.
      snapZoomToInteger();

      const mgr = new MapLayerManager(map);
      mgrRef.current = mgr;
      map.__mgr = mgr;

      ensureMarkerImage();

      // Choose initial basemap: localStorage overrides Redux if present
      let storedBaseMap = null;
      try { storedBaseMap = JSON.parse(localStorage.getItem('basemap')); } catch { storedBaseMap = null; }
      const initialBasemap = (storedBaseMap && storedBaseMap.url) ? storedBaseMap : basemap;
      setSelectedOption(initialBasemap.option);
      selectedOptionRef.current = initialBasemap.option;
      if (storedBaseMap && storedBaseMap.url !== basemap.url) dispatch(setBaseMapLayer(storedBaseMap));
      isBing.current = /bing|ocean-plotter\.spc\.int\/plotter\/cache\/basemap/.test(initialBasemap.url || '');
      setBasemap(initialBasemap);
      currentBasemapUrlRef.current = initialBasemap.url;

      addControls(map);

      map.on('moveend', handleMoveEnd);
      map.on('click', handleBaseClick);

      // Watch sidebar collapse/expand -> resize the map
      const handleSidebarToggle = () => {
        const m = mapRef.current;
        if (!m) return;
        setTimeout(() => { try { m.resize(); } catch {} }, 220);
        setTimeout(() => { try { m.resize(); } catch {} }, 480);
      };
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const cls = mutation.target.classList;
            if (cls.contains('sb-sidenav-toggled') || cls.contains('desktop-sidebar')) { handleSidebarToggle(); break; }
          }
        }
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      map._sidebarObserver = observer;

      // Camera was already framed in the constructor (center/zoom or bounds);
      // no post-load fitBounds here — that is what caused the initial "jump".

      setMapReady(true);
    });

    return () => {
      try {
        if (map._sidebarObserver) map._sidebarObserver.disconnect();
        map.remove();
      } catch (error) {
        console.error('Error removing map:', error);
      }
      isMapInitialized.current = false;
      mgrRef.current = null;
      mapRef.current = null;
      window.mapInstance = null;
    };
  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // React to external basemap changes (restored workbench / share link)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapReady || !mgrRef.current || !basemap || !basemap.url) return;
    if (currentBasemapUrlRef.current === basemap.url) return;
    setBasemap(basemap);
    currentBasemapUrlRef.current = basemap.url;
  }, [basemap, mapReady]);

  // ---------------------------------------------------------------------------
  // Overlay toggles
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const mgr = mgrRef.current;
    if (!mapReady || !mgr) return;
    if (enable_eez) { if (!mgr.hasKey('eez')) addOverlay('eez', eezoverlay.url); }
    else mgr.removeByKey('eez');
  }, [enable_eez, mapReady]);

  useEffect(() => {
    const mgr = mgrRef.current;
    if (!mapReady || !mgr) return;
    if (enable_coastline) { if (!mgr.hasKey('coastline')) addOverlay('coastline', coastlineoverlay.url); }
    else mgr.removeByKey('coastline');
  }, [enable_coastline, mapReady]);

  useEffect(() => {
    const mgr = mgrRef.current;
    if (!mapReady || !mgr) return;
    if (enable_citynames) { if (!mgr.hasKey('pacnames')) addOverlay('pacnames', citynamesoverlay.url); }
    else mgr.removeByKey('pacnames');
  }, [enable_citynames, mapReady]);

  // ---------------------------------------------------------------------------
  // Dataset layers (WMS / COG / point layers). Single source of truth.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current; const mgr = mgrRef.current;
    if (!mapReady || !map || !mgr) return;

    // Remove all dataset content; keep basemap + overlays
    mgr.purgeDatasets();

    if (!layers || layers.length === 0) { setShowTime(false); return; }

    setIsLoading(true);
    layers.forEach((layer) => {
      try {
        const info = layer.layer_information;
        if (!info) return;

        // Temporal parameter selection (same rules as before)
        let dateToDisplay = info.timeIntervalStart;
        if (!info.is_timeseries && !(info.layer_type === 'WMS_FORECAST' || info.layer_type === 'WMS_UGRID')) {
          dateToDisplay = info.timeIntervalEnd;
        }
        const baseType = info.layer_type.replace('_FORECAST', '');

        const addStandardOrComposite = (urlOverride) => {
          if (info.is_composite) {
            const layername = info.layer_name.split(',');
            const stylname = info.style.split(',');
            layername.forEach((ln, idx) => {
              if (!ln) return;
              addWMSTileLayer(map, urlOverride || info.url, {
                id: info.id,
                layers: ln,
                format: 'image/png',
                transparent: true,
                opacity: info.opacity,
                styles: stylname[idx],
                colorscalerange: info.colormin + ', ' + info.colormax,
                abovemaxcolor: info.abovemaxcolor,
                belowmincolor: info.belowmincolor,
                numcolorbands: info.numcolorbands,
                time: dateToDisplay,
                logscale: info.logscale,
              }, handleShow);
            });
          } else {
            addWMSTileLayer(map, urlOverride || info.url, {
              id: info.id,
              layers: info.layer_name,
              format: 'image/png',
              transparent: true,
              opacity: info.opacity,
              styles: info.style,
              colorscalerange: info.colormin + ', ' + info.colormax,
              numcolorbands: info.numcolorbands,
              time: dateToDisplay,
              logscale: info.logscale,
            }, handleShow);
          }
        };

        // COG when requested; otherwise WMS/other types
        if (info.enabled && info.enable_cog && info.cog_params) {
          try {
            addCOGTileLayer(map, info.cog_params, {
              extraParams: { layer_id: info.id, url: info.url, variable: info.layer_name, time: dateToDisplay },
              tileOptions: { opacity: info.opacity, maxNativeZoom: 8 },
              onUrl: (u) => { try { console.debug('COG URL:', u); } catch {} },
            });
          } catch (e) {
            try { console.error('Failed to create COG layer for', info.id, e); } catch {}
          }
          // Do not zoom to the layer's bbox on add — keep the current
          // (region) bbox as the map view.
        } else if (info.enabled) {
          if (baseType === 'WMS') {
            addStandardOrComposite();
          } else if (info.layer_type === 'WMS_UGRID') {
            if (info.is_composite) {
              const layername = info.layer_name.split('%');
              const stylname = info.style.split('%');
              const urls = info.url.split('%');
              addWMSTileLayer(map, urls[0], {
                id: info.id, layers: layername[0], format: 'image/png', opacity: info.opacity, styles: stylname[0],
                colorscalerange: info.colormin + ', ' + info.colormax, abovemaxcolor: info.abovemaxcolor, belowmincolor: info.belowmincolor,
                numcolorbands: info.numcolorbands, time: dateToDisplay, logscale: info.logscale, bgcolor: 'extend',
              }, handleShow);
              addWMSTileLayer(map, urls[1], {
                id: info.id, layers: layername[1], format: 'image/png', transparent: true, opacity: info.opacity, styles: stylname[1],
                colorscalerange: info.colormin + ', ' + info.colormax, abovemaxcolor: info.abovemaxcolor, belowmincolor: info.belowmincolor,
                numcolorbands: info.numcolorbands, time: dateToDisplay, logscale: info.logscale, bgcolor: 'extend',
              }, handleShow);
            } else {
              addWMSTileLayer(map, info.url, {
                id: info.id, layers: info.layer_name, format: 'image/png', opacity: info.opacity, styles: info.style,
                colorscalerange: info.colormin + ', ' + info.colormax, abovemaxcolor: info.abovemaxcolor, belowmincolor: info.belowmincolor,
                numcolorbands: info.numcolorbands, time: dateToDisplay, logscale: info.logscale, bgcolor: 'extend',
              }, handleShow);
            }
          } else if (info.layer_type === 'WMS_HINDCAST') {
            const compositeParts = info.composite_layer_id ? info.composite_layer_id.split('/') : [];
            const d = new Date(info.timeIntervalEnd);
            const yyyy = d.getUTCFullYear();
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            const formattedDate = `${yyyy}${mm}`;
            let newFilename;
            if (compositeParts[1] && compositeParts[1].includes('_')) {
              newFilename = compositeParts[0] + formattedDate + '_' + formattedDate + compositeParts[compositeParts.length - 1];
            } else {
              newFilename = compositeParts[0] + formattedDate + compositeParts[compositeParts.length - 1];
            }
            const urlParts = info.url.split('/');
            urlParts[urlParts.length - 1] = newFilename;
            addStandardOrComposite(urlParts.join('/'));
          } else if (info.layer_type === 'WFS') {
            fetchAndPlotGeoJSON(info.url, info.id);
          } else if (info.layer_type === 'SOFAR') {
            fetchWaveBuoy(info.url, info.id, info.selectedSofarTypes || []);
          } else if (info.layer_type === 'TIDE') {
            fetchAndPlotGeoJSONTIDE(info.url, info.id);
          }

          // Do not zoom to the layer's bbox on add — keep the current
          // (region) bbox as the map view.
        }
      } catch (e) {
        console.error('Dataset layer processing error', e);
      }
    });
    map.once('idle', () => setIsLoading(false));
  }, [layerSignature, layers.length, mapReady]);

  // Purge disabled/removed dataset layers immediately when the layer set changes
  useEffect(() => {
    const mgr = mgrRef.current;
    if (!mapReady || !mgr) return;
    const enabledIds = new Set((layers || []).filter((l) => l?.layer_information?.enabled).map((l) => l.layer_information.id));
    mgr.pruneDisabled(enabledIds);
  }, [layers, mapReady]);

  // When all workbench layers are removed, purge residual dataset layers (keep basemap + overlays)
  useEffect(() => {
    const mgr = mgrRef.current;
    if (!mapReady || !mgr) return;
    if ((layers || []).length === 0) mgr.purgeDatasets();
  }, [layers.length, mapReady]);

  // ---------------------------------------------------------------------------
  // Bounds sync (Redux -> map)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !bounds) return;
    try {
      const { west, east, south, north } = bounds;
      const cur = map.getBounds();
      const areBoundsDifferent =
        Math.abs(cur.getWest() - west) > 0.01 ||
        Math.abs(cur.getEast() - east) > 0.01 ||
        Math.abs(cur.getSouth() - south) > 0.01 ||
        Math.abs(cur.getNorth() - north) > 0.01;
      if (areBoundsDifferent) safeFitBoundsGlobal({ south, west, north, east });
    } catch (error) {
      console.error('Error updating map bounds:', error);
    }
  }, [bounds, mapReady]);

  // ---------------------------------------------------------------------------
  // Sidebar collapse/expand -> resize
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    setIsLoading(true);
    const t = setTimeout(() => { try { map.resize(); } catch {} setIsLoading(false); }, 700);
    return () => clearTimeout(t);
  }, [sidebarCollapsed, rerenderKey, mapReady]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 59px)', position: 'relative' }}>
      {(isLoading || isLoading2) && <Loading />}
      <div
        id="map"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 0,
        }}
      ></div>

      <style>
        {`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          }
        `}
      </style>

      <ShareWorkbench show={showShareModal} onHide={handleHideShareModal} />
    </div>
  );
};

export default MapBox;
