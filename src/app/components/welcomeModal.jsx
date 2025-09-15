"use client";
import React, { useEffect, useState } from 'react';
import { Modal, Button,Form } from 'react-bootstrap';
//import '@/components/css/welcomemodal.css';
import { useDispatch } from 'react-redux';
import { setBaseMapLayer } from '@/app/GlobalRedux/Features/map/mapSlice';
const basemapOptions = [
  {
    key: "osm",
    label: "OpenTopoMap",
    img: "/basemaps/opentopo.png",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© Pacific Community SPC",
    option:'osm'
  },
  {
    key: "bing",
    label: "Satellite",
    img: "/basemaps/bing.png",
    url: "https://ocean-plotter.spc.int/plotter/cache/basemap/{z}/{x}/{y}.png",
    attribution: "© Pacific Community SPC | Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    option: "bing"
  },
  {
    key: "spc",
    label: "SPC OSM",
    img: "/basemaps/osm.png",
    url: "https://spc-osm.spc.int/tile/{z}/{x}/{y}.png",
    attribution: "© Pacific Community SPC",
    option:"opentopo"
  }
];

const WelcomeModal = () => {
  // Theme state for logo switching
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Function to check and update theme
    const checkTheme = () => {
      if (typeof window !== 'undefined') {
        const isDark = document.documentElement.classList.contains('dark-mode') || 
                      document.body.classList.contains('dark-mode');
        setIsDarkMode(isDark);
      }
    };
    checkTheme();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });
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
    return () => {
      observer.disconnect();
    };
  }, []);
  const dispatch = useDispatch();
  const [show, setShow] = useState(false);
  const [timesShown, setTimesShown] = useState(0);
  const [isChecked, setIsChecked] = useState(true);

  // Basemap selector state
  const [selectedBasemap, setSelectedBasemap] = useState(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = localStorage.getItem("basemap");
      if (stored) {
        try {
          const obj = JSON.parse(stored);
          return basemapOptions.find(o => o.url === obj.url)?.key || "bing";
        } catch {
          return "bing";
        }
      }
    }
    return "bing";
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const storedCount = localStorage.getItem('modalShownCount');
      if (storedCount) {
        const count = parseInt(storedCount, 10);
        setTimesShown(count);
        if (count < 500) {
          setShow(true);
        }
      } else {
        localStorage.setItem('modalShownCount', '0');
        setTimesShown(0);
        setShow(true);
      }
    }
  }, []);

  // Set basemap in localStorage and Redux when selected
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const basemapObj = basemapOptions.find(o => o.key === selectedBasemap);
      if (basemapObj) {
        localStorage.setItem("basemap", JSON.stringify({ url: basemapObj.url, attribution: basemapObj.attribution,option:basemapObj.option }));
        dispatch(setBaseMapLayer({ url: basemapObj.url, attribution: basemapObj.attribution,option:basemapObj.option }));
      }
    }
  }, [selectedBasemap, dispatch]);

  const handleClose = () => {
    const newCount = timesShown + 1;
    setTimesShown(newCount);
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem('modalShownCount', newCount.toString());
    }
    setShow(false);
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    e.target.blur();
    setIsChecked(!checked);
    if (!checked) {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("modalShownCount", 500);
      }
      setTimesShown(500);
      setShow(false);
    }
  };

  const handleBasemapChange = (key) => {
    setSelectedBasemap(key);
  };

  function randomGreeting() {
    const greetings = [
      "Halo olaketa!",
      "Bula!",
      "Talofa!",
      "Malo e lelei!",
      "Mauri!"
    ];
    const randomIndex = Math.floor(Math.random() * greetings.length);
    return greetings[randomIndex];
  }

return (
    <Modal
        show={show}
        onHide={handleClose}
        centered
        className="custom-welcome-modal"
        size="lg"
        contentClassName="custom-welcome-modal-content"
    >
        <Modal.Header
            closeButton
            closeVariant="white"
            className="custom-welcome-modal-header"
        >
            <Modal.Title className="custom-welcome-modal-title">{randomGreeting()}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="custom-welcome-modal-body">
            <h4 className="text-center custom-welcome-title">Welcome to Pacific Ocean Portal!</h4>
            {/* Basemap Selector */}
            <div>
                <h5 className="mb-2 custom-basemap-label">Choose your Base Map:</h5>
                <div className="d-flex flex-wrap justify-content-center custom-basemap-options">
                    {basemapOptions.map(opt => (
                        <div
                            key={opt.key}
                            className={`custom-basemap-card${selectedBasemap === opt.key ? ' selected' : ''}`}
                            onClick={() => handleBasemapChange(opt.key)}
                            tabIndex={0}
                            aria-label={`Select ${opt.label} base map`}
                        >
                            <img
                                src={opt.img}
                                alt={opt.label}
                                className="custom-basemap-img"
                            />
                            <div className="custom-basemap-label-text">{opt.label}</div>
                        </div>
                    ))}
                </div>
                <div className="custom-basemap-alert">
                    For <strong>High Performance</strong> and fast loading on <strong>Low bandwidth Connections</strong>, it is recommended to use the <strong>SPC OSM</strong> basemap.
                </div>
            </div>
            <p className="custom-section-label">Countries supported:</p>
            <div className="logos d-flex flex-wrap justify-content-center custom-country-logos">
                <img className="img-fluid" src="/COSSPac_country_territories.png" alt="supported-services" width="100%" />
            </div>
            <p className="custom-section-label" style={{paddingTop:5}}>Developed & Maintained By:</p>
            <div className="logos d-flex flex-wrap justify-content-center custom-org-logo">
                <img
                    className="img-fluid"
                    src={isDarkMode ? "/logos/SPC_white.png" : "/logos/SPC.png"}
                    alt="supported-services"
                    width={isDarkMode ? "25%" : "17%"}
                    height={isDarkMode ? "10%" : "10%"}
                    style={isDarkMode ? {marginBottom:-30} : {marginBottom:0}}
                />
            </div>
            <br />
            <p className="custom-contact text-center">Contact us: cosppac@spc.int</p>
             <div className="custom-basemap-alert2">
                    To access <strong>Legacy</strong> ocean portal,{' '}
                    <a
                        href="https://legacy-oceanportal.spc.int"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'underline', fontWeight: 'bold', color: 'inherit' }}
                    >
                        click here
                    </a>
             </div>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between align-items-center custom-welcome-modal-footer">
            <Form.Group controlId="setModalCount" className="mb-0 d-flex align-items-center">
                <Form.Check
                    type="checkbox"
                    checked={isChecked}
                    onChange={handleCheckboxChange}
                    style={{ marginRight: "8px", borderRadius: "0" }}
                />
                <Form.Label className="custom-footer-label">
                    Show at start-up
                </Form.Label>
            </Form.Group>
            <Button
                variant="secondary"
                onClick={handleClose}
                size="sm"
                className="custom-footer-close-btn"
                aria-label="Close welcome modal"
            >
                Close
            </Button>
        </Modal.Footer>
        <style jsx global>{`
            .custom-welcome-modal .modal-content,
            .custom-welcome-modal-content {
                background: var(--modal-bg, #232b36);
                color: var(--modal-text, #f1f5f9);
                border-radius: 0px;
                border: none;
                box-shadow: 0 8px 32px rgba(0,0,0,0.25);
                padding: 0;
            }
            html.light-mode .custom-welcome-modal .modal-content,
            html.light-mode .custom-welcome-modal-content {
                --modal-bg: #fff;
                --modal-text: #1e293b;
            }
            .custom-welcome-modal-header {
                background: #3F51B5 !important;
                border-bottom: 1px solid #38404a;
                min-height: 38px;
                padding: 8px 18px 6px 18px;
                border-radius: 0 !important;
            }
            html.light-mode .custom-welcome-modal-header {
                background: #3F51B5 !important;
                border-bottom: 1px solid #e2e8f0;
                border-radius: 0 !important;
            }
            .custom-welcome-modal-title {
                color: #fff;
                font-size: 1.1rem;
                font-weight: 600;
                margin: 0;
            }
            html.light-mode .custom-welcome-modal-title {
                color: #fff;
            }
            .custom-welcome-modal-body {
                padding: 18px 24px 0 24px;
            }
            .custom-welcome-title {
                margin-top: 0;
                margin-bottom: 18px;
                font-size: 1.45rem;
                font-weight: 700;
                color: var(--modal-text, #f1f5f9);
            }
            .custom-basemap-label {
                color: var(--modal-text, #f1f5f9);
                font-size: 1rem;
                font-weight: 500;
            }
            .custom-basemap-options {
                gap: 28px;
                margin-bottom: 10px;
            }
            .custom-basemap-card {
                border: 1.5px solid #d0d5dc;
                border-radius: 8px;
                padding: 7px 7px 4px 7px;
                text-align: center;
                cursor: pointer;
                background: #fff;
                width: 120px;
                box-shadow: 0 2px 12px rgba(63,81,181,0.10);
                transition: border 0.18s, background 0.18s;
            }
            .custom-basemap-card.selected {
                border: 2.5px solid #2563eb;
                background: #f4f7ff;
            }
            .custom-basemap-img {
                width: 98px;
                height: 62px;
                object-fit: cover;
                border-radius: 5px;
                margin-bottom: 4px;
                box-shadow: 0 0 0 2px transparent;
            }
            .custom-basemap-card.selected .custom-basemap-img {
                box-shadow: 0 0 0 2px #2563eb;
            }
            .custom-basemap-label-text {
                font-size: 13px;
                font-weight: 500;
                color: #232b36;
            }
            .custom-basemap-alert {
                background: #FCF2CD;
                border: 1px solid #ffe58f;
                color: #846402;
                border-radius: 6px;
                padding: 8px 12px;
                margin-bottom: 14px;
                font-size: 15px;
            }
            html.light-mode .custom-basemap-alert {
                background: #FCF2CD;
                border: 1px solid #ffe58f;
                color: #846402;
            }
            .custom-basemap-alert2 {
                background: #D1EBF1;
                border: 1px solid #CCE5FF;
                color: #18545F;
                border-radius: 6px;
                padding: 8px 12px;
                margin-bottom: 14px;
                font-size: 15px;
            }
            html.light-mode .custom-basemap-alert2 {
                background: #D1EBF1;
                border: 1px solid #CCE5FF;
                color: #18545F;
            }
            .custom-divider {
                border: none;
                border-top: 1px solid #38404a;
                margin: 18px 0 12px 0;
            }
            html.light-mode .custom-divider {
                border-top: 1px solid #e2e8f0;
            }
            .custom-section-label {
                color: var(--modal-text, #f1f5f9);
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 6px;
            }
            html.light-mode .custom-section-label {
                color: #232b36;
            }
            .custom-country-logos {
                gap: 1px;
                max-width: 100%;
            }
            .custom-org-logo {
                gap: 5px;
                max-width: 100%;
            }
            .custom-contact {
                color: var(--modal-text, #f1f5f9);
                font-size: 15px;
            }
            html.light-mode .custom-contact {
                color: #232b36;
            }
            .custom-welcome-modal-footer {
                background: transparent;
                border-top: 1px solid #38404a;
                padding: 8px 18px 8px 18px;
            }
            html.light-mode .custom-welcome-modal-footer {
                border-top: 1px solid #e2e8f0;
            }
            .custom-footer-label {
                font-size: 13px;
                margin-bottom: 0;
            }
            .custom-footer-close-btn {
                border-radius: 0;
                padding: 5px 10px;
            }
        `}</style>
    </Modal>
);
};

export default WelcomeModal;