'use client';
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Improved longitude normalization
const normalizeLongitude = (lon) => {
  // Normalize to [-180, 180]
  return ((lon % 360) + 540) % 360 - 180;
};

// Function to adjust coordinates for dateline crossing
const getAdjustedCoordinates = (coordinates) => {
  const [lon, lat] = coordinates;
  const normalizedLon = normalizeLongitude(lon);

  // If the point is near the dateline (within 30 degrees),
  // we'll create two points - one on each side
  if (Math.abs(normalizedLon) > 150) {
    return [
      [normalizedLon, lat],
      [normalizedLon > 0 ? normalizedLon - 360 : normalizedLon + 360, lat]
    ];
  }
  return [[normalizedLon, lat]];
};

const BLUE_ICON_URL = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png';
const GREEN_ICON_URL = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
const SOURCE_ID = 'buoys';
const LAYER_ID = 'buoys-markers';

const RealtimeSearchMap = forwardRef(({ buoyOptions, selectedStations }, ref) => {
  const mapRef = useRef(null);
  const readyRef = useRef(false);
  const buoysRef = useRef(buoyOptions);
  const selectedRef = useRef(selectedStations);
  const popupRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current
  }));

  // Build a GeoJSON FeatureCollection from the current buoys + selection.
  const buildFC = () => {
    const buoys = buoysRef.current || [];
    const selected = selectedRef.current || [];
    const features = [];
    buoys.forEach((buoy) => {
      if (!buoy.coordinates) return;
      const isSelected = selected.includes(buoy.spotter_id);
      getAdjustedCoordinates(buoy.coordinates).forEach(([lon, lat]) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties: {
            buoyId: buoy.spotter_id,
            spotter_id: buoy.spotter_id,
            country_co: buoy.country_co || 'Unknown location',
            is_active: !!buoy.is_active,
            latest_date: buoy.latest_date || 'Unknown',
            selected: isSelected,
            lat,
            lon,
          },
        });
      });
    });
    return { type: 'FeatureCollection', features };
  };

  const refreshData = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource(SOURCE_ID);
    if (src) src.setData(buildFC());
  };

  // Init map once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const map = new maplibregl.Map({
      container: 'realtime-search-map',
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            // MapLibre has no {s} token: expand OSM subdomains explicitly.
            tiles: ['a', 'b', 'c'].map((s) => `https://${s}.tile.openstreetmap.org/{z}/{x}/{y}.png`),
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [160, -15], // Leaflet center [-15, 160] is [lat,lng]
      zoom: 3,
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    try { map.touchZoomRotate.disableRotation(); } catch {}
    try { map.dragRotate.disable(); } catch {}
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

    // Ignore harmless aborted-tile decode noise.
    map.on('error', (e) => {
      const err = e && e.error;
      const name = err && err.name;
      const msg = (err && err.message) || '';
      if (name === 'InvalidStateError' || name === 'AbortError' || msg.includes('no longer, usable') || msg.includes('aborted')) return;
      console.error('RealtimeSearchMap error:', err || e);
    });

    popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 24 });

    const loadIcon = async (name, url) => {
      if (map.hasImage(name)) return;
      try {
        const r = await map.loadImage(url);
        if (r && r.data && !map.hasImage(name)) map.addImage(name, r.data);
      } catch (e) { /* ignore */ }
    };

    map.on('load', async () => {
      await Promise.all([loadIcon('buoy-blue', BLUE_ICON_URL), loadIcon('buoy-green', GREEN_ICON_URL)]);

      map.addSource(SOURCE_ID, { type: 'geojson', data: buildFC() });
      map.addLayer({
        id: LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'icon-image': ['case', ['get', 'selected'], 'buoy-green', 'buoy-blue'],
          'icon-size': 1,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'symbol-sort-key': ['case', ['get', 'selected'], 0, 1], // selected drawn on top
        },
        paint: {
          'icon-opacity': ['case', ['get', 'selected'], 1, 0.8],
        },
      });

      map.on('click', LAYER_ID, (e) => {
        const f = e.features && e.features[0];
        if (!f) return;
        const p = f.properties;
        const lat = Number(p.lat);
        const lon = Number(p.lon);
        const html = `
          <div>
            <strong>${p.spotter_id}</strong><br>
            <small>${p.country_co || 'Unknown location'}</small><br>
            Status: <b>${(p.is_active === true || p.is_active === 'true') ? 'Active' : 'Inactive'}</b><br>
            Last data: ${p.latest_date || 'Unknown'}<br>
            Coordinates: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E
          </div>
        `;
        popupRef.current.setLngLat(f.geometry.coordinates).setHTML(html).addTo(map);
      });
      map.on('mouseenter', LAYER_ID, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', LAYER_ID, () => { map.getCanvas().style.cursor = ''; });

      readyRef.current = true;
      refreshData();
    });

    return () => {
      readyRef.current = false;
      try { map.remove(); } catch {}
      mapRef.current = null;
    };
  }, []);

  // Rebuild markers when the buoy set changes
  useEffect(() => {
    buoysRef.current = buoyOptions;
    refreshData();
  }, [buoyOptions]);

  // Update selection styling when the selected stations change
  useEffect(() => {
    selectedRef.current = selectedStations;
    refreshData();

    // NOTE: fitBounds to selected stations was disabled in the original; kept off.
    // if (selectedStations.length > 0) { ... map.fitBounds(...) }
  }, [selectedStations]);

  return (
    <div
      id="realtime-search-map"
      style={{
        height: '100%',
        width: '100%',
        borderRadius: '0.25rem'
      }}
    />
  );
});

RealtimeSearchMap.displayName = 'RealtimeSearchMap';

export default RealtimeSearchMap;
