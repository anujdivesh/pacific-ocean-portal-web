import { get_url } from './urls';
import LZString from 'lz-string';

/**
 * Load shared workbench state from URL parameters
 * @param {string} shareParam - The encoded share parameter from URL
 * @returns {Object|null} - The workbench state or null if not found
 */
export const loadSharedWorkbench = (shareParam) => {
  try {
    if (!shareParam) {
      console.warn('No share parameter provided');
      return null;
    }

    console.log('Loading shared workbench with parameter:', shareParam.substring(0, 50) + '...');

    // Decompress and decode the workbench state
    const workbenchState = decompressWorkbenchState(shareParam);
    
    if (!workbenchState) {
      console.error('Failed to decompress workbench state');
      return null;
    }

    console.log('Successfully decompressed workbench state:', workbenchState);

    // Validate the state structure
    if (!workbenchState || !workbenchState.layers || !Array.isArray(workbenchState.layers)) {
      console.error('Invalid workbench state structure');
      return null;
    }

    return workbenchState;
  } catch (error) {
    console.error('Error loading shared workbench:', error);
    return null;
  }
};

/**
 * Decompress workbench state from URL parameter
 * @param {string} compressedState - The compressed state from URL
 * @returns {Object|null} - The decompressed workbench state
 */
const decompressWorkbenchState = (compressedState) => {
  try {
    let jsonString;
    
    // Try LZ-string decompression first
    try {
      jsonString = LZString.decompressFromEncodedURIComponent(compressedState);
      if (jsonString) {
        return JSON.parse(jsonString);
      }
    } catch (error) {
      console.warn('LZ-string decompression failed, trying base64:', error);
    }
    
    // Fallback to base64 decoding
    try {
      jsonString = decodeURIComponent(escape(atob(compressedState)));
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Base64 decoding failed:', error);
      return null;
    }
  } catch (error) {
    console.error('Error decompressing workbench state:', error);
    return null;
  }
};

/**
 * Restore workbench state to Redux store
 * @param {Object} workbenchState - The workbench state to restore
 * @param {Function} dispatch - Redux dispatch function
 * @returns {Promise<boolean>} - Success status
 */
export const restoreWorkbenchState = async (workbenchState, dispatch) => {
  try {
    // Import all required actions
    const mapSlice = await import('@/app/GlobalRedux/Features/map/mapSlice');
  const offcanvasSlice = await import('@/app/GlobalRedux/Features/offcanvas/offcanvasSlice');
    const countrySlice = await import('@/app/GlobalRedux/Features/country/countrySlice');
    const coordinateSlice = await import('@/app/GlobalRedux/Features/coordinate/mapSlice');

    // Clear existing layers first
    dispatch(mapSlice.removeAllMapLayer());

    // Restore map state
    if (workbenchState.map) {
      if (workbenchState.map.center) {
        dispatch(mapSlice.setCenter(workbenchState.map.center));
      }
      if (workbenchState.map.zoom) {
        dispatch(mapSlice.setZoom(workbenchState.map.zoom));
      }
      if (workbenchState.map.bounds) {
        dispatch(mapSlice.setBounds(workbenchState.map.bounds));
      }
    }

    // Restore region
    if (workbenchState.region) {
      dispatch(countrySlice.setShortName(workbenchState.region));
    }

    // Restore layers
    if (workbenchState.layers && workbenchState.layers.length > 0) {
               for (const layer of workbenchState.layers) {
           try {
             // Use the saved layer information directly to ensure we restore the exact same layer
             const restoredLayer = {
               ...layer,
               layer_information: {
                 ...layer.layer_information,
                 // Ensure the enabled state is properly restored from the saved state
                 enabled: layer.layer_information.enabled || layer.enabled || false,
                 selectedSofarTypes: layer.layer_information.selectedSofarTypes || layer.selectedSofarTypes || [],
                 // Ensure all essential properties are present
                 timeIntervalStart: layer.layer_information.timeIntervalStart || null,
                 timeIntervalEnd: layer.layer_information.timeIntervalEnd || null,
                 timeIntervalStartOriginal: layer.layer_information.timeIntervalStartOriginal || null,
                 timeIntervalEndOriginal: layer.layer_information.timeIntervalEndOriginal || null,
                 is_timeseries: layer.layer_information.is_timeseries || false,
                 is_composite: layer.layer_information.is_composite || false,
                 datetime_format: layer.layer_information.datetime_format || null,
                 restricted: layer.layer_information.restricted || false,
                 timeseries_url: layer.layer_information.timeseries_url || null,
                 composite_layer_id: layer.layer_information.composite_layer_id || null,
               },
               opacity: layer.opacity || 1,
             };

             // Fallback: generate a basic WMS legend URL if missing
             try {
               const li = restoredLayer.layer_information || {};
               const type = (li.layer_type || '').toUpperCase();
               if (!li.legend_url && type.startsWith('WMS')) {
                 const base = li.url || '';
                 const hasQuery = base.includes('?');
                 const layerName = li.layer_name || '';
                 const style = li.style || '';
                 if (base && layerName) {
                   const qs = new URLSearchParams({
                     SERVICE: 'WMS',
                     REQUEST: 'GetLegendGraphic',
                     FORMAT: 'image/png',
                     LAYER: layerName,
                   });
                   if (style) qs.set('STYLE', style);
                   const sep = hasQuery ? '&' : '?';
                   restoredLayer.layer_information.legend_url = `${base}${sep}${qs.toString()}`;
                 }
               }
             } catch {}

             console.log(`Restoring layer ${layer.id}:`, {
               title: restoredLayer.layer_information.layer_title,
               enabled: restoredLayer.layer_information.enabled,
               selectedSofarTypes: restoredLayer.layer_information.selectedSofarTypes,
               layerType: restoredLayer.layer_information.layer_type,
               is_timeseries: restoredLayer.layer_information.is_timeseries,
               datetime_format: restoredLayer.layer_information.datetime_format,
               timeIntervalStart: restoredLayer.layer_information.timeIntervalStart,
               timeIntervalEnd: restoredLayer.layer_information.timeIntervalEnd,
               opacity: restoredLayer.opacity
             });

             dispatch(mapSlice.addMapLayer(restoredLayer));
           } catch (error) {
             console.error(`Error restoring layer ${layer.id}:`, error);
             // Still add the layer with existing info
             dispatch(mapSlice.addMapLayer(layer));
           }
      }
    }

    // Restore coordinates state (selected marker)
    if (workbenchState.coordinates) {
      console.log(`Restoring coordinates:`, workbenchState.coordinates);
      dispatch(coordinateSlice.setCoordinates(workbenchState.coordinates));
    }

    // Restore offcanvas state
    if (workbenchState.offCanvas) {
      // Restore selected bottom tab if provided
      if (workbenchState.offCanvas.selectedTabKey) {
        dispatch(offcanvasSlice.setSelectedTab(workbenchState.offCanvas.selectedTabKey));
      }
      if (workbenchState.offCanvas.isVisible && workbenchState.offCanvas.currentId) {
        dispatch(offcanvasSlice.showoffCanvas(workbenchState.offCanvas.currentId));
      } else {
        dispatch(offcanvasSlice.hideoffCanvas());
      }
    }

    // Save to localStorage for persistence
    const layersToSave = workbenchState.layers.map(layer => ({
      id: layer.id,
      layer_information: layer.layer_information,
    }));
    localStorage.setItem('savedLayers', JSON.stringify(layersToSave));

    return true;
  } catch (error) {
    console.error('Error restoring workbench state:', error);
    return false;
  }
};

/**
 * Extract share parameter from URL parameters
 * @returns {string|null} - The share parameter or null if not found
 */
export const getShareIdFromUrl = () => {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('share');
};

/**
 * Clean up URL by removing share parameter
 */
export const cleanupShareUrl = () => {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location);
  url.searchParams.delete('share');
  
  // Update URL without reloading the page
  window.history.replaceState({}, '', url.toString());
};

/**
 * Check if current URL has a share parameter
 * @returns {boolean}
 */
export const hasShareParameter = () => {
  return getShareIdFromUrl() !== null;
}; 