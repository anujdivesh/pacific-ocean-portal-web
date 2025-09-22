import L from 'leaflet';
import $ from 'jquery';
import { toast } from 'react-hot-toast'; 

/**
 * Adds a WMS tile layer to a Leaflet map.
 *
 * @param {L.Map} map - The Leaflet map instance to which the WMS layer will be added.
 * @param {string} url - The URL of the WMS service.
 * @param {Object} [options] - Optional parameters for the WMS layer.
 * @param {string} [options.layers] - The layers to request from the WMS service.
 * @param {string} [options.format='image/png'] - The format of the image requested from the WMS service.
 * @param {boolean} [options.transparent=true] - Whether the WMS layer is transparent.
 * @param {Object} [options.params] - Additional parameters to include in the WMS request.
 * @param {function} handleShow - Callback function to handle the "more..." link click.
 */

const addWMSTileLayer = (map, url, options = {}, handleShow) => {
    // Set default options
    const defaultOptions = {
        layers: '',
        format: 'image/png',
        transparent: true,
        ...options.params,
    };

    // Create the WMS tile layer
    const wmsLayer = L.tileLayer.wms(url, {
        layers: defaultOptions.layers,
        format: defaultOptions.format,
        transparent: defaultOptions.transparent,
        zIndex: (typeof options.zIndex === 'number') ? options.zIndex : 400,
        crossOrigin: true,
        ...options,
    });


    // Add the layer to the map
    wmsLayer.addTo(map);

    // Reload broken tiles
    const RETRY_LIMIT = 3; // Maximum number of retry attempts
    const RETRY_DELAY = 3000; // Delay between retries in milliseconds

    const handleTileError = (event) => {
        const tile = event.tile;
        checkUrlExists(tile.src)
            .then(exists => {
                if (exists) {
                    retryTile(tile, tile.src, 1); // Start retrying
                }
            })
            .catch(err => {
                console.error('Error checking tile URL:', err);
            });
    };

    const checkUrlExists = (url) => {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, true);
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    resolve(xhr.status >= 200 && xhr.status < 300);
                }
            };
            xhr.send();
        });
    };

    const retryTile = (tile, src, attempt) => {
        if (attempt <= RETRY_LIMIT) {
            setTimeout(() => {
                tile.src = ''; // Clear src to trigger a reload
                tile.src = src; // Reset src to reload the tile
                retryTile(tile, src, attempt + 1); // Schedule next retry
            }, RETRY_DELAY);
        }
    };

    wmsLayer.on('tileerror', handleTileError);

    // --- Feature info click handler management ---
    // Use a counter on the map instance to track active WMS layers
    if (!map._activeWMSLayerCount) map._activeWMSLayerCount = 0;
    map._activeWMSLayerCount++;

        // Only attach one click handler for GetFeatureInfo per map
        if (!map._wmsFeatureInfoHandlerAttached) {
            map._wmsFeatureInfoHandlerAttached = true;
            map.on('click', function (evt) {
                // Find all visible WMS layers on the map
                const visibleWmsLayers = [];
                map.eachLayer(l => {
                    if (l instanceof L.TileLayer.WMS && map.hasLayer(l)) {
                        visibleWmsLayers.push(l);
                    }
                });
                if (visibleWmsLayers.length === 0) return;
                // Find the topmost visible WMS layer whose layer name does NOT contain 'dir'
                let topNonDirLayer = null;
                for (let i = visibleWmsLayers.length - 1; i >= 0; i--) {
                    const lyr = visibleWmsLayers[i];
                    const layerName = (lyr.options.layers || '').toLowerCase();
                    if (!layerName.includes('dir')) {
                        topNonDirLayer = lyr;
                        break;
                    }
                }
                if (!topNonDirLayer) return; // No non-direction layer found
                const latlng = evt.latlng;
                const layerUrl = topNonDirLayer._url || url;
                getFeatureInfo(latlng, layerUrl, topNonDirLayer, map);
            });
        }

    // Remove the click handler when this layer is removed
    wmsLayer.on('remove', function () {
        map._activeWMSLayerCount = Math.max(0, (map._activeWMSLayerCount || 1) - 1);
        if (map._activeWMSLayerCount === 0 && map._wmsFeatureInfoHandler) {
            map.off('click', map._wmsFeatureInfoHandler);
            map._wmsFeatureInfoHandler = null;
        }
    });

    // Function to retrieve GetFeatureInfo from WMS
    const getFeatureInfo = (latlng, url, wmsLayer, map) => {
        const point = map.latLngToContainerPoint(latlng, map.getZoom());
        const size = map.getSize();

        // Construct the GetFeatureInfo URL
        const params = {
            request: 'GetFeatureInfo',
            service: 'WMS',
            srs: 'EPSG:4326',
            styles: wmsLayer.options.styles,
            transparent: wmsLayer.options.transparent,
            version: wmsLayer.options.version || '1.1.1',
            format: wmsLayer.options.format,
            bbox: map.getBounds().toBBoxString(),
            height: Math.round(size.y),
            width: Math.round(size.x),
            layers: wmsLayer.options.layers,
            query_layers: wmsLayer.options.layers,
            info_format: 'text/html',
        };

        params[params.version === '1.3.0' ? 'i' : 'x'] = Math.round(point.x);
        params[params.version === '1.3.0' ? 'j' : 'y'] = Math.round(point.y);

        var featureInfoUrl = url + L.Util.getParamString(params, url, true);
        featureInfoUrl = featureInfoUrl.replace(/wms\?.*?REQUEST=[^&]*?&.*?REQUEST=[^&]*?&/, '');
        // Remove VERSION=1.3.0&
        featureInfoUrl = featureInfoUrl.replace(/VERSION=1\.3\.0&/g, '');

        // Fix: Insert '/wms?' after '/ncWMS' ONLY if not already present
        featureInfoUrl = featureInfoUrl.replace(/\/ncWMS\/?(?!wms\?)/i, '/ncWMS/wms?REQUEST=GetFeatureInfo&');

        // Perform the AJAX request to get the feature info
        $.ajax({
            url: featureInfoUrl,
            success: function (data) {
                const doc = (new DOMParser()).parseFromString(data, "text/html");
                if (doc.body.innerHTML.trim().length > 0) {
                    showFeatureInfoPopup(doc.body.innerHTML, latlng, map, options.id, handleShow);
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
            }
        });
    };

    // Function to show the feature info in a popup
    const showFeatureInfoPopup = (content, latlng, map, id, handleShow) => {
        const el = document.createElement('html');
        el.innerHTML = content;



        // Extract variable name (assume in p[3] if table structure is standard)
        const p = el.getElementsByTagName('td');
        let variableName = "Value";
        let featureInfo = "No Data";
        if (p.length > 5) {
            variableName = p[0] ? p[0].textContent.trim() : "Value";
            featureInfo = p[5] ? p[5].textContent.trim() : "No Data";
            // Try to convert to number and format to 2 decimal places if it's a valid number
            const num = Number(featureInfo);
            if (!isNaN(num)) {
                featureInfo = num.toFixed(2);
            }
        }

        // Create popup content with variable name
        const popupContent = `
            <p>${variableName}: ${featureInfo}</p>
        `;

        // Show the popup
        const popup = L.popup({ maxWidth: 800 })
            .setLatLng(latlng)
            .setContent(popupContent)
            .openOn(map);

        // Attach event listener to the link inside the popup
        const link = popup._contentNode.querySelector('.open-timeseries-link');
        if (link) {
            link.addEventListener('click', () => {
                handleShow(id); // Pass the id to handleShow
            });
        }
    };

    return wmsLayer; // Return the layer instance
};

export default addWMSTileLayer;