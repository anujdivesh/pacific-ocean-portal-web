"use client" // client side rendering 
import React, { useEffect, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
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
  const bboxLayerRef = useRef(null);
  const LRef = useRef(null); // holds Leaflet module after dynamic import

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

  // Dynamic Leaflet init + dataset bbox updates
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === 'undefined') return;
      if (!LRef.current) {
        const mod = await import('leaflet');
        if (cancelled) return;
        LRef.current = mod.default || mod;
      }
      if (!mapInstance.current && mapContainer2.current) {
        if (mapContainer2.current._leaflet_id) delete mapContainer2.current._leaflet_id; // safety
        initMap();
      }
      if (mapInstance.current) {
        addOrUpdateBBox(dataset_list);
      }
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
  const addBBox = (map, bbox) => {
    const L = LRef.current;
    if (!L) return null;
    const rect = L.rectangle(bbox, { color: '#FF5733', weight: 3, id: 1 }).addTo(map);
    map.fitBounds(bbox);
    return rect;
  };

  const addOrUpdateBBox = (ds) => {
    if (!mapInstance.current || !ds) return;
    const map = mapInstance.current;
    // Remove previous bbox rectangle(s)
    map.eachLayer(l => {
      if (l?.options?.id === 1) map.removeLayer(l);
    });
    if (ds.has_bbox) {
      current_dataset_ref.current = ds;
      bboxLayerRef.current = addBBox(map, [
        [ds.south_bound_latitude, ds.east_bound_longitude],
        [ds.north_bound_latitude, ds.west_bound_longitude]
      ]);
    }
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
    const L = LRef.current;
    if (!L || !mapContainer2.current) return;
    mapInstance.current = L.map(mapContainer2.current, {
      zoom: 2,
      center: [-8, 179.3053],
      attributionControl: false
    });
    mapInstance.current.attributionControl = L.control.attribution({
      prefix: '<a href="https://www.spc.int/" target="_blank">SPC</a> | &copy; Pacific Community SPC'
    }).addTo(mapInstance.current);
    L.tileLayer('https://spc-osm.spc.int/tile/{z}/{x}/{y}.png', { detectRetina: true }).addTo(mapInstance.current);
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
