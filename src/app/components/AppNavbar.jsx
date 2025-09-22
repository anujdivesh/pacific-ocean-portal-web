"use client";
import Link from "next/link";
import { Navbar, Nav, NavDropdown, Container, Modal, Button, Form } from "react-bootstrap";
import { usePathname } from "next/navigation";
import styles from "./AppNavbar.module.css";
// import "./navbar_mobile.css";
import { useState, useEffect, useActionState } from "react";
import { FaToggleOn, FaToggleOff, FaSun, FaMoon, FaBars } from "react-icons/fa";
import { login, logout as logoutServer } from "@/app/login/action";
import { useAppSelector, useAppDispatch } from "@/app/GlobalRedux/hooks";
import { login as loginAction, logout as logoutAction, updateCountry, updateToken } from "@/app/GlobalRedux/Features/auth/authSlice";
import { setShortName as setCountryShort } from "@/app/GlobalRedux/Features/country/countrySlice";

export default function AppNavbar({ logoutButtonSize = 'sm' }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Server action state for login
  const [loginState, formAction, loginPending] = useActionState(login, null);
  const dispatch = useAppDispatch();
  const isLoggedin = useAppSelector((state) => state.auth?.isLoggedin);
  const userCountry = useAppSelector((state) => state.auth?.country);
  const selectedRegionId = useAppSelector((state) => state.country?.short_name);
  const [flagSrc, setFlagSrc] = useState(null);
  const authed = !!isLoggedin;

  const links = [
    { href: "/explorer", label: "Explorer" },
    { href: "/collections", label: "Collections" },
    { href: "/library", label: "Library" },
    { href: "/about", label: "About Us" }
  ];

  const isActive = (href) => {
    if (href === "/explorer" && (pathname === "/")) return true; // root redirect case
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Mark mounted once on client
  useEffect(() => { setMounted(true); }, []);

  // On mount, initialize theme from localStorage or existing class
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Hydrate auth from localStorage if present (client-only)
    try {
      const is = localStorage.getItem('auth:isLoggedin');
      if (is === '1') {
        dispatch(loginAction());
        const c = localStorage.getItem('auth:country');
        if (c) dispatch(updateCountry(c)); 
        const t = localStorage.getItem('auth:token'); 
        if (t) dispatch(updateToken(t));
      }
    } catch {}

    const stored = localStorage.getItem('theme');
    if (stored === 'dark') { setDark(true); return; }
    if (stored === 'light') { setDark(false); return; }
    // Default to dark mode if no theme preference is stored
    setDark(true);
    // Fallback: detect if class already present (e.g. from prior hot reload)
    if (document.documentElement.classList.contains('dark-mode') || document.body.classList.contains('dark-mode')) {
      setDark(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window !== "undefined") {
      const html = document.documentElement;
      const body = document.body;
      // Clear both first
      html.classList.remove('dark-mode','light-mode');
      body.classList.remove('dark-mode','light-mode');
      if (dark) {
        html.classList.add('dark-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
      } else {
        html.classList.add('light-mode');
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [dark, mounted]);

  // Close modal on successful login
  useEffect(() => {
    if (loginState && loginState.success) {
      setShowLoginModal(false);
      // Update Redux auth state so UI reacts immediately
      try { dispatch(loginAction()); } catch {}
      try {
        if (loginState.countryId) dispatch(updateCountry(loginState.countryId));
        if (loginState.token) dispatch(updateToken(loginState.token));
      } catch {}
      // Sync country slice to reflect selected country for flags
      try {
        if (loginState.countryId) dispatch(setCountryShort(loginState.countryId));
      } catch {}
      // Persist lightweight auth signal for client hydration
      try { 
        localStorage.setItem('auth:isLoggedin', '1');
        if (loginState.countryId) {
          localStorage.setItem('auth:country', String(loginState.countryId));
          // Also update region selection for flag
          localStorage.setItem('selectedRegion', String(loginState.countryId));
        }
        if (loginState.token) { 
          localStorage.setItem('auth:token', loginState.token); 
        }
      } catch {}
    }
  }, [loginState]);

  // Minimal countries map for flags
  const countriesxxx = [
    { id: 26, short_name: "PCN" },
    { id: 14, short_name: "VUT" },
    { id: 13, short_name: "SLB" },
    { id: 12, short_name: "WSM" },
    { id: 10, short_name: "PLW" },
    { id: 8,  short_name: "NRU" },
    { id: 2,  short_name: "FJI" },
    { id: 1,  short_name: "PAC" },
    { id: 3,  short_name: "TON" },
    { id: 5,  short_name: "FSM" },
    { id: 6,  short_name: "KIR" },
    { id: 9,  short_name: "NIU" },
    { id: 11, short_name: "PNG" },
    { id: 4,  short_name: "TUV" },
    { id: 7,  short_name: "MHL" },
    { id: 16, short_name: "COK" },
    { id: 18, short_name: "ASM" },
    { id: 19, short_name: "WLF" },
    { id: 20, short_name: "NCL" },
    { id: 21, short_name: "TKL" },
    { id: 22, short_name: "PYF" },
    { id: 23, short_name: "MNP" },
    { id: 24, short_name: "GUM" },
  ];

  const getCountryFlag = (id) => {
    const country = countriesxxx.find((c) => c.id === Number(id));
    if (!country || country.short_name === 'PAC') return null;
    return `/flags/${country.short_name}.png`;
  };

  // Decide which flag to show after mount to avoid SSR/CSR mismatch
  useEffect(() => {
    if (!mounted) return;
    try {
      const persisted = typeof window !== 'undefined' ? localStorage.getItem('selectedRegion') : null;
      // Prefer live sidebar selection, then login country, then persisted localStorage
      const chosen = selectedRegionId ?? userCountry ?? persisted;
      if (chosen) {
        setFlagSrc(getCountryFlag(chosen));
      } else {
        setFlagSrc(null);
      }
    } catch {
      setFlagSrc(null);
    }
  }, [mounted, selectedRegionId, userCountry]);

  const handleLogout = async () => {
    try { await logoutServer(); } catch {}
    try { dispatch(logoutAction()); } catch {}
    try { localStorage.removeItem('selectedRegion'); } catch {}
    setFlagSrc(null);
    try {
      localStorage.removeItem('auth:isLoggedin');
      localStorage.removeItem('auth:country');
      localStorage.removeItem('auth:token');
    } catch {}
  };

  return (
    <>
      {/* Navbar */}
      <Navbar 
        expand="lg" 
        className={styles.navbarCustom}
        expanded={expanded}
        onToggle={setExpanded}
      >
        <Container fluid className={styles.navbarContainer}>
          <div className={styles.navbarFlex}>
            <div className={styles.brandWrapper}>
              <Navbar.Brand as={Link} href="/" className={styles.navbarBrand}>
                {flagSrc && (
                  <span className={styles.flagContainer}>
                    <img src={flagSrc} className={styles.flagImage} onError={(e) => { e.currentTarget.style.display='none'; }} />
                  </span>
                )}
                <span className={styles.logoContainer}>
                  <img
                    src="/COSPPaC_white_crop2.png"
                    className={styles.logoImage}
                  />
                </span>
                <span 
                  className={styles.brandText}
                  style={{
                    color: dark ? '#5FA4FA' : '#0065f8'
                  }}
                >
                  Pacific Ocean Portal
                </span>
              </Navbar.Brand>
            </div>
            
            {/* Mobile toggle button */}
            <Navbar.Toggle 
              aria-controls="basic-navbar-nav" 
              className={styles.navbarToggle}
            >
              <FaBars />
            </Navbar.Toggle>
            
            <Navbar.Collapse id="basic-navbar-nav" className={styles.navbarCollapse}>
              <Nav className={styles.navbarNav}>
                {links.map(l => (
                  <Nav.Link
                    key={l.href}
                    as={Link}
                    href={l.href}
                    active={isActive(l.href)}
                    className={`${styles.navLinkBase} ${isActive(l.href) ? styles.activeNav : ''}`}
                    onClick={() => setExpanded(false)}
                  >
                    {l.label}
                  </Nav.Link>
                ))}
                {authed ? (
                  <div className={styles.logoutButtonContainer}>
                    <Button onClick={handleLogout} size={logoutButtonSize} variant="success" className={styles.logoutButton}>
                      Logout
                    </Button>
                  </div>
                ) : (
                  <NavDropdown 
                    title="Login" 
                    id="login-dropdown" 
                    align="end" 
                    className={styles.loginDropdown}
                  >
                    <NavDropdown.Item
                      onClick={() => {
                        setShowLoginModal(true);
                        setExpanded(false);
                      }}
                      className={styles.dropdownItem}
                    >
                      Login
                    </NavDropdown.Item>
                    <NavDropdown.Item
                      onClick={() => {
                        setShowSignupModal(true);
                        setExpanded(false);
                      }}
                      className={styles.dropdownItem}
                    >
                      Signup
                    </NavDropdown.Item>
                  </NavDropdown>
                )}
                <div className={styles.themeToggleWrap}>
                  <button
                    onClick={() => setDark(d => !d)}
                    aria-label={dark ? 'Dark mode enabled' : 'Light mode enabled'}
                    className={styles.themeToggleButton}
                  >
                    {dark ? <FaToggleOn size={24} /> : <FaToggleOff size={20} />}
                  </button>
                  <span className={styles.themeIcon}>
                    {dark ? <FaSun size={18} /> : <FaMoon size={16} />}
                  </span>
                </div>
              </Nav>
            </Navbar.Collapse>
          </div>
        </Container>
      </Navbar>

      {/* Login Modal */}
      <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)} centered>
        <Modal.Header 
          closeButton 
          closeVariant="white"
          style={{ 
            background: '#3F51B5', 
            color: '#fff', 
            borderBottom: '1px solid #38404a', 
            minHeight: '38px', 
            padding: '8px 18px 6px 18px', 
            borderRadius: 0 
          }}
        >
          <Modal.Title style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>Login</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: 'var(--nav-bg)', color: 'var(--nav-fg)' }}>
          <Form action={formAction}>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                className={styles.loginModalInput}
                name="username"
                placeholder="Enter username"
                required
                style={{
                  background: 'var(--nav-bg)',
                  color: 'var(--nav-fg)',
                  border: `1px solid ${dark ? '#6A717D' : 'var(--panel-border)'}`,
                }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                className={styles.loginModalInput}
                type="password"
                name="password"
                placeholder="Enter password"
                required
                style={{
                  background: 'var(--nav-bg)',
                  color: 'var(--nav-fg)',
                  border: `1px solid ${dark ? '#6A717D' : 'var(--panel-border)'}`,
                }}
              />
            </Form.Group>
            {loginState && loginState.errors && (
              <div className="alert alert-danger py-2" role="alert">
                {loginState.errors.username?.map((m, i) => (<div key={i}>{m}</div>))}
                {loginState.errors.password?.map((m, i) => (<div key={i}>{m}</div>))}
              </div>
            )}
            <div className="d-grid">
              <Button type="submit" disabled={loginPending} style={{ background: '#D4DD6A', color: dark ? '#fff' : '#000', border: 'none', fontWeight: 600 }}>
                {loginPending ? 'Logging in…' : 'Login'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Signup Modal */}
      <Modal show={showSignupModal} onHide={() => setShowSignupModal(false)} centered>
        <Modal.Header 
          closeButton 
          closeVariant="white"
          style={{ 
            background: '#3F51B5', 
            color: '#fff', 
            borderBottom: '1px solid #38404a', 
            minHeight: '38px', 
            padding: '8px 18px 6px 18px', 
            borderRadius: 0 
          }}
        >
          <Modal.Title style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>Signup</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: 'var(--nav-bg)', color: 'var(--nav-fg)' }}>
          <p style={{ margin: 0 }}>
            Please contact <a href="mailto:cosppac@spc.int" style={{ color: '#3b82f6', textDecoration: 'underline' }}>cosppac@spc.int</a> for registration.
          </p>
        </Modal.Body>
        <Modal.Footer style={{ background: 'var(--nav-bg)', color: 'var(--nav-fg)', borderTop: '1px solid var(--panel-border)' }}>
          <Button variant="secondary" onClick={() => setShowSignupModal(false)} style={{ border: '1px solid var(--panel-border)' }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}