"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { useAppSelector } from '@/app/GlobalRedux/hooks';
import { FaCopy, FaLink, FaCompress } from 'react-icons/fa';
import GetMapIcon from './GetMapIcon';
import { get_url } from './urls';
import LZString from 'lz-string';

const ShareWorkbench = ({ show, onHide }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [shortenedUrl, setShortenedUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isShortening, setIsShortening] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  // Only auto-shorten very long URLs above this length
  const AUTO_SHORTEN_THRESHOLD = 2000;
  
  // Get current workbench state from Redux
  const mapLayers = useAppSelector((state) => state.mapbox.layers);
  const mapCenter = useAppSelector((state) => state.mapbox.center);
  const mapZoom = useAppSelector((state) => state.mapbox.zoom);
  const mapBounds = useAppSelector((state) => state.mapbox.bounds);
  const isOffCanvasVisible = useAppSelector((state) => state.offcanvas.isVisible);
  const currentOffCanvasId = useAppSelector((state) => state.offcanvas.currentId);
  const selectedRegion = useAppSelector((state) => state.country.short_name);
  const selectedTabKey = useAppSelector((state) => state.offcanvas.selectedTabKey);
  const selectedCoordinates = useAppSelector((state) => state.coordinate.coordinates);

  // Generate fresh link when modal opens
  useEffect(() => {
    if (show && mapLayers.length > 0) {
      // Clear previous URL and generate fresh one
      setShareUrl('');
      setShortenedUrl('');
      setError('');
      setIsCopied(false);
      // Defer heavy work so the modal can paint and remain responsive.
      const t = setTimeout(() => {
        generateShareUrl();
      }, 50);
      return () => clearTimeout(t);
    } else if (!show) {
      // Clear URL when modal closes
      setShareUrl('');
      setShortenedUrl('');
      setError('');
      setIsCopied(false);
    }
  }, [show]);

  // Track mounted state to avoid setting state after unmount
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const generateShareUrl = async () => {
    if (mapLayers.length === 0) {
      setError('No data layers to share. Please add some data to your workbench first.');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // Prepare the workbench state for sharing
      const workbenchState = {
                          layers: mapLayers.map(layer => {
            // Only save essential layer information to reduce URL size
           console.log(`Original layer data for ${layer.id}:`, {
             interval_step: layer.layer_information.interval_step,
             timeIntervalStartOriginal: layer.layer_information.timeIntervalStartOriginal,
             timeIntervalEndOriginal: layer.layer_information.timeIntervalEndOriginal,
             period: layer.layer_information.period,
             enable_get_map: layer.layer_information.enable_get_map
           });
           const layerState = {
            id: layer.id,
            // Save a curated set of layer_information fields to avoid reintroducing
            // any very large nested properties (tile data, large arrays, etc.).
            layer_information: {
              id: layer.layer_information.id,
              layer_title: layer.layer_information.layer_title,
              layer_type: layer.layer_information.layer_type,
              url: layer.layer_information.url,
              // Legend image URL so legends restore correctly from shared links
              legend_url: layer.layer_information.legend_url || null,
              enabled: layer.layer_information?.enabled || false,
              selectedSofarTypes: layer.layer_information?.selectedSofarTypes || [],
              // Date and time properties
              specific_timestemps: layer.layer_information.specific_timestemps || null,
              interval_step: layer.layer_information.interval_step || null,
              period: layer.layer_information.period || null,
              timeIntervalStart: layer.layer_information.timeIntervalStart || null,
              timeIntervalEnd: layer.layer_information.timeIntervalEnd || null,
              timeIntervalStartOriginal: layer.layer_information.timeIntervalStartOriginal || null,
              timeIntervalEndOriginal: layer.layer_information.timeIntervalEndOriginal || null,
              is_timeseries: layer.layer_information.is_timeseries || false,
              is_composite: layer.layer_information.is_composite || false,
              // Layer properties
              layer_name: layer.layer_information.layer_name || '',
              style: layer.layer_information.style || '',
              opacity: layer.layer_information.opacity || 1,
              // Color scale properties
              colormin: layer.layer_information.colormin || 0,
              colormax: layer.layer_information.colormax || 1,
              abovemaxcolor: layer.layer_information.abovemaxcolor || 'extend',
              belowmincolor: layer.layer_information.belowmincolor || 'transparent',
              numcolorbands: layer.layer_information.numcolorbands || 250,
              logscale: layer.layer_information.logscale || false,
              // Map properties
              zoomToLayer: layer.layer_information.zoomToLayer || false,
              // Additional properties that might be needed
              datetime_format: layer.layer_information.datetime_format || null,
              restricted: layer.layer_information.restricted || false,
              timeseries_url: layer.layer_information.timeseries_url || null,
              composite_layer_id: layer.layer_information.composite_layer_id || null,
              enable_get_map: layer.layer_information.enable_get_map || false,
            },
            enabled: layer.layer_information?.enabled || false,
            opacity: layer.opacity || 1,
            selectedSofarTypes: layer.layer_information?.selectedSofarTypes || [],
          };
          
                     console.log(`Sharing layer:`, {
             id: layerState.id,
             title: layerState.layer_information.layer_title,
             type: layerState.layer_information.layer_type,
             enabled: layerState.layer_information.enabled,
             enable_get_map: layerState.layer_information.enable_get_map,
             period: layerState.layer_information.period,
             interval_step: layerState.layer_information.interval_step,
             timeIntervalStartOriginal: layerState.layer_information.timeIntervalStartOriginal,
             timeIntervalEndOriginal: layerState.layer_information.timeIntervalEndOriginal,
             selectedSofarTypes: layerState.selectedSofarTypes
           });
          
          // console.log(`Sharing coordinates:`, selectedCoordinates);
          
          return layerState;
        }),
        map: {
          center: mapCenter,
          zoom: mapZoom,
          bounds: mapBounds,
        },
        offCanvas: {
          isVisible: isOffCanvasVisible,
          currentId: currentOffCanvasId,
          selectedTabKey: selectedTabKey || 'tab4',
        },
        coordinates: selectedCoordinates,
        region: selectedRegion,
        timestamp: new Date().toISOString(),
      };

  // Compress and encode the workbench state (non-blocking)
  const compressedState = await compressWorkbenchState(workbenchState);
      
             // Check if the URL would be too long (browsers have URL length limits)
       const baseUrl = window.location.origin + window.location.pathname;
       const url = `${baseUrl}?share=${compressedState}`;
       
       console.log(`URL length: ${url.length} characters`);
       
       if (url.length > 8000) {
         setError('The workbench configuration is too large to share via URL. Please reduce the number of layers or simplify the configuration.');
         return;
       }
      
  // If URL is very long, trigger auto-shortening in background to avoid
  // blocking the UI. We set a local flag so the UI can show a spinner
  // if desired while the shortener runs.
  if (isMounted.current) setShareUrl(url);
      if (url.length > AUTO_SHORTEN_THRESHOLD) {
        if (isMounted.current) setIsShortening(true);
        // Fire-and-forget the network shortening so the modal remains responsive
        shortenUrlDirect(url).then((short) => {
          if (!isMounted.current) return;
          if (short) {
            setShortenedUrl(short);
            console.log('Auto-shortened share URL:', short);
          } else {
            console.warn('Auto-shortening failed; URL remains long.');
          }
        }).catch((err) => {
          console.error('Auto-shortening error:', err);
        }).finally(() => {
          if (isMounted.current) setIsShortening(false);
        });
      }
      // console.log('Share link generated successfully!');
    } catch (err) {
      setError('Failed to generate share URL. Please try again.');
      // console.error('Error generating share URL:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Compress workbench state to reduce URL length
  const compressWorkbenchState = async (workbenchState) => {
    // Wrap heavy serialization/compression in a Promise and defer to the
    // event loop so it doesn't block rendering for large workbench states.
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const jsonString = JSON.stringify(workbenchState);
          const compressed = LZString.compressToEncodedURIComponent(jsonString);
          resolve(compressed);
        } catch (error) {
          console.error('Error compressing workbench state:', error);
          resolve(btoa(JSON.stringify(workbenchState)));
        }
      }, 0);
    });
  };

  const copyToClipboard = async (urlToCopy = shareUrl) => {
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard. Please copy the URL manually.');
    }
  };

  const shortenUrl = async () => {
    if (!shareUrl) {
      setError('No URL to shorten. Please generate a share link first.');
      return;
    }

    setIsShortening(true);
    setError('');

    try {
      // Using TinyURL API (free and reliable)
      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(shareUrl)}`);
      
      if (response.ok) {
        const shortenedUrlResult = await response.text();
        setShortenedUrl(shortenedUrlResult);
      } else {
        // Fallback to is.gd API
        const fallbackResponse = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(shareUrl)}`);
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.shorturl) {
            setShortenedUrl(fallbackData.shorturl);
          } else {
            throw new Error('Failed to shorten URL with fallback service');
          }
        } else {
          throw new Error('Failed to shorten URL');
        }
      }
    } catch (err) {
      console.error('Error shortening URL:', err);
      setError('Failed to shorten URL. You can still use the original link.');
    } finally {
      setIsShortening(false);
    }
  };

  // Direct shortener used internally (returns shortened URL or null)
  const shortenUrlDirect = async (fullUrl) => {
    try {
      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(fullUrl)}`);
      if (response.ok) {
        const short = await response.text();
        return short;
      }
      // fallback
      const fallbackResponse = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(fullUrl)}`);
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        if (data.shorturl) return data.shorturl;
      }
      return null;
    } catch (err) {
      console.error('Direct shortener failed:', err);
      return null;
    }
  };



  return (
    <Modal show={show} onHide={onHide} size="lg" className="share-modal" style={{borderRadius:0}}>
      <Modal.Header 
        closeButton 
        closeVariant="white"
        style={{ 
          background: '#3F51B5', 
          color: '#fff', 
          borderBottom: '1px solid #38404a', 
          minHeight: '38px', 
          padding: '8px 18px 6px 18px', 
        }}
      >
        <Modal.Title className="d-flex align-items-center" style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>
          <GetMapIcon 
            width={14} 
            height={14} 
            color={'#fff'} 
            style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'text-bottom' }}
          />
          <span style={{ lineHeight: 1 }}>Share Workbench</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        {mapLayers.length === 0 ? (
          <Alert variant="warning">
            <strong>No data to share!</strong> Your workbench is empty. 
            Please add some data layers before sharing.
          </Alert>
        ) : (
          <>
            <div className="mb-3">
              <h6>Share your current workbench configuration:</h6>
              <ul className="small text-muted">
                <li><strong>{mapLayers.length}</strong> data layer{mapLayers.length !== 1 ? 's' : ''}</li>
                <li>Map position and zoom level</li>
                <li>Layer settings and filters</li>
                {isOffCanvasVisible && <li>Bottom panel state</li>}
                <li>Selected region</li>
              </ul>
            </div>

            {!shareUrl ? (
              <div className="text-center">
                <div className="d-flex align-items-center justify-content-center">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span>Generating share link...</span>
                </div>
              </div>
            ) : (
              <div>
                <Form.Group className="mb-3">
                  <Form.Label>Share this link with others:</Form.Label>
                  <div className="input-group">
                    <Form.Control
                      type="text"
                      value={shortenedUrl || shareUrl}
                      readOnly
                      className="form-control"
                    />
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => copyToClipboard(shortenedUrl || shareUrl)}
                      disabled={isCopied}
                    >
                      {isCopied ? (
                        <>
                          <FaCopy className="me-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <FaCopy className="me-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </Form.Group>

                {!shortenedUrl && (
                  <div className="mb-3">
                    <Button 
                      variant="outline-primary" 
                      onClick={shortenUrl}
                      disabled={isShortening}
                      size="sm"
                    >
                      {isShortening ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-1" />
                          Shortening...
                        </>
                      ) : (
                        <>
                          <FaCompress className="me-1" />
                          Shorten URL
                        </>
                      )}
                    </Button>
                    <small className="text-muted ms-2">
                      Make the link shorter and easier to share
                    </small>
                  </div>
                )}

                {shortenedUrl && (
                  <Alert variant="success" className="small">
                    <strong>URL shortened successfully!</strong> The shortened link is now displayed above and ready to share.
                  </Alert>
                )}

                <Alert variant="info" className="small">
                  <strong>How it works:</strong> When someone opens this link, 
                  they'll see the same workbench configuration you have now, 
                  including all your data layers and settings.
                </Alert>
              </div>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer
        style={{
          borderRadius: 0,
         }}
      >
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ShareWorkbench; 