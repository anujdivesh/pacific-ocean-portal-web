// app/loading.jsx
"use client";

import { useEffect } from 'react';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
//import '@/components/css/nprogress.css';
// Configure NProgress
NProgress.configure({
  minimum: 0.3,
  easing: 'ease',
  speed: 500,
  showSpinner: false,
  trickleSpeed: 200,
});

export default function Loading() {
  useEffect(() => {
    // Ensure our NProgress CSS overrides persist globally and don't get
    // torn down on unmount (which can cause a brief revert to defaults)
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const STYLE_ID = 'nprogress-style-override';
      let styleTag = document.getElementById(STYLE_ID);
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = STYLE_ID;
        styleTag.type = 'text/css';
        styleTag.appendChild(
          document.createTextNode(`
            #nprogress .bar { background: #C7D444 !important; height: 5px !important; }
            #nprogress .peg { box-shadow: 0 0 10px #FFBB00, 0 0 5px #FFBB00 !important; }
          `)
        );
        document.head.appendChild(styleTag);
      }
    }

    NProgress.start();
    
    return () => {
      NProgress.done();
    };
  }, []);

  return (
    <div className="flex justify-center items-center h-screen">
      {/* Your existing loading spinner/indicator */}
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white-500"></div>
    </div>
  );
}