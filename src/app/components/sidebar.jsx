"use client";
import React, { useState, useEffect, useRef } from 'react';
import styles from '../explorer/page.module.css';
import './sidebar_mobile.css';
import { Row, Col, Button } from 'react-bootstrap';
import dynamic from 'next/dynamic';
import { useAppSelector, useAppDispatch } from '@/app/GlobalRedux/hooks';
import { hideModal, showModaler } from '@/app/GlobalRedux/Features/modal/modalSlice';
import MyWorkbench from './workbench';
import { setDataset } from '@/app/GlobalRedux/Features/dataset/dataSlice';
import { setAccordion } from '@/app/GlobalRedux/Features/accordion/accordionSlice';
import { showsideoffCanvas } from '@/app/GlobalRedux/Features/sideoffcanvas/sideoffcanvasSlice';
import { setBounds } from '@/app/GlobalRedux/Features/map/mapSlice';
import SideOffCanvas from './side_offcanvas';
import { hideoffCanvas } from '@/app/GlobalRedux/Features/offcanvas/offcanvasSlice';
import { MdAddCircleOutline } from 'react-icons/md';
import { CgMoreO, CgSearch } from 'react-icons/cg';
import { get_url } from './urls';
import { setShortName } from '@/app/GlobalRedux/Features/country/countrySlice';

// Corrected path: original code referenced './Model' which doesn't exist; using existing './Modal.jsx'
const ExploreModal = dynamic(() => import('./Modal'), { ssr: false });

const SideBar = ({ collapsed = false, onToggle = () => {}, onOpenMapData }) => {
  const dispatch = useAppDispatch();
  const isVisiblecanvas = useAppSelector((state) => state.sideoffcanvas.isVisible);
  const isLoggedin = useAppSelector((state) => state.auth.isLoggedin);
  const isVisible = useAppSelector((state) => state.modal.isVisible);
  const country_idx = useAppSelector((state) => state.country.short_name);

  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('1');
  const [isMobileDrawerExpanded, setIsMobileDrawerExpanded] = useState(false);
  
  // Touch/swipe handling for mobile drawer
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  // Simple mobile detection (fix hydration error)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    }
  }, []);

  const handleShowCanvas = () => { dispatch(showsideoffCanvas()); };
  const handleShow = () => {
    dispatch(setAccordion(''));
    dispatch(setDataset([]));
    dispatch(showModaler());
    dispatch(hideoffCanvas());
  };
  const handleClose = () => { dispatch(hideModal()); };
  
  // Mobile drawer toggle function
  const toggleMobileDrawer = () => {
    setIsMobileDrawerExpanded(!isMobileDrawerExpanded);
  };

  // Swipe handling functions
  const minSwipeDistance = 50; // Minimum distance for a swipe

  const onTouchStart = (e) => {
    setTouchEnd(null); // Reset touchEnd
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;
    const isDownSwipe = distance < -minSwipeDistance;

    if (isUpSwipe && !isMobileDrawerExpanded) {
      // Swipe up to expand
      setIsMobileDrawerExpanded(true);
    } else if (isDownSwipe && isMobileDrawerExpanded) {
      // Swipe down to collapse
      setIsMobileDrawerExpanded(false);
    }
  };

  useEffect(() => {
    setSelectedRegion(country_idx);
    fetch(get_url('country'))
      .then(res => res.json())
      .then(data => {
        const sorted = [...data].sort((a,b) => a.long_name.localeCompare(b.long_name));
        setRegions(sorted);
        const saved = localStorage.getItem('selectedRegion');
        if (saved) {
          // Always prefer last user selection on refresh
          const exists = data.find(r => r.id.toString() === saved);
          if (exists) {
            setSelectedRegion(saved);
            dispatch(setShortName(saved));
            dispatch(setBounds({
              west: exists.west_bound_longitude,
              east: exists.east_bound_longitude,
              south: exists.south_bound_latitude,
              north: exists.north_bound_latitude,
            }));
          }
        } else if (isLoggedin) {
          // Fallback to login country when no saved selection exists
          const exists = data.find(r => r.id.toString() === String(country_idx));
          if (exists) {
            const idStr = String(exists.id);
            setSelectedRegion(idStr);
            dispatch(setShortName(idStr));
            dispatch(setBounds({
              west: exists.west_bound_longitude,
              east: exists.east_bound_longitude,
              south: exists.south_bound_latitude,
              north: exists.north_bound_latitude,
            }));
          }
        }
      })
      .catch(e => console.error('Error fetching regions:', e));
  }, [dispatch, country_idx, isLoggedin]);

  const handleRegionChange = (e) => {
    dispatch(hideoffCanvas());
    const regionId = e.target.value;
    setSelectedRegion(regionId);
  // Persist selection for both logged-in and guest users
  localStorage.setItem('selectedRegion', regionId);
    dispatch(setShortName(regionId));
    try {
      if (isLoggedin && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('regionSelected', { detail: { regionId } }));
      }
    } catch {}
    const region = regions.find(r => r.id === parseInt(regionId));
    if (region) {
      dispatch(setBounds({
        west: region.west_bound_longitude,
        east: region.east_bound_longitude,
        south: region.south_bound_latitude,
        north: region.north_bound_latitude,
      }));
    } else {
      dispatch(setBounds(null));
    }
    e.target.blur();
  };

  // Adjustable sidebar widths (modify EXPANDED_WIDTH if you need the "original" width restored)
  const EXPANDED_WIDTH = 350; // adjusted narrower width
  const COLLAPSED_WIDTH = 72;
  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
  return (
    <div
      className={`sidebar-responsive-wrapper ${collapsed ? styles.sidebarCollapsed : styles.sidebar} ${isMobileDrawerExpanded ? 'expanded' : ''}`}
      data-expanded={isMobileDrawerExpanded}
      data-text={isMobileDrawerExpanded ? 'Tap to collapse tools' : 'Tap to expand tools'}
      style={{
        marginRight: '3px',
        marginLeft: '3px',
        position: 'relative',
  // Lower z-index so modal / overlays appear above sidebar
  zIndex: 20,
        width: width + 'px',
        flex: `0 0 ${width}px`,
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .25s cubic-bezier(.4,0,.2,1)'
      }}
    >
      {/* Mobile handle area - clickable and swipeable (only render on mobile) */}
      {isMobile && (
        <div 
          className="mobile-handle-area"
          onClick={toggleMobileDrawer}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            zIndex: 5,
            cursor: 'pointer',
            touchAction: 'pan-y' // Allow vertical touch gestures
          }}
        />
      )}
      
      {/* Collapse / expand toggle styled via CSS module */}
      <button
        type="button"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={() => onToggle(!collapsed)}
        className={styles.collapseBtn}
      >
        <div className="collapseInnerCircle">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={collapsed ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>
  {!collapsed && (
    <div style={{padding: '10px 10px 4px 10px', width:'100%', boxSizing:'border-box'}}>
      <Row style={{ paddingTop: 0, margin: 0 }} className="sidebar-row">
        <Col md={12} style={{ paddingLeft: 0, paddingRight: 0 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#519ac2',
                pointerEvents: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1
              }}
            >
              <CgSearch size={16} />
            </span>
            <select
              className="form-select w-100 region-select region-select-override"
              aria-label="Select a region"
              value={selectedRegion}
              onChange={handleRegionChange}
              style={{
                borderRadius: '20px',
                border: '1px solid rgb(58 59 62)',
                fontSize: '0.875rem',
                padding: '0.375rem 0.75rem',
                paddingLeft: '32px',
                backgroundColor: 'white',
                color: '#212529',
                width: '100%'
              }}
            >
              {regions.map(region => (
                <option key={region.id} value={region.id}>{region.long_name}</option>
              ))}
            </select>
          </div>
        </Col>
      </Row>
    </div>
      )}
      {!collapsed && (
  <div className="d-flex justify-content-between sidebar-buttons" style={{ padding: '4px 10px 0 10px', gap: '10px', width:'100%', boxSizing:'border-box' }}>
        <Button
          variant="btn btn-primary btn-sm rounded-pill"
            style={{
              padding: '10px 12px',
              color: 'white',
              width: '55%',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease-in-out',
              display:'flex',
              alignItems:'center',
              justifyContent:'center'
            }}
          className="explore-button"
          onClick={(e) => { handleShow(); e.currentTarget.blur(); }}
        >
          <MdAddCircleOutline size={18} style={{ marginTop: -1, fontWeight:'bold' }} />&nbsp;Explore Map Data
        </Button>
        <Button
          variant="btn btn-sm rounded-pill"
          style={{
            padding: '10px 12px',
            color: 'white',
            width: '45%',
            backgroundColor: '#b8c93a',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease-in-out',
            display:'flex',
            alignItems:'center',
            justifyContent:'center'
          }}
          className="more-button"
          onClick={handleShowCanvas}
        >
          <CgMoreO size={16} style={{ marginTop: -1 }} />&nbsp;More
        </Button>
      </div>
      )}
      {!collapsed && (
  <div style={{padding:'6px 10px 12px 10px', width:'100%', boxSizing:'border-box'}}>
          <Row style={{ paddingTop: 4, marginRight: -4, marginLeft: -2 }} className="workbench-row">
            <MyWorkbench />
          </Row>
        </div>
      )}
      <SideOffCanvas isVisible={isVisiblecanvas} />
      <React.Suspense fallback={<div>Loading...</div>}>
        <ExploreModal
          show={isVisible}
          onClose={handleClose}
          title="Data Catalogue"
          bodyContent="This is the modal body content."
        />
      </React.Suspense>
    </div>
  );
};

export default SideBar;
