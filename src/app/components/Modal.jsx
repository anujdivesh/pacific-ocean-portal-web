"use client"; // Ensure this is a Client Component
import React, { useState, useEffect } from 'react';
import { Modal, Row, Col, Spinner } from 'react-bootstrap';
import MyAccordion from './accordion';
import AccordionMetadata from './accordion_metadata';
import { get_url } from './urls';
import { useAppSelector } from "@/app/GlobalRedux/hooks";
import { FaRegCircle, FaDotCircle } from 'react-icons/fa';
//import '@/components/css/modal.css'; // Import your CSS file
import { CgSearch } from 'react-icons/cg';
import './modal_mobile.css';

const ExploreModal = ({ show, onClose, title, bodyContent }) => {
  const [theme, setTheme] = useState([]);
  const [selectedId, setSelectedId] = useState(null); // No theme selected by default
  const [data, setData] = useState(null); // Single state to store both the tailored and theme-based data
  const [loading, setLoading] = useState(false); // State for loading
  const [userId, setUserId] = useState(null); // State to store the userId (token)
  const [showTailoredContent, setShowTailoredContent] = useState(false); // Tailored content shown by default if logged in
  const [country, setCountry] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // State for search input
  const countryId = useAppSelector((state) => state.auth.country);

  // Fetch data based on the selectedId (theme-based data)
  const fetchData = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(get_url('root_menu', id));
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Fetch error: ", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };
/*
  // Fetch session to get the userId
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch("/api/session");
        const data = await response.json();
        setCountry(data.countryId)
        setUserId(data.userId); // Set userId when the session is fetched
      } catch (error) {
        console.error("Failed to fetch session:", error);
      }
    };
    fetchSession();
  }, [countryId,country]);
  */

  // Fetch tailored menu data using the userId as the bearer token
  const fetchTailoredMenu = async (country) => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await fetch(get_url('tailored_menu')+"/?country_id="+country+"&format=json", {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch tailored menu data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch theme data when the modal loads
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const response = await fetch(get_url('theme'));
        const data = await response.json();
        setTheme(data);
      } catch (error) {
        console.error('Error fetching themes:', error);
      }
    };

    fetchThemes();
  }, []);

  // When the userId is updated, show the first theme (Data Catalogue) by default
  useEffect(() => {
    if (userId && theme.length > 0) {
      setShowTailoredContent(false); // Don't show tailored content by default
      setSelectedId(theme[0].id); // Set the first theme as selected by default
      fetchData(theme[0].id); // Fetch data for the first theme
    }
  }, [userId, country, theme]);

  // Handle Tailored button click
  const handleTailoredClick = () => {
    setShowTailoredContent(true); // Show tailored content
    setSelectedId(null); // Deselect any theme button
    fetchTailoredMenu(country); // Fetch tailored menu data
  };

  // Handle theme button click
  const handleThemeClick = (id) => {
    setSelectedId(id); // Set the selected theme ID
    setShowTailoredContent(false); // Switch to theme-based content
    fetchData(id); // Fetch the data for the selected theme
  };

  // Set default selectedId to first theme if no tailored data or userId
  useEffect(() => {
    if (!userId && theme.length > 0 && selectedId === null) {
      setSelectedId(theme[0].id); // Set the first theme as selected by default
      fetchData(theme[0].id); // Fetch data for the first theme
    }
  }, [theme, userId, selectedId]);

  return (
    <>
             <style>{`
         .custom-modal.explore-modal .btn.rounded-pill {
           background: #fff !important;
           color: #519ac2 !important;
         }
         .custom-modal.explore-modal .btn.rounded-pill.active {
           background: #519ac2 !important;
           color: #ffffff !important;
           border-width: 1px !important;
           transform: translateY(-2px);
           box-shadow: 0 6px 20px rgba(81,154,194,0.15);
         }
         body.dark-mode .custom-modal.explore-modal .btn.rounded-pill {
           background: #fff !important;
           color: #519ac2 !important;
         }
         body.dark-mode .custom-modal.explore-modal .btn.rounded-pill.active {
           background: #519ac2 !important;
           color: #ffffff !important;
           transform: translateY(-2px);
           box-shadow: 0 6px 20px rgba(81,154,194,0.25);
         }
                 .custom-modal.explore-modal input[type="text"] {
           background-color: #ffffff !important;
           color: #519ac2 !important;
         }
         body.dark-mode .custom-modal.explore-modal input[type="text"] {
           background-color: #ffffff !important;
           color: #519ac2 !important;
         }
         
         /* Scrollbar styling for modal - same for light and dark mode */
         .custom-modal.explore-modal ::-webkit-scrollbar {
           width: 10px;
         }
         
         .custom-modal.explore-modal ::-webkit-scrollbar-track {
           background: #f5f5f5;
           border-radius: 6px;
           margin: 2px;
         }
         
         .custom-modal.explore-modal ::-webkit-scrollbar-thumb {
           background: #d1d5db;
           border-radius: 6px;
           border: 2px solid #f5f5f5;
         }
         
         .custom-modal.explore-modal ::-webkit-scrollbar-thumb:hover {
           background: #9ca3af;
         }
         
         .custom-modal.explore-modal ::-webkit-scrollbar-thumb:active {
           background: #6b7280;
         }
         
         /* Dark mode scrollbar - same styling as light mode */
         body.dark-mode .custom-modal.explore-modal ::-webkit-scrollbar-track {
           background: #f5f5f5;
         }
         
         body.dark-mode .custom-modal.explore-modal ::-webkit-scrollbar-thumb {
           background: #d1d5db;
           border: 2px solid #f5f5f5;
         }
         
         body.dark-mode .custom-modal.explore-modal ::-webkit-scrollbar-thumb:hover {
           background: #9ca3af;
         }
         
         body.dark-mode .custom-modal.explore-modal ::-webkit-scrollbar-thumb:active {
           background: #6b7280;
         }
         /* Transparent backdrop but keep outside-click closing */
         .modal-backdrop.show { opacity:0 !important; }
         /* Fixed height + flex layout */
         .custom-modal.explore-modal .modal-dialog {
          /* Slightly larger than lg but smaller than previous 1280px */
          max-width: 1150px; /* tweak here if needed */
         }
         .custom-modal.explore-modal .modal-content {
           height: 70vh; /* fixed viewport based height */
           display: flex;
           flex-direction: column;
           border-radius:0 !important;
         }
         .custom-modal.explore-modal .modal-header,
         .custom-modal.explore-modal .modal-footer { border-radius:0 !important; }
         .custom-modal.explore-modal .modal-body {
           flex: 1 1 auto;
           overflow: hidden; /* we'll manage inner scroll */
           display: flex;
           padding: 0 !important;
         }
         /* Two-column area scroll */
         .custom-modal.explore-modal .modal-body .row { flex:1 1 auto; margin:0; width:100%; }
         .custom-modal.explore-modal .scrollable-column { height: 100%; overflow-y: auto; }
         /* Accordion density adjustments */
         /* Restore near-default Bootstrap spacing for better tap targets */
         /* Medium density variant */
         .custom-modal.explore-modal .accordion-button { padding:0.65rem 1rem; font-size:0.92rem; line-height:1.2; }
         .custom-modal.explore-modal .accordion-body { padding:0.65rem 1rem 0.75rem; }
         .custom-modal.explore-modal .nested-accordion .flex-container { padding:3px 6px; }
         /* Ensure text and add/check icon sit on one line */
         .custom-modal.explore-modal .nested-accordion .flex-container { display:flex; align-items:center; justify-content:space-between; gap:6px; }
         .custom-modal.explore-modal .nested-accordion .flex-container .item:first-child { flex:1; min-width:0; }
         .custom-modal.explore-modal .nested-accordion .item { font-size:13px; line-height:1.25; }
         .custom-modal.explore-modal .badge { font-size:0.65rem; }
         /* Tighten vertical gap between parent accordion body and nested child accordions */
         .custom-modal.explore-modal .nested-accordion .accordion-body { padding-top:0.5rem; padding-bottom:0.4rem; }
         /* Remove extra margin that Bootstrap may inject between nested accordions */
         .custom-modal.explore-modal .nested-accordion .accordion-body > .accordion { margin-top:4px; margin-bottom:0; }
         .custom-modal.explore-modal .nested-accordion .accordion-body > .accordion .accordion { margin-top:2px; }
         /* Collapse bottom margin between consecutive accordion items */
         .custom-modal.explore-modal .nested-accordion .accordion-item { margin:0; }
         /* Slightly smaller nested header padding */
         .custom-modal.explore-modal .nested-accordion .accordion-button { padding:0.5rem 0.75rem; }
         /* Remove any default bottom spacing below headers when expanded */
         .custom-modal.explore-modal .nested-accordion .accordion-button:not(.collapsed) { box-shadow:none; }
         /* Zero border radius across all accordion parts */
         .custom-modal.explore-modal .accordion,
         .custom-modal.explore-modal .accordion-item,
         .custom-modal.explore-modal .accordion-button {
           border-radius:0 !important;
           --bs-accordion-border-radius:0;
           --bs-accordion-inner-border-radius:0;
         }
         .custom-modal.explore-modal .accordion-button:focus { box-shadow:none; border-radius:0 !important; }
         .custom-modal.explore-modal .accordion-item:first-of-type .accordion-button,
         .custom-modal.explore-modal .accordion-item:last-of-type .accordion-button { border-radius:0 !important; }
         .custom-modal.explore-modal input[type="text"] { height:30px; font-size:13px !important; }
         /* Make the close (X) icon white */
         .custom-modal.explore-modal .btn-close { filter:invert(1) brightness(200%); opacity:1; }
         .custom-modal.explore-modal .btn-close:hover { filter:invert(1) brightness(260%); opacity:1; }
      `}</style>
  <Modal show={show} onHide={onClose} centered size="xl" backdrop={true} keyboard={true} className="custom-modal explore-modal">
        <Modal.Header closeButton className="custom-header2" style={{ background: '#519ac2',  paddingTop: '8px', paddingBottom: '8px', minHeight: 'unset', color: '#ffffff' }}>
          <Modal.Title style={{ fontSize: '18px', color:'#ffffff' }}>
            {/* Search input */}
           <div style={{ position: 'relative', display: 'inline-block' }}>
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
        }}
      >
        <CgSearch size={16} />
      </span>

      <input
        type="text"
        placeholder="Search datasets..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSubmit?.();
        }}
        style={{
          marginRight: '12px',
          padding: '6px 10px 6px 32px', // left padding for icon
          borderRadius: '20px',
          border: 'none',
          outline: 'none',
          fontSize: '14px',
          width: '200px',
          color: '#519ac2',
          backgroundColor: '#ffffff',
        }}
      />
    </div>
            {/* Render the theme buttons */}
            {theme.map((themeItem) => (
              <button
                key={themeItem.id}
                className={`btn btn-sm rounded-pill ${selectedId === themeItem.id ? 'active' : 'btn-light'}`}
                                 style={{
                   padding: '8px',
                   backgroundColor: '#fff',
                   color: '#519ac2',
                   marginLeft: '4px',
                   border: selectedId === themeItem.id ? '2px solid #ffffff' : '1px solid #519ac2',
                   fontWeight: '500'
                 }}
                onClick={() => handleThemeClick(themeItem.id)}
              >
                &nbsp;{themeItem.name} &nbsp;
              </button>
            ))}
          </Modal.Title>
        </Modal.Header>
  <Modal.Body style={{ margin: 0, padding: 0, width: '100%', background: '#ffffff', color: 'var(--color-text, #1e293b)' }}>
          <Row className="g-0" style={{width:'100%'}}>
            <Col md={4} className="scrollable-column" style={{ background: '#f8f8f8', borderRight:'1px solid #e5e7eb' }}>
              {loading ? (
                <Spinner animation="border" variant="primary" style={{ margin: 170 }} />
              ) : (
                <MyAccordion className="scrollable-content modal-accordion" dataset={data} searchQuery={searchQuery} />
              )}
            </Col>
            <Col  md={8} className="scrollable-column" style={{ background: '#ffffff', padding: 0 }}>
              <AccordionMetadata />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer className="custom-header2" style={{ background: 'var(--color-surface, #fff)', borderTop: '1px solid var(--color-secondary, #e5e7eb)', paddingTop: '6px', paddingBottom: '6px', minHeight: 'unset' }}>
          <p style={{ fontSize: '11px', color: 'var(--color-secondary, #64748b)', margin: 0 }}>&copy; All Rights Reserved SPC </p>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ExploreModal;
