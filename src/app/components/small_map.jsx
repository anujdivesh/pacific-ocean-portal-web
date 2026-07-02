"use client" // client side rendering
import React, { useEffect, useState, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { withBasePath } from '@/app/lib/basePath';
import { useAppSelector, useAppDispatch } from '@/app/GlobalRedux/hooks';
import { hideModal } from '@/app/GlobalRedux/Features/modal/modalSlice';
import { setBounds, addMapLayer } from '@/app/GlobalRedux/Features/map/mapSlice';
import { get_url } from './urls';
import Lottie from 'lottie-react';
import GlobeAnim from './lottie/Globe.json';

const SmallMap = ({ currentDataset }) => {
  // Redux state
  const { bounds } = useAppSelector((state) => state.mapbox);
  const { short_name } = useAppSelector((state) => state.country);
  const layer_workbench = useAppSelector((state) => state.mapbox.layers);
  const dataset_list = useAppSelector((state) => state.dataset_list.value);
  const token = useAppSelector((state) => state.auth.token);
  const dispatch = useAppDispatch();

  // Local state / refs
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const mapContainer2 = useRef(null);
  const mapInstance = useRef(null);
  const current_dataset_ref = useRef(null);
  const mlRef = useRef(null);          // holds maplibre-gl module after dynamic import
  const latestDsRef = useRef(null);    // latest dataset_list for deferred (post-load) bbox draw

  // Warning helper
  const warnExists = () => {
    setError('*Warning: Layer exists in the workbench');
    setTimeout(() => setError(''), 4000);
  };

  // Add to Map
  const handleAddToMap = () => {
    if (!currentDataset || !currentDataset.id) {
      setError('No dataset selected');
      setTimeout(() => setError(''), 2500);
      return;
    }
    const exists = layer_workbench.some(l => String(l.id) === String(currentDataset.id));
    if (exists) {
      warnExists();
      return;
    }
    setIsLoading(true);
    fetchData(currentDataset, currentDataset.layer_information, token)
      .finally(() => setIsLoading(false));
  };

  // Dynamic MapLibre init + dataset bbox updates
  useEffect(() => {
    let cancelled = false;
    latestDsRef.current = dataset_list;
    (async () => {
      if (typeof window === 'undefined') return;
      if (!mlRef.current) {
        const mod = await import('maplibre-gl');
        if (cancelled) return;
        mlRef.current = mod.default || mod;
      }
      if (!mapInstance.current && mapContainer2.current) {
        initMap();
      }
      applyBBox(latestDsRef.current);
    })();
    return () => { cancelled = true; };
  }, [dataset_list, currentDataset, token]);

  // Cleanup map on unmount
  useEffect(() => () => {
    if (mapInstance.current) {
      try { mapInstance.current.remove(); } catch {}
      mapInstance.current = null;
    }
  }, []);

  // --- Helper functions ---
  // Draw / update the dataset bounding box and fit to it.
  const applyBBox = (ds) => {
    const map = mapInstance.current;
    if (!map || !ds || !map.__ready) return; // load handler re-applies once ready

    // Remove previous bbox
    ['bbox-fill', 'bbox-line'].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
    if (map.getSource('bbox')) map.removeSource('bbox');

    if (!ds.has_bbox) return;
    current_dataset_ref.current = ds;

    const west = ds.west_bound_longitude;
    const east = ds.east_bound_longitude;
    const south = ds.south_bound_latitude;
    const north = ds.north_bound_latitude;

    const poly = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
      },
    };
    map.addSource('bbox', { type: 'geojson', data: poly });
    map.addLayer({ id: 'bbox-fill', type: 'fill', source: 'bbox', paint: { 'fill-color': '#FF5733', 'fill-opacity': 0.2 } });
    map.addLayer({ id: 'bbox-line', type: 'line', source: 'bbox', paint: { 'line-color': '#FF5733', 'line-width': 3 } });

    const W = Math.min(west, east), E = Math.max(west, east);
    const S = Math.min(south, north), N = Math.max(south, north);
    try { map.fitBounds([[W, S], [E, N]], { animate: false, padding: 20 }); } catch {}
  };

  const fetchData = async (dataset, id, tokenVal) => {
    try {
      const url = get_url('layer', id);
      const headers = tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {};
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) {
        console.error('Fetch error', response.status, response.statusText);
        return;
      }
      const data = await response.json();
      data.timeIntervalStartOriginal = data.timeIntervalStart;
      data.timeIntervalEndOriginal = data.timeIntervalEnd;
      // Prefix the layer title with the root accordion name: "Root | Title"
      if (dataset.root_title && data.layer_title) {
        data.layer_title = `${dataset.root_title} | ${data.layer_title}`;
      }
      const jsonWithParent = {
        id: dataset.id,
        south_bound_latitude: dataset.south_bound_latitude,
        east_bound_longitude: dataset.east_bound_longitude,
        north_bound_latitude: dataset.north_bound_latitude,
        west_bound_longitude: dataset.west_bound_longitude,
        layer_information: data,
      };
      const datasetBox = {
        west: dataset.west_bound_longitude,
        east: dataset.east_bound_longitude,
        south: dataset.south_bound_latitude,
        north: dataset.north_bound_latitude
      };
      const inside = bounds && datasetBox.west >= bounds.west && datasetBox.east <= bounds.east && datasetBox.south >= bounds.south && datasetBox.north <= bounds.north;

      dispatch(addMapLayer(jsonWithParent));
      if (short_name == 1 || inside) {
        dispatch(setBounds({
          west: dataset.west_bound_longitude,
          east: dataset.east_bound_longitude,
          south: dataset.south_bound_latitude,
          north: dataset.north_bound_latitude
        }));
      }
      // Dismiss modal after layer added & bounds possibly updated
      dispatch(hideModal());
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  };

  const initMap = () => {
    const maplibregl = mlRef.current;
    if (!maplibregl || !mapContainer2.current) return;

    const map = new maplibregl.Map({
      container: mapContainer2.current,
      style: { version: 8, sources: {}, layers: [] },
      center: [179.3053, -8], // Leaflet center [-8, 179.3053] is [lat,lng]
      zoom: 2,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      // spc-osm sends no CORS headers, so route its tiles through the same-origin proxy.
      transformRequest: (url, resourceType) => {
        if ((resourceType === 'Tile' || resourceType === 'Image') && /^https?:\/\//i.test(url)
          && url.includes('spc-osm.spc.int') && !url.includes('/api/proxy-tile')) {
          return { url: `${window.location.origin}${withBasePath('/api/proxy-tile')}?url=${encodeURIComponent(url)}` };
        }
        return { url };
      },
    });
    mapInstance.current = map;
    try { map.touchZoomRotate.disableRotation(); } catch {}
    try { map.dragRotate.disable(); } catch {}

    // Ignore harmless aborted-tile decode noise (see get_map.jsx).
    map.on('error', (e) => {
      const err = e && e.error;
      const name = err && err.name;
      const msg = (err && err.message) || '';
      if (name === 'InvalidStateError' || name === 'AbortError' || msg.includes('no longer, usable') || msg.includes('aborted')) return;
      console.error('SmallMap error:', err || e);
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    map.addControl(new maplibregl.AttributionControl({
      compact: false,
      customAttribution: '<a href="https://www.spc.int/" target="_blank">SPC</a> | &copy; Pacific Community SPC',
    }), 'bottom-right');

    map.on('load', () => {
      map.addSource('basemap', { type: 'raster', tiles: ['https://spc-osm.spc.int/tile/{z}/{x}/{y}.png'], tileSize: 256 });
      map.addLayer({ id: 'basemap', type: 'raster', source: 'basemap' });
      map.__ready = true;
      applyBBox(latestDsRef.current);
    });
  };

  // --- Render ---
  return (
    <div className="small-map-outer" style={{ position: 'relative' }}>
      {isLoading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', zIndex: 1200 }}>
          <Lottie
            animationData={GlobeAnim}
            loop
            autoplay
            style={{ width: 100, height: 100, opacity: 0.95 }}
            aria-label="Loading"
          />
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', top: 8, left: 8, background: '#fff', padding: '4px 8px', borderRadius: 4, color: '#b91c1c', fontSize: 12, zIndex: 1300, boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
          {error}
        </div>
      )}
      <div ref={mapContainer2} id="map2" className="small-map-container" style={{ width: '100%', height: '200px', zIndex: 0, borderRadius: 8, overflow: 'hidden', position: 'relative' }} />
      {currentDataset?.id && (
        <button
          type="button"
          onClick={handleAddToMap}
          aria-label="Add to Map"
          className="pulse-btn"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1400,
            background: '#2563eb',
            color: '#fff',
            border: '1px solid #1d4ed8',
            borderRadius: 9999,
            padding: '8px 14px',
            fontSize: 12,
              fontWeight: 600,
            cursor: 'pointer',
            lineHeight: 1.1,
            boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
            userSelect: 'none'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1d4ed8')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#2563eb')}
        >
          Add to Map
        </button>
      )}
      <style jsx>{`
        .pulse-btn {
          animation: pulseRing 1.8s ease-out infinite;
          transform-origin: center;
        }
        .pulse-btn:focus-visible {
          outline: 2px solid #93c5fd;
          outline-offset: 2px;
          border-radius: 9999px;
        }
        @keyframes pulseRing {
          0% {
            box-shadow: 0 4px 10px rgba(0,0,0,0.35), 0 0 0 0 rgba(37, 99, 235, 0.6);
            transform: scale(1);
          }
          70% {
            box-shadow: 0 4px 10px rgba(0,0,0,0.35), 0 0 0 12px rgba(37, 99, 235, 0);
            transform: scale(1.04);
          }
          100% {
            box-shadow: 0 4px 10px rgba(0,0,0,0.35), 0 0 0 0 rgba(37, 99, 235, 0);
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default SmallMap;
