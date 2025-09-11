"use client";
import { useState, useCallback, useEffect } from "react";
import dynamic from 'next/dynamic';
import styles from "./page.module.css";
import Sidebar from "../components/sidebar";
import ExploreModal from "../components/Modal";
import { useAppDispatch, useAppSelector } from '@/app/GlobalRedux/hooks';
import { showModaler, hideModal } from '@/app/GlobalRedux/Features/modal/modalSlice';
import Lottie from 'lottie-react';
import GlobeAnim from '../components/lottie/Globe.json';

// Dynamically import main map component
const GetMap = dynamic(() => import('../components/get_map'), { 
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Lottie
        animationData={GlobeAnim}
        loop
        autoplay
        style={{ width: 160, height: 160, opacity: 0.9 }}
        aria-label="Loading map"
      />
    </div>
  )
});

export default function ExplorerPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const dispatch = useAppDispatch();
  const modalVisible = useAppSelector(state => state.modal.isVisible);

  const openModal = useCallback(() => dispatch(showModaler()), [dispatch]);
  const closeModal = useCallback(() => dispatch(hideModal()), [dispatch]);

  // Show loader immediately; hide when the map element is present
  useEffect(() => {
    // If map already present, hide
    const existing = document.getElementById('map');
    if (existing) { setShowLoader(false); return; }

    const observer = new MutationObserver(() => {
      const el = document.getElementById('map');
      if (el) {
        setShowLoader(false);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Safety timeout to avoid a stuck loader
    const to = setTimeout(() => setShowLoader(false), 8000);
    return () => { observer.disconnect(); clearTimeout(to); };
  }, []);

  return (
    <div className={styles.explorerLayout}>
      <Sidebar collapsed={collapsed} onToggle={setCollapsed} onOpenMapData={openModal} />
      <main className={styles.mapContainer} style={{ position: 'relative' }}>
        {showLoader && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', zIndex: 10
          }}>
            <Lottie
              animationData={GlobeAnim}
              loop
              autoplay
              style={{ width: 160, height: 160, opacity: 0.9 }}
              aria-label="Loading map"
            />
          </div>
        )}
        <GetMap />
      </main>
      <ExploreModal show={modalVisible} onClose={closeModal} title="Explore Map Data" />
    </div>
  );
}

