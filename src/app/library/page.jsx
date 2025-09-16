"use client";
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Stack, Badge, Image, Spinner, Modal, Button } from 'react-bootstrap';
import styles from './page.module.css';

const Library = () => {
  const [countryFilter, setCountryFilter] = useState('All');
  const [documentTypeFilter, setDocumentTypeFilter] = useState(null);
  const [yearFilter, setYearFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    documentTypes: [],
    years: []
  });
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentShareLink, setCurrentShareLink] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  const BASE_URL = 'https://ocean-library.spc.int';
  
  useEffect(() => {
    // Function to check and update theme
    const checkTheme = () => {
      if (typeof window !== 'undefined') {
        const isDark = document.documentElement.classList.contains('dark-mode') || 
                      document.body.classList.contains('dark-mode');
        setIsDarkMode(isDark);
      }
    };
    
    // Check theme on initial load
    checkTheme();
    
    // Set up a MutationObserver to watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });
    
    // Start observing the document element and body for class changes
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
    
    // Clean up the observer when the component unmounts
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [countriesRes, documentTypesRes, yearsRes] = await Promise.all([
          fetch(`${BASE_URL}/library/countries/`),
          fetch(`${BASE_URL}/library/document-types/`),
          fetch(`${BASE_URL}/library/years/`)
        ]);
        
        const [countriesData, documentTypesData, yearsData] = await Promise.all([
          countriesRes.json(),
          documentTypesRes.json(),
          yearsRes.json()
        ]);
        
        setFilterOptions({
          countries: countriesData,
          documentTypes: documentTypesData,
          years: yearsData
        });

        // Set default values to first document type if available
        if (documentTypesData.length > 0) {
          setDocumentTypeFilter(documentTypesData[0].id);
        }

        // Build initial URL with default document type if available
        let initialUrl = `${BASE_URL}/library/documents/`;
        if (documentTypesData.length > 0) {
          initialUrl += `?document_type_id=${documentTypesData[0].id}`;
        }
        
        const docsRes = await fetch(initialUrl);
        const docsData = await docsRes.json();
        setDocuments(docsData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (documentTypeFilter === null) return;

    const fetchFilteredDocuments = async () => {
      try {
        setLoading(true);
        let url = `${BASE_URL}/library/documents/?`;
        
        if (countryFilter !== 'All') url += `country_id=${encodeURIComponent(countryFilter)}&`;
        if (documentTypeFilter !== 'All') url += `document_type_id=${encodeURIComponent(documentTypeFilter)}&`;
        if (yearFilter !== 'All') url += `year_id=${encodeURIComponent(yearFilter)}`;
        
        url = url.endsWith('&') ? url.slice(0, -1) : url;
        
        const response = await fetch(url);
        const data = await response.json();
        setDocuments(data);
      } catch (error) {
        console.error('Error fetching filtered documents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredDocuments();
  }, [countryFilter, documentTypeFilter, yearFilter]);

  const filteredDocuments = documents.filter(doc => {
    return doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           doc.country.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getFullMediaUrl = (path) => {
    return path.startsWith('http') ? path : `${BASE_URL}${path}`;
  };

  const handleShareClick = (doc) => {
    const shareLink = getFullMediaUrl(doc.pdf);
    setCurrentShareLink(shareLink);
    setShowShareModal(true);
    setCopySuccess('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentShareLink)
      .then(() => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        setCopySuccess('Failed to copy');
      });
  };

  if (loading && documents.length === 0) {
    return (
      <div className="library-container" style={{
        height: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDarkMode ? '#2E2E32' : '',
        color: isDarkMode ? 'white' : 'var(--foreground)'
      }}>
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="library-container" style={{
      height: 'calc(100vh - 60px)',
      overflowY: 'auto',
      overflowX: 'hidden',
      backgroundColor: isDarkMode ? '#2E2E32' : '#FAFAFA',
      color: isDarkMode ? 'white' : 'var(--foreground)'
    }}>
      <style jsx>{`
        /* Specific scrollbar styling for library container only */
        .library-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .library-container::-webkit-scrollbar-track {
          background: ${isDarkMode ? '#2a2a2a' : '#e5e7eb'};
          border-radius: 10px;
        }
        
        .library-container::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#555555' : '#9ca3af'};
          border-radius: 10px;
          transition: background 0.3s ease;
        }
        
        .library-container::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#777777' : '#6b7280'};
        }
        
        .library-container::-webkit-scrollbar-corner {
          background: ${isDarkMode ? '#2a2a2a' : '#e5e7eb'};
        }
        
        /* Library-specific card styles */
        .library-card {
          aspect-ratio: 1;
          height: 240px;
          border-top-left-radius: 16px;
          border-bottom-right-radius: 16px;
          overflow: hidden;
          position: relative;
          background-repeat: no-repeat;
          background-size: cover;
          background-position: center center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer;
          border: none;
          margin-bottom: 0;
          max-width: 100%;
        }

        /* Responsive Card Sizing */
        @media (max-width: 1400px) {
          .library-card {
            height: 220px;
          }
        }

        @media (max-width: 1200px) {
          .library-card {
            height: 200px;
          }
        }

        @media (max-width: 992px) {
          .library-card {
            height: 180px;
          }
        }

        @media (max-width: 768px) {
          .library-card {
            height: 160px;
          }
        }

        @media (max-width: 576px) {
          .library-card {
            height: 140px;
          }
        }

        /* Library-specific title styles */
        .library-card--title {
          padding: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #fff;
          text-transform: capitalize;
          line-height: 1.2;
          text-shadow: 0 2px 4px rgba(0,0,0,0.7);
          margin: 0;
          position: relative;
          z-index: 2;
          top: 50%;
        }

        @media (max-width: 1400px) {
          .library-card--title {
            font-size: 0.75rem;
            padding: 0.4rem;
            max-width: 7ch;
          }
        }

        @media (max-width: 992px) {
          .library-card--title {
            font-size: 0.7rem;
            padding: 0.3rem;
            max-width: 6ch;
          }
        }

        @media (max-width: 768px) {
          .library-card--title {
            font-size: 0.65rem;
            padding: 0.3rem;
            max-width: 5ch;
          }
        }

        @media (max-width: 576px) {
          .library-card--title {
            font-size: 0.6rem;
            padding: 0.2rem;
            max-width: 4ch;
          }
        }

        /* Library-specific tag styles */
        .library-card--hashtag {
          position: absolute;
          display: flex;
          flex-direction: column;
          padding: 6px 6px 6px 0;
          background: ${isDarkMode ? '#3F4853' : '#fff'};
          border-top-right-radius: 16px;
          bottom: 0;
          left: 0;
          gap: 0.2rem;
          max-width: 85%;
          z-index: 2;
        }

        @media (max-width: 1400px) {
          .library-card--hashtag {
            padding: 5px 5px 5px 0;
            gap: 0.15rem;
            max-width: 82%;
          }
        }

        @media (max-width: 992px) {
          .library-card--hashtag {
            padding: 4px 4px 4px 0;
            gap: 0.15rem;
            max-width: 80%;
          }
        }

        @media (max-width: 768px) {
          .library-card--hashtag {
            padding: 3px 3px 3px 0;
            gap: 0.1rem;
            max-width: 75%;
          }
        }

        @media (max-width: 576px) {
          .library-card--hashtag {
            padding: 2px 2px 2px 0;
            gap: 0.1rem;
            max-width: 70%;
          }
        }

        .library-card--hashtag span {
          margin: 0;
          padding: 2px 5px;
          border: 1px solid ${isDarkMode ? '#4E5661' : '#1d1d1d'};
          border-radius: 100px;
          z-index: 1;
          font-size: 0.6rem;
          font-weight: 500;
          color: ${isDarkMode ? '#f1f5f9' : '#1d1d1d'};
          background: ${isDarkMode ? '#3F4853' : '#fff'};
          white-space: nowrap;
          width: fit-content;
        }

        @media (max-width: 1400px) {
          .library-card--hashtag span {
            font-size: 0.55rem;
            padding: 2px 4px;
          }
        }

        @media (max-width: 992px) {
          .library-card--hashtag span {
            font-size: 0.5rem;
            padding: 1px 3px;
          }
        }

        @media (max-width: 768px) {
          .library-card--hashtag span {
            font-size: 0.45rem;
            padding: 1px 3px;
          }
        }

        @media (max-width: 576px) {
          .library-card--hashtag span {
            font-size: 0.4rem;
            padding: 1px 2px;
          }
        }

        /* Library-specific PDF button styles */
        .library-card--more {
          position: absolute;
          display: flex;
          flex-direction: column;
          padding: 6px 6px 6px 0;
          border-bottom-left-radius: 16px;
          background: ${isDarkMode ? '#3F4853' : '#fff'};
          top: 0;
          right: 0;
          z-index: 2;
          gap: 4px;
        }

        @media (max-width: 1400px) {
          .library-card--more {
            padding: 5px 5px 5px 0;
            gap: 3px;
          }
        }

        @media (max-width: 992px) {
          .library-card--more {
            padding: 4px 4px 4px 0;
            gap: 3px;
          }
        }

        @media (max-width: 768px) {
          .library-card--more {
            padding: 3px 3px 3px 0;
            gap: 2px;
          }
        }

        @media (max-width: 576px) {
          .library-card--more {
            padding: 2px 2px 2px 0;
            gap: 2px;
          }
        }

        .library-card--more a,
        .library-card--more button {
          margin: 0 0 0 6px;
          padding: 5px 10px;
          background: #ff8c00;
          color: #fff;
          font-weight: 600;
          text-decoration: none;
          border: none;
          border-radius: 100px;
          z-index: 1;
          font-size: 0.7rem;
          transition: all 0.3s ease;
          cursor: pointer;
          text-align: center;
        }

        .library-card--more button {
          background: #5FA3FA;
        }

        @media (max-width: 1400px) {
          .library-card--more a,
          .library-card--more button {
            padding: 4px 8px;
            font-size: 0.65rem;
            margin: 0 0 0 5px;
          }
        }

        @media (max-width: 992px) {
          .library-card--more a,
          .library-card--more button {
            padding: 3px 6px;
            font-size: 0.6rem;
            margin: 0 0 0 4px;
          }
        }

        @media (max-width: 768px) {
          .library-card--more a,
          .library-card--more button {
            padding: 2px 5px;
            font-size: 0.55rem;
            margin: 0 0 0 3px;
          }
        }

        @media (max-width: 576px) {
          .library-card--more a,
          .library-card--more button {
            padding: 2px 4px;
            font-size: 0.5rem;
            margin: 0 0 0 2px;
          }
        }

        /* Hover Effects */
        .library-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }

        .library-card--more a:hover,
        .library-card--more button:hover {
          transform: scale(1.05);
        }

        .library-card--more a:hover {
          background: #e67e00;
          color: #fff;
        }

        .library-card--more button:hover {
          background: #5FA3FA;
          color: #fff;
        }

        /* Geometric Cutout Styles */
        .library-card--hashtag::before,
        .library-card--hashtag::after {
          z-index: 0;
        }

        .library-card--hashtag::before {
          position: absolute;
          content: "";
          top: -16px;
          left: -16px;
          background: transparent;
          width: 16px;
          height: 16px;
          border-top-color: transparent;
          border-left-color: transparent;
          border-right-color: ${isDarkMode ? '#3F4853' : '#fff'};
          border-bottom-color: ${isDarkMode ? '#3F4853' : '#fff'};
          border-bottom-right-radius: 16px;
          border-width: 16px;
          border-style: solid;
          transform: rotate(90deg);
        }

        .library-card--hashtag::after {
          position: absolute;
          content: "";
          bottom: -16px;
          right: -16px;
          background: transparent;
          width: 16px;
          height: 16px;
          border-top-color: transparent;
          border-left-color: transparent;
          border-right-color: ${isDarkMode ? '#3F4853' : '#fff'};
          border-bottom-color: ${isDarkMode ? '#3F4853' : '#fff'};
          border-bottom-right-radius: 16px;
          border-width: 16px;
          border-style: solid;
          transform: rotate(90deg);
        }

        .library-card--more::before,
        .library-card--more::after {
          z-index: 0;
        }

        .library-card--more::before {
          position: absolute;
          content: "";
          top: -16px;
          left: -16px;
          background: transparent;
          width: 16px;
          height: 16px;
          border-top-color: transparent;
          border-left-color: transparent;
          border-right-color: ${isDarkMode ? '#3F4853' : '#fff'};
          border-bottom-color: ${isDarkMode ? '#3F4853' : '#fff'};
          border-bottom-right-radius: 16px;
          border-width: 16px;
          border-style: solid;
          transform: rotate(-90deg);
        }

        .library-card--more::after {
          position: absolute;
          content: "";
          bottom: -16px;
          right: -16px;
          background: transparent;
          width: 16px;
          height: 16px;
          border-top-color: transparent;
          border-left-color: transparent;
          border-right-color: ${isDarkMode ? '#3F4853' : '#fff'};
          border-bottom-color: ${isDarkMode ? '#3F4853' : '#fff'};
          border-bottom-right-radius: 16px;
          border-width: 16px;
          border-style: solid;
          transform: rotate(-90deg);
        }

        /* Change View PDF button color to orange */
        .library-card--more a {
          background: #ff8c00 !important;
          color: #fff !important;
        }

        .library-card--more a:hover {
          background: #e67e00 !important;
          color: #fff !important;
        }
 .dashboard-modal .btn-close {
      filter: invert(1) grayscale(100%) brightness(200%);
    }

      `}</style>
      
      {/* Share Modal */}
      <Modal 
        show={showShareModal} 
        onHide={() => setShowShareModal(false)} 
        contentClassName={styles.shareLibraryModalContent}
        backdropClassName={styles.shareLibraryModalBackdrop}
      >
        <Modal.Header 
          closeButton 
          className={styles.shareLibraryModalHeader}
        >
          <Modal.Title>
            Share Document
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid #eee', width: '5%' }}>URL</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>
                  <div className="d-flex align-items-center">
                    <Form.Control 
                      type="text" 
                      value={currentShareLink} 
                      readOnly 
                      style={{ marginRight: '10px' }}
                    />
                    <Button 
                      variant={copySuccess ? 'success' : 'primary'} 
                      onClick={copyToClipboard}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {copySuccess ? copySuccess : 'Copy Link'}
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </Modal.Body>
        <Modal.Footer className={styles.shareLibraryModalFooter}>
          <Button variant="secondary" onClick={() => setShowShareModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      
      <Container fluid className="py-4" style={{
        backgroundColor: isDarkMode ? '#2E2E32' : '#FAFAFA',
        color: isDarkMode ? 'white' : 'var(--foreground)'
      }}>
        <Row>
          <Col md={3} className="pe-4">
            <Card 
              className="sticky-top" 
              style={{ 
                top: '20px', 
                maxHeight: '400px', 
                overflow: 'auto',
                backgroundColor: isDarkMode ? '#3F4853' : '',
                border: isDarkMode ? '1px solid #4E5762' : '',
                color: isDarkMode ? 'white' : 'var(--foreground)'
              }}
            >
              <Card.Body>
                <Card.Title className="mb-3" style={{ color: isDarkMode ? 'white' : 'var(--foreground)' }}>Filters</Card.Title>
                <Form>
                  <Form.Group controlId="countryFilter" className="mb-3">
                    <Form.Label style={{ color: isDarkMode ? 'white' : 'var(--foreground)' }}>Country</Form.Label>
                    <Form.Select 
                      value={countryFilter}
                      onChange={(e) => setCountryFilter(e.target.value)}
                      style={{
                        backgroundColor: isDarkMode ? '#3F4853' : '',
                        color: isDarkMode ? 'white' : 'var(--foreground)',
                        border: isDarkMode ? '1px solid #4E5762' : '',
                        backgroundImage: isDarkMode ? 
                        "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e\")" : 
                        "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e\")",
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '16px 12px'
                      }}
                    >
                      <option value="All">All Countries</option>
                      {filterOptions.countries.map((country) => (
                        <option 
                          key={country.id} 
                          value={country.id}
                        >
                          {country.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group controlId="documentTypeFilter" className="mb-3">
                    <Form.Label style={{ color: isDarkMode ? 'white' : 'var(--foreground)' }}>Document Type</Form.Label>
                    <Form.Select 
                      value={documentTypeFilter || (filterOptions.documentTypes[0]?.id || '')}
                      onChange={(e) => setDocumentTypeFilter(e.target.value)}
                      style={{
                        backgroundColor: isDarkMode ? '#3F4853' : '',
                        color: isDarkMode ? 'white' : 'var(--foreground)',
                        border: isDarkMode ? '1px solid #4E5762' : '',
                        backgroundImage: isDarkMode ? 
                        "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e\")" : 
                        "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e\")",
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '16px 12px'
                      }}
                    >
                      {filterOptions.documentTypes.map((type) => (
                        <option 
                          key={type.id} 
                          value={type.id}
                        >
                          {type.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group controlId="yearFilter">
                    <Form.Label style={{ color: isDarkMode ? 'white' : 'var(--foreground)' }}>Year</Form.Label>
                    <Form.Select 
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      style={{
                        backgroundColor: isDarkMode ? '#3F4853' : '',
                        color: isDarkMode ? 'white' : 'var(--foreground)',
                        border: isDarkMode ? '1px solid #4E5762' : '',
                        backgroundImage: isDarkMode ? 
                        "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e\")" : 
                        "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e\")",
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '16px 12px'
                      }}
                    >
                      <option value="All">All Years</option>
                      {filterOptions.years.map((year) => (
                        <option 
                          key={year.id} 
                          value={year.id}
                        >
                          {year.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col md={9}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 style={{ color: isDarkMode ? 'white' : 'var(--foreground)' }}>Library</h1>
              <div className="d-flex align-items-center">
                <div className="me-3" style={{ color: isDarkMode ? 'white' : 'var(--foreground)' }}>
                  {loading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <strong>{filteredDocuments.length}</strong>
                  )}{' '}
                  {filteredDocuments.length === 1 ? 'document' : 'documents'} found
                </div>
                <Form.Group controlId="searchQuery" className="mb-0">
                  <Form.Control
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ 
                      width: '250px',
                      backgroundColor: isDarkMode ? '#3F4853' : '',
                      color: isDarkMode ? 'white' : 'var(--foreground)',
                      border: isDarkMode ? '1px solid #4E5762' : ''
                    }}
                  />
                </Form.Group>
                </div>
              </div>

              {loading && documents.length > 0 ? (
                <div className="text-center py-3" style={{ color: isDarkMode ? 'white' : 'var(--foreground)' }}>
                  <Spinner animation="border" />
                  <p>Updating results...</p>
                </div>
              ) : filteredDocuments.length > 0 ? (
                <div className="row g-4">
                  {filteredDocuments.map((doc, index) => (
                    <div key={doc.id || index} className="col-12 col-sm-6 col-lg-4 col-xl" style={{ flex: '0 0 18%', maxWidth: '18%', margin: '0 1%', marginBottom: '1.5rem' }}>
                      <div 
                        className="library-card"
                        aria-label={doc.title}
                        style={{ 
                          backgroundImage: `url('${getFullMediaUrl(doc.image)}')` 
                        }}
                      >
                        <h3 className="library-card--title">{doc.title}</h3>
                        <div className="library-card--hashtag">
                          <span>{doc.year?.name}</span>
                          <span>{doc.document_type?.name}</span>
                          <span>{doc.country?.name}</span>
                        </div>
                        <div className="library-card--more">
                          <a 
                            href={getFullMediaUrl(doc.pdf)}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="library-card--more__link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View PDF
                          </a>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareClick(doc);
                            }}
                          >
                            Share
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5" style={{ color: isDarkMode ? 'white' : 'var(--foreground)' }}>
                  <h4>No documents found matching your criteria</h4>
                  <p>Try adjusting your filters or search query</p>
                </div>
              )}
            </Col>
          </Row>
        </Container>
      </div>
  );
};

export default Library;