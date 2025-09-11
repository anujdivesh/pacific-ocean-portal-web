'use client';
import React, { useEffect, useState } from 'react';
import { Container, Button, Form, InputGroup } from 'react-bootstrap';
import { FaSearch } from 'react-icons/fa';
import { useAppSelector } from '@/app/GlobalRedux/hooks';
import { get_url } from '../components/urls';
import Link from 'next/link';

function Collections() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false);

    const token = useAppSelector((state) => state.auth.token);
    const country = useAppSelector((state) => state.auth.country);
    const isLoggedin = useAppSelector((state) => state.auth.isLoggedin);

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
        const fetchDashboards = async () => {
            setLoading(true);
            setError(null);
            try {
                const publicUrl = get_url('root-path') + '/middleware/api/widget/?format=json';
                const publicRes = await fetch(publicUrl);
                if (!publicRes.ok) throw new Error('Failed to fetch public dashboards');
                const publicDashboards = await publicRes.json();

                let countryDashboards = [];
                if (isLoggedin && country) {
                    
                    const countryUrl = get_url('root-path') + `/middleware/api/widget/?format=json&country_id=${country}`;
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};
                    const countryRes = await fetch(countryUrl, { headers });
                    if (!countryRes.ok) throw new Error('Failed to fetch country dashboards');
                    countryDashboards = await countryRes.json();
                }

                const dashboardsById = {};
                [...publicDashboards, ...countryDashboards].forEach(d => { dashboardsById[d.id] = d; });
                setProjects(Object.values(dashboardsById));
            } catch (err) {
                setError(err.message || 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboards();
    }, [token, country, isLoggedin]);

    const filteredProjects = projects.filter(card =>
        card.display_title && card.display_title.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ 
                height: '100vh',
                backgroundColor: isDarkMode ? '#2E2E32' : '',
                color: isDarkMode ? 'white' : 'inherit'
            }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger mx-auto mt-5" style={{ 
                maxWidth: '600px',
                backgroundColor: isDarkMode ? '#3F4853' : '',
                border: isDarkMode ? '1px solid #4E5762' : '',
                color: isDarkMode ? 'white' : 'inherit'
            }}>
                Error: {error}
            </div>
        );
    }

    const handleDashboardClick = (componentName, card) => {
        if (!componentName) return;
        const isRestricted = card?.restricted === true || card?.is_restricted === true;
        if (isRestricted) {
            let countryCodes = [];
            if (Array.isArray(card?.country_codes)) countryCodes = card.country_codes; 
            else if (Array.isArray(card?.countries)) countryCodes = card.countries.map(c => c.code || c.country_code || c.short_code).filter(Boolean);
            else if (typeof country === 'string' && country) countryCodes = [country];
            const countryParam = encodeURIComponent(countryCodes.join(','));
            const tokenParam = encodeURIComponent(token || '');
            const baseUrl = componentName.startsWith('http://') || componentName.startsWith('https://')
                ? componentName.split('?')[0]
                : `https://ocean-plugin.spc.int/${componentName.replace(/^\//,'').split('?')[0]}`;
            const finalUrl = `${baseUrl}?token=${tokenParam}&country=${countryParam}`;
            window.open(finalUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        window.open(componentName, '_blank', 'noopener,noreferrer');
    };

  return (
    <div className="collections-container" style={{
      height: 'calc(100vh - 60px)',
      overflowY: 'auto',
      overflowX: 'hidden',
      backgroundColor: isDarkMode ? '#2E2E32' : '#FAFAFA',
      color: isDarkMode ? 'white' : 'inherit'
    }}>
      <main className="py-4" style={{
        backgroundColor: isDarkMode ? '#2E2E32' : '#FAFAFA',
        color: isDarkMode ? 'white' : 'inherit',
        minHeight: '100%'
      }}>
        <Container>
          <div className="mb-5">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
              <Link href="/" style={{ display: 'inline-block', textDecoration: 'none' }}>
                {/* Logo placeholder */}
              </Link>
              <h1 className="display-9 mb-0">Dashboard Collections</h1>
            </div>
            <div className="d-flex justify-content-center">
              <Form className="mt-3" autoComplete="off" onSubmit={e => e.preventDefault()} style={{ width: '100%' }}>
                <InputGroup id="dashboard-search-group">
                  <InputGroup.Text
                    style={{
                      background: isDarkMode ? '#3F4853' : 'var(--color-surface, #fff)',
                      borderTop: isDarkMode ? '1px solid #4E5762' : '1px solid var(--color-secondary, #e5e7eb)',
                      borderBottom: isDarkMode ? '1px solid #4E5762' : '1px solid var(--color-secondary, #e5e7eb)',
                      borderLeft: isDarkMode ? '1px solid #4E5762' : '1px solid var(--color-secondary, #e5e7eb)',
                      borderRight: 'none',
                      paddingRight: 0,
                      color: isDarkMode ? 'white' : 'var(--color-secondary, #64748b)',
                      borderTopLeftRadius: 12,
                      borderBottomLeftRadius: 12,
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  >
                    <FaSearch size={16} style={{ fontWeight: 'bold',marginRight:10 }} />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search dashboards by title..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      borderTop: isDarkMode ? '1px solid #4E5762' : '1px solid var(--color-secondary, #e5e7eb)',
                      borderBottom: isDarkMode ? '1px solid #4E5762' : '1px solid var(--color-secondary, #e5e7eb)',
                      borderRight: isDarkMode ? '1px solid #4E5762' : '1px solid var(--color-secondary, #e5e7eb)',
                      borderLeft: 'none',
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      borderTopRightRadius: 12,
                      borderBottomRightRadius: 12,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      paddingLeft: 16,
                      paddingRight: 16,
                      paddingTop: 12,
                      paddingBottom: 12,
                      fontSize: '16px',
                      background: isDarkMode ? '#3F4853' : 'var(--color-surface, #fff)',
                      color: isDarkMode ? 'white' : 'var(--color-text, #1e293b)',
                    }}
                  />
                </InputGroup>
              </Form>
            </div>
          </div>

          <div className="row g-4">
            {filteredProjects.length === 0 && (
              <div className="col-12">
                <div className="alert alert-danger text-center bg-transparent" style={{
                  backgroundColor: isDarkMode ? '#3F4853' : 'transparent',
                  border: isDarkMode ? '1px solid #4E5762' : '1px solid border-danger',
                  color: isDarkMode ? 'white' : 'text-danger'
                }}>
                  No dashboards match your search.
                </div>
              </div>
            )}
            {filteredProjects.map(card => (
              <div key={card.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <div className="card h-100 shadow-sm border-0 overflow-hidden" style={{
                  backgroundColor: isDarkMode ? '#3F4853' : '',
                  border: isDarkMode ? '1px solid #4E5762' : ''
                }}>
                  <div className="card-img-top overflow-hidden" style={{ height: '180px' }}>
                    <img
                      src={card.display_image_url}
                      className="w-100 h-100 object-cover"
                      alt={card.display_title}
                    />
                  </div>
                  <div className="card-body d-flex flex-column" style={{
                    color: isDarkMode ? 'white' : 'black'  // Changed from 'inherit' to 'black'
                  }}>
                    <h5 className="card-title fw-bold mb-3 text-truncate">
                      {card.display_title}
                    </h5>
                    <div className="mb-3">
                      <p className="mb-1 small" style={{ color: isDarkMode ? '#cbd5e1' : '#6b7280' }}>
                        <span className="fw-semibold">Project:</span> {card.project.project_code}
                      </p>
                      <p className="mb-0 small" style={{ color: isDarkMode ? '#cbd5e1' : '#6b7280' }}>
                        <span className="fw-semibold">Maintainer:</span> {card.maintainer}
                      </p>
                    </div>
                    {card.component_name ? (
                      <Button
                        variant="primary"
                        className="w-100 d-flex align-items-center justify-content-center py-2 mt-auto"
                        style={{
                          backgroundColor: '#4a6bff',
                          border: 'none',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => handleDashboardClick(card.component_name, card)}
                      >
                        Explore Dashboard
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-100 d-flex align-items-center justify-content-center py-2 mt-auto"
                        style={{
                          border: 'none',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease',
                          backgroundColor: isDarkMode ? '#4E5762' : '',
                          color: isDarkMode ? 'white' : 'inherit'
                        }}
                        disabled
                      >
                        No Dashboard Available
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </main>
    </div>
  );
}

export default Collections;