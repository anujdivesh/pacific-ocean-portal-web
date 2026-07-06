import { createSlice } from '@reduxjs/toolkit';
// Removed Leaflet import to avoid SSR (window is not defined) errors. Any Leaflet usage should live in client components.
import { get_url } from '@/app/components/urls';

// Default Pacific-wide bounds — matches the "Pacific Islands" region (id=1).
// Used when no region has been selected yet (first-ever visit).
const DEFAULT_BOUNDS = { west: 110, east: 260, south: -45, north: 45 };

// Read cached bounds from localStorage so the map can initialize at the correct
// viewport immediately, avoiding the visible "jump" that occurs when the sidebar
// fetches regions asynchronously and dispatches setBounds after mount.
// Falls back to DEFAULT_BOUNDS so the map ALWAYS opens from region bounds,
// never from an arbitrary center/zoom.
function getInitialBounds() {
  if (typeof window === 'undefined') return DEFAULT_BOUNDS;
  try {
    const cached = localStorage.getItem('selectedRegionBounds');
    if (cached) return JSON.parse(cached);
  } catch {}
  return DEFAULT_BOUNDS;
}

const mapSlice = createSlice({
  name: 'mapbox',
  initialState: {
    zoom: 4,
    center: [-8, 179.3053],
    bounds: getInitialBounds(),
    layers: [],
    rerenderKey: 0,
    basemap: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      //url: 'https://ocean-plotter.spc.int/plotter/cache/basemap/{z}/{x}/{y}.png',
      attribution: '&copy; Pacific Community SPC',
      dataLimit: 100, // Default data limit,
      option:'bing'
    },
    eezoverlay: {
      url: "https://ocean-plotter.spc.int/plotter/proxy?url=https://geonode.pacificdata.org/geoserver/gwc/service/tms/1.0.0/geonode:global_eez_200nm@EPSG:3857@pbf/{z}/{x}/{-y}.png",
      layer: 'geonode:global_eez_200nm',
    },
    coastlineoverlay: {
      url:"https://ocean-plotter.spc.int/plotter/proxy?url=https://geonode.pacificdata.org/geoserver/gwc/service/tms/1.0.0/geonode:pac_coastline@EPSG:3857@pbf/{z}/{x}/{-y}.png",
      layer: 'geonode:pacific_coastlines',
    },
    citynamesoverlay: {
      url:"https://ocean-plotter.spc.int/plotter/proxy?url=https://geonode.pacificdata.org/geoserver/gwc/service/tms/1.0.0/geonode:pacific_names@EPSG:3857@pbf/{z}/{x}/{-y}.png",
      layer: 'geonode:pacific_names',
    },
    /*
    citynamesoverlay: {
      url: 'https://opmgeoserver.gem.spc.int/geoserver/spc/wms',
      //url: get_url('geowebcache')+'/pacificnames/geoserver/spc/wms',
      layer: '	spc:osm_pacific_islands_2',
    },*/
    enable_eez: true,
    enable_coastline: true,
    enable_citynames: true,
    sidebarCollapsed: false,
    dataLimit: 100
  },
  reducers: {
    setDataLimit(state, action) {
      state.dataLimit = action.payload;
    },
    triggerMapRerender(state) {
      state.rerenderKey += 1;
    },
	
    setCenter(state, action) {
      state.center = action.payload;
    },
    setZoom(state, action) {
      state.zoom = action.payload;
    },
    setBounds(state, action) {
      state.bounds = action.payload;
    },
    setBaseMapLayer(state, action) {
      state.basemap = action.payload; // Add new layer to state
    },
    setOverlayLayer(state, action) {
      state.eezoverlay = action.payload; // Add new layer to state
    },
    setCoastlineLayer(state, action) {
      state.coastlineoverlay = action.payload; // Add new layer to state
    },
    setCoastlineEnable(state, action) {
      state.enable_coastline = action.payload; // Add new layer to state
    },
    setCityNameLayer(state, action) {
      state.citynamesoverlay = action.payload; // Add new layer to state
    },
    setCityNameEnable(state, action) {
      state.enable_citynames = action.payload; // Add new layer to state
    },
    setEEZEnable(state, action) {
      state.enable_eez = action.payload; // Add new layer to state
    },
    addMapLayer(state, action) {
        // Prevent duplicate layers by id
        const exists = state.layers.some(layer => layer.id === action.payload.id);
        if (!exists) {
            state.layers.push(action.payload); // Add new layer to state
        }
      },
    removeMapLayer(state, action) {
        state.layers = state.layers.filter(layer => layer.id !== action.payload.id); // Remove layer by id
    },
    removeAllMapLayer: (state) => {
      state.layers = []; // Clears all layers
    },
    removeDuplicateLayers: (state) => {
      // Remove duplicate layers by keeping only the first occurrence of each id
      const uniqueLayers = [];
      const seenIds = new Set();
      
      state.layers.forEach(layer => {
        if (!seenIds.has(layer.id)) {
          seenIds.add(layer.id);
          uniqueLayers.push(layer);
        }
      });
      
      state.layers = uniqueLayers;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    updateMapLayer(state, action) {
      const { id, updates } = action.payload;
      // Produce a brand-new array reference so selectors depending on `layers` re-run
      state.layers = state.layers.map(layer => 
        layer.id === id ? { ...layer, ...updates } : layer
      );
    },
    handleStationSearchKeyDown(state, action) {
      const e = action.payload;
      switch (e.key) {
        case 'ArrowDown': // Navigate down
        case 'ArrowUp':   // Navigate up  
        case 'Enter':     // Select highlighted or search
        case 'Escape':    // Close dropdown
      }
    },
    selectStation(state, action) {
      // payload: { lat, lng } — pass coordinates directly, not a Leaflet marker
      const { lat, lng } = action.payload;
      state.center = [lat, lng];
      state.zoom = 12;

      // Set bounds around the station
      const buffer = 0.1; // 0.1 degree buffer
      state.bounds = {
        west: lng - buffer,
        east: lng + buffer,
        south: lat - buffer,
        north: lat + buffer,
      };
    }
  },
});

export const { setCenter, setZoom, setBounds, addMapLayer, removeMapLayer,updateMapLayer,setBaseMapLayer,setOverlayLayer,setEEZEnable,setCoastlineLayer,setCoastlineEnable,setCityNameLayer,setCityNameEnable,removeAllMapLayer,removeDuplicateLayers,toggleSidebar,setSidebarCollapsed, handleStationSearchKeyDown, selectStation, setDataLimit,triggerMapRerender } = mapSlice.actions;
export default mapSlice.reducer;