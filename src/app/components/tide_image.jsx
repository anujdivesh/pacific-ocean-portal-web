'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Spinner } from 'react-bootstrap';
import { useAppSelector } from '@/app/GlobalRedux/hooks';

function TideImageComponent({ height }) {
  const { station, x,y } = useAppSelector((state) => state.coordinate.coordinates);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const mapLayer = useAppSelector((state) => state.mapbox.layers);
  const lastlayer = useRef(0);

  // Reset loading and error states when station changes
  useEffect(() => {
    setIsLoading(true);
    setError('');
  }, [station]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setError('');
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('Failed to load tide chart image');
  };

  if (!station) {
    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
      }}>
        <p style={{ fontSize: 16, color: '#333' }}>Please select a station to view tide data.</p>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: `${height}px`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Loading Spinner */}
      {isLoading && (
        <div style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
        }}>
          <Spinner animation="border" role="status" variant="primary"/>
          <span style={{ marginLeft: '10px', fontSize: '18px' }}>Fetching data from API...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
        }}>
          <p style={{ fontSize: 16, color: '#ff6b6b' }}>{error}</p>
        </div>
      )}

      {/* Image Element */}
      <img 
        src={`https://ocean-plotter.spc.int/plotter/tide_hindcast?country=${x}&location=${y}&station_id=${station}`}
        alt="Tide Chart"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease'
        }}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
}

export default TideImageComponent;