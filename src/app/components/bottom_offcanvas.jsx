'use client';
import React, { useState, useRef, useEffect } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { hideoffCanvas, setSelectedTab } from '@/app/GlobalRedux/Features/offcanvas/offcanvasSlice';
import { useAppDispatch, useAppSelector } from '@/app/GlobalRedux/hooks';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import { Button } from 'react-bootstrap';
import 'chart.js/auto';
import Timeseries from './timeseries'; 
import Tabular from './tablular'; 
import DynamicImage from './getMap';
import Download from './download';
import TimeseriesWfs from './timeseries_wfs';
import TimeseriesSofar from './timeseries_sofar';
import TideImageComponent from './tide_image';
import Histogram from './histogram';
import ShareWorkbench from './shareWorkbench';
import { FaShare } from 'react-icons/fa';
import GetMapIcon from './GetMapIcon';

// Custom tab styles
const customTabStyles = `
  .custom-bottom-tabs .nav-link.active {
    color: rgb(0, 123, 255) !important;
    background-color: transparent !important;
    border-color: transparent transparent rgb(0, 123, 255) transparent !important;
    border-bottom: 2px solid rgb(0, 123, 255) !important;
  }
  .custom-bottom-tabs .nav-link.active:hover,
  .custom-bottom-tabs .nav-link.active:focus {
    color: rgb(0, 123, 255) !important;
    border-bottom: 2px solid rgb(0, 123, 255) !important;
  }
  .custom-bottom-tabs .nav-tabs .nav-link {
    border: none !important;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
  }
  .custom-bottom-tabs.nav-tabs {
    border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
  }
  body.dark-mode .custom-bottom-tabs .nav-link.active {
    color: rgb(0, 123, 255) !important;
    background-color: transparent !important;
    border-color: transparent transparent rgb(0, 123, 255) transparent !important;
    border-bottom: 2px solid rgb(0, 123, 255) !important;
  }
  body.dark-mode .custom-bottom-tabs .nav-link.active:hover,
  body.dark-mode .custom-bottom-tabs .nav-link.active:focus {
    color: rgb(0, 123, 255) !important;
    border-bottom: 2px solid rgb(0, 123, 255) !important;
  }
  body.dark-mode .custom-bottom-tabs .nav-tabs .nav-link {
    border: none !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  }
  body.dark-mode .custom-bottom-tabs.nav-tabs {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  }
  
  /* Remove square borders from close button - more aggressive */
  #close-offcanvas-btn,
  #close-offcanvas-btn:hover,
  #close-offcanvas-btn:focus,
  #close-offcanvas-btn:active,
  #close-offcanvas-btn.active,
  #close-offcanvas-btn:focus-visible,
  #close-offcanvas-btn.btn-link:focus {
    box-shadow: none !important;
    border: none !important;
    outline: none !important;
    text-decoration: none !important;
    background: transparent !important;
    color: rgb(0, 123, 255) !important;
  }

  /* Dark mode base styling for bottom offcanvas */
  body.dark-mode .offcanvas-bottom {
    background: #3F4854 !important;
    color: #e2e8f0 !important;
    border-top: 1px solid #2b3440 !important;
    box-shadow: 0 -6px 18px -4px rgba(0,0,0,0.55), 0 -2px 4px rgba(0,0,0,0.4) !important;
  }
  body.dark-mode .offcanvas-bottom .offcanvas-body {
    background: #3F4854 !important;
    color: #e2e8f0 !important;
  }
  body.dark-mode .offcanvas-bottom .nav-tabs .nav-link {
    color: #b8c4d1 !important;
    background: transparent !important;
  }
  body.dark-mode .offcanvas-bottom .nav-tabs .nav-link:hover {
    color: #ffffff !important;
  }
  body.dark-mode .offcanvas-bottom .nav-tabs .nav-link.active {
    color: #3ba2ff !important;
    border-bottom: 2px solid #3ba2ff !important;
  }
  body.dark-mode .offcanvas-bottom #close-offcanvas-btn {
    color: #5fb2ff !important;
  }
  body.dark-mode .offcanvas-bottom #close-offcanvas-btn:hover {
    color: #91ccff !important;
  }
  body.dark-mode .offcanvas-bottom .share-btn {
    background: #3F4854 !important;
    color: #e2e8f0 !important;
    border: 1px solid #324153 !important;
  }
  body.dark-mode .offcanvas-bottom .share-btn:hover {
    background: #fff !important;
    border-color: #fff !important;
  }

`;

function BottomOffCanvas({ isVisible, id }) {
  const currentId = useAppSelector((state) => state.offcanvas.currentId);
  const mapLayer = useAppSelector((state) => state.mapbox.layers);
  const coordinates = useAppSelector((state) => state.coordinate.coordinates);
  const currentCoordinates = currentId ? coordinates[currentId] : null;
  const [layerType, setLayerType] = useState('');
  const [layerInfo, setLayerInfo] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const globalSelectedTab = useAppSelector((state) => state.offcanvas.selectedTabKey);
  
  useEffect(() => {
    if (currentId === id) {
      const selectedLayer = mapLayer.find(layer => 
        layer.id === currentId ||  
        (layer.layer_information && layer.layer_information.id === currentId)
      );
      
      if (selectedLayer && selectedLayer.layer_information) {
        let layer_type = selectedLayer.layer_information.layer_type;
        layer_type = layer_type.replace("_FORECAST", "");
        layer_type = layer_type.replace("_UGRID", "");
        layer_type = layer_type.replace("_HINDCAST", "");
        setLayerType(layer_type);
        setLayerInfo(selectedLayer.layer_information);
      }
    }
  }, [mapLayer, currentId, id]);

  const data = {
    labels: ['January', 'February', 'March', 'April', 'May'],
    datasets: [
      {
        label: 'Dataset',
        data: [65, 59, 80, 81, 56],
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const dispatch = useAppDispatch();
  const [height, setHeight] = useState(470);
  const [selectedTab, setSelectedTabLocal] = useState(globalSelectedTab || 'tab4');

  // Keep local state in sync with global state (restored from share)
  useEffect(() => {
    if (globalSelectedTab && globalSelectedTab !== selectedTab) {
      setSelectedTabLocal(globalSelectedTab);
    }
  }, [globalSelectedTab]);

  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleClose = () => {
    dispatch(hideoffCanvas());
  };

  const handleShowShareModal = () => {
    setShowShareModal(true);
  };

  const handleHideShareModal = () => {
    setShowShareModal(false);
  };

  const handleMouseMove = (e) => {
    if (draggingRef.current) {
      const deltaY = e.clientY - startYRef.current;
      const newHeight = startHeightRef.current - deltaY;
      if (newHeight > 100) {
        setHeight(newHeight);
      }
    }
  };

  const handleMouseUp = () => {
    draggingRef.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTabSelect = (k) => {
    setSelectedTabLocal(k);
    dispatch(setSelectedTab(k));
  };

  // Compute available WMS tab keys based on layerInfo flags
  const getAvailableWMSTabKeys = () => {
    const keys = [];
    if (layerInfo?.enable_get_map) keys.push('tab4'); // Get Map
    if (layerInfo?.enable_chart_timeseries) {
      keys.push('tab2'); // Timeseries
      keys.push('tab5'); // Histogram
    }
    if (layerInfo?.enable_chart_table) keys.push('tab1'); // Tabular
    keys.push('tab3'); // Download always available
    return keys;
  };

  // Ensure selected tab exists among available WMS tabs when layer/flags change
  useEffect(() => {
    if (layerType === 'WMS') {
      const available = getAvailableWMSTabKeys();
      if (available.length > 0 && !available.includes(selectedTab)) {
        setSelectedTabLocal(available[0]);
        dispatch(setSelectedTab(available[0]));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerType, layerInfo]);

  const renderTabsBasedOnLayerType = () => {
    switch (layerType) {
      case 'WMS': {
        const tabs = [];
        if (layerInfo?.enable_get_map) {
          tabs.push(
            <Tab eventKey="tab4" title="Get Map" key="tab4">
              <DynamicImage height={height - 100} />
            </Tab>
          );
        }
        if (layerInfo?.enable_chart_timeseries) {
          tabs.push(
            <Tab eventKey="tab2" title="Timeseries" key="tab2">
              <Timeseries height={height - 100} data={currentCoordinates || {}} />
            </Tab>
          );
          tabs.push(
            <Tab eventKey="tab5" title="Histogram" key="tab5">
              <Histogram height={height - 100} data={currentCoordinates || {}} />
            </Tab>
          );
        }
        if (layerInfo?.enable_chart_table) {
          tabs.push(
            <Tab eventKey="tab1" title="Tabular" key="tab1">
              <Tabular
                labels={['Wind Speed', 'Wave Direction', 'Wave Height']}
                dateCount={24}
              />
            </Tab>
          );
        }
        // Download tab remains visible
        tabs.push(
          <Tab eventKey="tab3" title="Download" key="tab3">
            <Download/>
          </Tab>
        );

        return (
          <Tabs activeKey={selectedTab} onSelect={handleTabSelect} id="offcanvas-tabs" className="mb-3 custom-bottom-tabs">
            {tabs}
          </Tabs>
        );
      }

      case 'WFS':
        return (
          <Tabs activeKey={selectedTab} onSelect={handleTabSelect} id="offcanvas-tabs" className="mb-3 custom-bottom-tabs">
            <Tab eventKey="tab4" title="Timeseries">
              <TimeseriesWfs height={height - 100} data={currentCoordinates} />
            </Tab>
          </Tabs>
        );
      
      case 'SOFAR':
        return (
          <Tabs activeKey={selectedTab} onSelect={handleTabSelect} id="offcanvas-tabs" className="mb-3 custom-bottom-tabs">
            <Tab eventKey="tab4" title="Timeseries">
              {/* Force remount on station or currentId change */}
              <TimeseriesSofar key={currentId || (currentCoordinates && currentCoordinates.station) || 'sofar'} height={height - 100} data={currentCoordinates} /> 
            </Tab>
          </Tabs>
        );

      case 'TIDE':
        return (
          <Tabs activeKey={selectedTab} onSelect={handleTabSelect} id="offcanvas-tabs" className="mb-3 custom-bottom-tabs">
            <Tab eventKey="tab4" title="Tide Chart">
              <TideImageComponent height={height - 100} data={data} /> 
            </Tab>
          </Tabs>
        );
      
      default:
        return null;
    }
  };

  return (
  <Offcanvas
      show={isVisible}
      onHide={handleClose}
      placement="bottom"
      className="offcanvas-bottom"
      backdrop={false}
      scroll={true}
      style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        height: `${height}px`,
      }}
    >
      <div
        style={{
          height: '8px',
          backgroundColor: '#6E767E', // overridden in dark mode via CSS (same color requested)
          cursor: 'ns-resize',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        className="drag-handle-bar"
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: '#2B3238', // darker than bar for contrast
            borderRadius: '4px',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.4)'
          }}
        ></div>
      </div>

      {/* Share Button */}
  <Button
        variant="primary"
        onClick={handleShowShareModal}
        style={{
          position: 'absolute',
          bottom: '15px',
          right: '15px',
          zIndex: 10,
          width: '40px',
          height: '40px',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Share Workbench"
      >
        <GetMapIcon width={16} height={16} color={'#fff'} />
      </Button>

      {/* Close Button */}
      <Button
        id="close-offcanvas-btn"
        variant="link"
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          fontSize: '2rem',
          padding: '0',
          paddingRight: '10px',
          color: 'rgb(0, 123, 255)',
          border: 'none',
          boxShadow: 'none',
          outline: 'none'
        }}
      >
        <span style={{ lineHeight: 1 }}>&times;</span>
      </Button>

      <style>{customTabStyles}</style>
      
      <Offcanvas.Body style={{ paddingTop: '3', borderRadius: 0 }}>
        {renderTabsBasedOnLayerType()}
      </Offcanvas.Body>

      {/* Share Workbench Modal */}
      <ShareWorkbench 
        show={showShareModal} 
        onHide={handleHideShareModal} 
      />
    </Offcanvas>
  );
}

export default BottomOffCanvas;