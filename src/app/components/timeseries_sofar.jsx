//'use client';
import React, { useState, useEffect, useRef,Suspense } from 'react';
import { Spinner, Form, Button } from 'react-bootstrap'; 
import { Line } from 'react-chartjs-2'; 
import 'chart.js/auto'; 
import { useAppSelector } from '@/app/GlobalRedux/hooks';
import Lottie from "lottie-react";
import animationData from "./lottie/live.json";
import { get_url } from './urls';
import './timeseries_sofar_mobile.css';

//const Line = lazy(() => import('react-chartjs-2').then((mod) => ({ default: mod.Line })));

const fixedColors = [
  'rgb(255, 87, 51)',
  'rgb(153, 102, 255)', 
  'rgb(255, 206, 86)', 
  'rgb(54, 162, 235)', 
  'rgb(255, 99, 132)', 
  'rgb(75, 192, 192)', 
];

const getColorByIndex = (index) => {
  return fixedColors[index] || 'rgb(169, 169, 169)'; 
};

function TimeseriesSofar({ height, data }) {
  // Detect dark mode
  const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
  const mainTextColor = isDarkMode ? '#fff' : '#181c20';
  const mapLayer = useAppSelector((state) => state.mapbox.layers);
  const lastlayer = useRef(0);
  const { x, y, sizex, sizey, bbox, station, country_code, display_name } = data || {};

//  console.log( { x, y, sizex, sizey, bbox, station, country_code, display_name })
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  // Reset chartData when station changes to avoid stale plots
  useEffect(() => {
    setChartData({ labels: [], datasets: [] });
  }, [station]);
  const dataLimitFromRedux = useAppSelector((state) => state.mapbox.dataLimit);
  const [isLoading, setIsLoading] = useState(false);
  const [enabledChart, setEnabledChart] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [dataLimit, setDataLimit] = useState(() => {
    console.log('Initial dataLimitFromRedux:', dataLimitFromRedux);
    return dataLimitFromRedux || 100;
  });
  // Separate date and time controls for better control over defaults
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedStartTime, setAppliedStartTime] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [appliedEndTime, setAppliedEndTime] = useState("");
  const refreshIntervalRef = useRef(null);
  const lastRequestRef = useRef(null); // Store {url, timestamp} of last request
  const [themeVersion, setThemeVersion] = useState(0);

  // Extract min/max dates from current chart data and populate date inputs
  useEffect(() => {
    if (chartData.labels && chartData.labels.length > 0) {
      // Parse the formatted labels back to dates to find min/max
      const dates = chartData.labels.map(label => {
        // Labels are in format: DD-MM-YYTHH:MM, convert to proper date
        const [datePart, timePart] = label.split('T');
        const [day, month, year] = datePart.split('-');
        const fullYear = `20${year}`; // Convert YY to 20YY
        return new Date(`${fullYear}-${month}-${day}T${timePart}:00`);
      }).filter(date => !isNaN(date.getTime()));

      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        // Format dates for date inputs (YYYY-MM-DD)
        const formatDateForInput = (date) => {
          return date.toISOString().split('T')[0];
        };
        
        const minDateStr = formatDateForInput(minDate);
        const maxDateStr = formatDateForInput(maxDate);
        
        // Only update if dates are different from current values
        if (startDate !== minDateStr || endDate !== maxDateStr) {
          setStartDate(minDateStr);
          setEndDate(maxDateStr);
          
          // DO NOT auto-update applied dates - only update them when user clicks Apply
          // setAppliedStartDate(minDateStr);
          // setAppliedEndDate(maxDateStr);
        }
      }
    }
  }, [chartData.labels, dataLimit]); // Re-run when chart data or data limit changes
  useEffect(() => {
    if (dataLimitFromRedux && dataLimitFromRedux !== dataLimit) {
      console.log('Updating dataLimit from Redux:', dataLimitFromRedux);
      setDataLimit(dataLimitFromRedux);
    }
  }, [dataLimitFromRedux]);
  const isCoordinatesValid = station !== null;
  const isActive = y === 'TRUE';

  // Add dark mode styles for date picker
  useEffect(() => {
    const styleId = 'date-picker-dark-mode';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Force dark theme on date/time inputs */
        .dark-mode #timeseries-sofar input[type="date"],
        .dark-mode #timeseries-sofar input[type="time"] {
          color-scheme: dark !important;
          background: var(--color-surface, #2d3748) !important;
          color: var(--color-text, #ffffff) !important;
          border: 1px solid var(--color-secondary, #4a5568) !important;
        }
        
        /* Calendar/time picker indicator color */
        .dark-mode #timeseries-sofar input[type="date"]::-webkit-calendar-picker-indicator,
        .dark-mode #timeseries-sofar input[type="time"]::-webkit-calendar-picker-indicator {
        color:#ffffff!important;
          cursor: pointer;
        }
        body:not(.dark-mode) #timeseries-sofar input[type="date"]::-webkit-calendar-picker-indicator,
        body:not(.dark-mode) #timeseries-sofar input[type="time"]::-webkit-calendar-picker-indicator {
          filter: none;
          opacity: 1;
          cursor: pointer;
        }
        
        /* Text content styling */
        .dark-mode #timeseries-sofar input[type="date"]::-webkit-datetime-edit,
        .dark-mode #timeseries-sofar input[type="time"]::-webkit-datetime-edit,
        .dark-mode #timeseries-sofar input[type="date"]::-webkit-datetime-edit-text,
        .dark-mode #timeseries-sofar input[type="time"]::-webkit-datetime-edit-text,
        .dark-mode #timeseries-sofar input[type="date"]::-webkit-datetime-edit-month-field,
        .dark-mode #timeseries-sofar input[type="time"]::-webkit-datetime-edit-hour-field,
        .dark-mode #timeseries-sofar input[type="date"]::-webkit-datetime-edit-day-field,
        .dark-mode #timeseries-sofar input[type="time"]::-webkit-datetime-edit-minute-field,
        .dark-mode #timeseries-sofar input[type="date"]::-webkit-datetime-edit-year-field,
        .dark-mode #timeseries-sofar input[type="time"]::-webkit-datetime-edit-ampm-field {
          color: var(--color-text, #ffffff) !important;
        }
        
        /* Focus states */
        .dark-mode #timeseries-sofar input[type="date"]:focus,
        .dark-mode #timeseries-sofar input[type="time"]:focus {
          outline: 2px solid #0d6efd;
          outline-offset: -1px;
        }
        
      `;
      document.head.appendChild(style);
    }
    
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  function getValueByKey(key) {
    const keyValuePairs = {
        'SPC': 'c3abab55e2e549f02fdb683bd936c7',
        'FMS': 'b9f2c081116e70f44152dd9aa45dcb',
        'KMS': 'e62e5e58efac587d2c7eb4a1d938b0',
        'SamoaMet': 'e5c7ab12898f4414c0acf817b4bbde',
        'TongaMet': '743acb9023dec1ef847d5651596352',
        'TMS': '99a920305541f1c38db611ebab95ba',
        'NMS':'2a348598f294c6b0ce5f7e41e5c0f5'
    };
    return keyValuePairs[key] || null;
  }

  function generateWaveDataUrl(spotterId, token) {
    if (!spotterId) return ""; // Prevent .toString error if undefined
    const baseUrl = get_url('insitu-station');
    return `${baseUrl}/${spotterId.toString()}?limit=${dataLimit}`;
  }

  // Combine separate date and time into ISO format
  function getCombinedDateTime(date, time, role = 'start') {
    if (!date) return "";
    const timeToUse = time || (role === 'start' ? '00:00' : '23:59');
    
    // Add appropriate seconds based on role
    const seconds = role === 'start' ? '00' : '59';
    
    // Create the datetime string directly as UTC to avoid timezone issues
    const isoString = `${date}T${timeToUse}:${seconds}Z`;
    
    // Validate the date format
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return "";
    
    return isoString;
  }

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
  };

  const handleStartTimeChange = (e) => {
    setStartTime(e.target.value);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
  };

  const handleEndTimeChange = (e) => {
    setEndTime(e.target.value);
  };

  const fetchWaveData = async (url, setDataFn) => {
    try {
      if (!url) {
        setDataFn([], []);
        return;
      }
   
      // console.log('🔍 Fetching URL:', url);
      setIsLoading(true);

      // Avoid sending Content-Type or credentials for simple GET requests
      // which can trigger CORS preflight failures on some APIs.
      const res = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'omit',
      });

      // console.log('🔍 Response status:', res.status);
      // console.log('🔍 Response headers:', Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Fetch failed, status:', res.status, 'body:', text);
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      // console.log('🔍 Response data:', data);
      
      const waveData = data.data;
      const dataLabels = data.data_labels ? data.data_labels.split(',') : [];

      if (!waveData || waveData.length === 0) {
        // console.log('⚠️  No data returned from API');
        setDataFn([], []);
        return;
      }
  
      // data.data.forEach((entry, idx) => {
      //   console.log(`Entry ${idx}:`, entry);
      // });
    
  // Find the time label 
  const timeLabel = dataLabels.find(label => label.trim().toLowerCase() === 'time');
  if (!timeLabel) {
    throw new Error('No "time" label found in data_labels');
  }
  //y-axis datasets
  const yLabels = dataLabels.filter(label => label.trim() !== timeLabel);
    const times = waveData.map(entry => {
  const time = entry[timeLabel];
  // If time is ISO string, strip seconds and always append 'Z'
  if (typeof time === 'string') {
    // Match "T12:34:56", "T12:34:56.789", "T12:34", etc.
    // Remove seconds, keep "T12:34", and add 'Z' at the end
    const match = time.match(/^(.+T\d{2}:\d{2})/);
    const base = match ? match[1] : time;
    return base + 'Z';
  }
  // If time is a Date object, format as "YYYY-MM-DDTHH:MMZ"
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}Z`;
});

    // X-axis labels (format as UTC)
   /* const times = waveData.map(entry => {
      const time = entry[timeLabel];
      const date = new Date(time);      
      return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getFullYear()).slice(-2)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    });*/
      // Y-axis datasets (dynamic)
      const datasets = yLabels.map(label => ({
        label: label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
        values: waveData.map(entry => entry[label])
      }));
      setDataFn(times, datasets);
  } catch (error) {
    console.log(`Error fetching wave data:`, error);
    setDataFn([], []);
  } finally {
    setIsLoading(false);
  }
};

  // OLD ERDDAP fetch function (commented out, now using fetchWaveData for all APIs):
  // const fetchWaveDataV2 = async (url, setDataFn) => {
  //   try {
  //     if (!url) {
  //       setDataFn([], []);
  //       return;
  //     }
   
  //     setIsLoading(true);
  //     const res = await fetch(url, {
  //       method: 'GET',
  //       mode: 'cors',
  //       credentials: 'omit', // Fixes CORS for public ERDDAP
  //       headers: {
  //         'Accept': 'application/json',
  //       },
  //     });

  //     if (!res.ok) {
  //       throw new Error(`HTTP error! status: ${res.status}`);
  //     }

  //     const data = await res.json();
  //     const features = data.features;

  //     const times = features.map(feature => feature.properties.time);
  //     const waveHeights = features.map(feature => feature.properties.waveHs);
  //     const peakPeriods = features.map(feature => feature.properties.waveTp);
  //     const meanDirections = features.map(feature => feature.properties.waveDp);

  //     const formattedTimes = times.map(time => {
  //       const date = new Date(time);
  //       return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getFullYear()).slice(-2)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  //     });

  //     setDataFn(formattedTimes, [
  //       { values: waveHeights, label: 'Significant Wave Height (m)' },
  //       { values: peakPeriods, label: 'Peak Period (s)' },
  //       { values: meanDirections, label: 'Mean Direction (degrees)' }
  //     ]);
      
  //   } catch (error) {
  //     console.log(`Error fetching wave data:`, error);
  //     setDataFn([], []);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const setChartDataFn = (times, datasets) => {

    // console.log("START LABEL AND VALUE>>>>>>>>>>>>>>>");

    // console.log("<<<<<<<<<<< LABEL AND VALUE END");
    const indices = times.map((t, i) => i);
  indices.sort((a, b) => {
    // Parse custom format "DD-MM-YYTHH:MM" as UTC
    const parseCustom = (str) => {
      const [datePart, timePart] = str.split('T');
      const [day, month, year] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      return Date.UTC(
        parseInt('20' + year), // assumes YY is 25, so 2025
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );
    };
    return parseCustom(times[a]) - parseCustom(times[b]);
  });

  const sortedTimes = indices.map(i => times[i]);
  const sortedDatasets = datasets.map(ds => ({
    ...ds,
    values: indices.map(i => ds.values[i])
  }));
  //////////////SRTING TIMES///////////////// removed sortedTimes and sortedDatasets

    
    setChartData({
      labels: sortedTimes,
      datasets: sortedDatasets.map((dataset, index) => {
        // console.log(dataset)
        // Filter out -999 values by replacing them with null to create gaps
        const filteredValues = dataset.values.map(value => {
          // Check for -999 or similar missing data indicators
          if (value === -999 || value === "-999" || value === -999.0 || value === -999.9 || 
              value === null || value === undefined || 
              (typeof value === 'number' && isNaN(value))) {
            return null;
          }
          return value;
        });

        const baseConfig = {
          label: dataset.label,
          data: filteredValues,
          borderColor: getColorByIndex(index),
          backgroundColor: getColorByIndex(index),
          fill: false,
          tension: 0.4,
          cubicInterpolationMode: 'monotone',
          yAxisID: `y-axis-${index}`,
          spanGaps: false, // This ensures gaps are shown as breaks in the line
        };
  
        if (index === 2) {
          return {
            ...baseConfig,
            showLine: false,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointStyle: 'circle',
          };
        }
  
        return baseConfig;
      }),
    });
  };

  const toggleLiveMode = () => {
    if (isActive) {
      setLiveMode(!liveMode);
    }
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value);
    if (!isNaN(newLimit)) {
      setDataLimit(Math.min(1000, Math.max(1, newLimit)));
    }
  };

  useEffect(() => {
    // console.log('🔍 MAIN useEffect triggered - Dependencies:', {
    //   isCoordinatesValid, 
    //   enabledChart, 
    //   mapLayerLength: mapLayer.length, 
    //   station, 
    //   country_code, 
    //   liveMode, 
    //   isActive, 
    //   dataLimit
    // });
    
    const layerInformation = mapLayer[mapLayer.length - 1]?.layer_information;
    if (country_code !== "PACIOOS"){
    
    if (isCoordinatesValid && mapLayer.length > 0) {
      // Prevent duplicate calls by checking if same URL was called recently (within 1 second)
      var token = getValueByKey(x);
      let waveDataUrl = generateWaveDataUrl(station, token);
      const now = Date.now();
      
      if (lastRequestRef.current && 
          lastRequestRef.current.url === waveDataUrl && 
          now - lastRequestRef.current.timestamp < 1000) {
        // console.log('🚫 Skipping duplicate API call - same URL called recently');
        return;
      }

      const { timeseries_url } = layerInformation;
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      // Store this request info
      lastRequestRef.current = { url: waveDataUrl, timestamp: now };

      // NO date/time filters on initial load or data limit changes
      // console.log('🚀 Making API call (non-PACIOOS):', waveDataUrl);
      fetchWaveData(waveDataUrl, setChartDataFn);

      if (liveMode && isActive) {
        refreshIntervalRef.current = setInterval(() => {
          fetchWaveData(waveDataUrl, setChartDataFn);
        }, 1800000);
      }

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }
  else{
    if (isCoordinatesValid && mapLayer.length > 0) {
    // Prevent duplicate calls by checking if same URL was called recently (within 1 second)
    // OLD ERDDAP API (commented out):
    // const baseUrl = 'https://erddap.cdip.ucsd.edu/erddap/tabledap/wave_agg.geoJson';
    // const parameters = 'station_id,time,waveHs,waveTp,waveTa,waveDp,latitude,longitude';
    // const waveFlagPrimary = 1;
    // const url = `${baseUrl}?${parameters}&station_id="${station}"&waveFlagPrimary=${waveFlagPrimary}`;
    
    // NEW API using get_url('insitu-station'):
    const baseUrl = get_url('insitu-station');
    const url = `${baseUrl}/${station}?limit=${dataLimit}`;
    const now = Date.now();
    
    if (lastRequestRef.current && 
        lastRequestRef.current.url === url && 
        now - lastRequestRef.current.timestamp < 1000) {
      // console.log('� Skipping duplicate API call (PACIOOS) - same URL called recently');
      return;
    }

    // Store this request info
    lastRequestRef.current = { url, timestamp: now };

    // console.log('🚀 Making API call (PACIOOS):', url);
    // OLD: fetchWaveDataV2(url, setChartDataFn);
    // NEW: Use the same fetch function as non-PACIOOS
    fetchWaveData(url, setChartDataFn);

      if (liveMode && isActive) {
        refreshIntervalRef.current = setInterval(() => {
          // OLD: fetchWaveDataV2(url, setChartDataFn);
          // NEW: Use the same fetch function as non-PACIOOS
          fetchWaveData(url, setChartDataFn);
        }, 1800000);
      }

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }
  }, [isCoordinatesValid, enabledChart, mapLayer, station, country_code, liveMode, isActive, dataLimit]); // Removed applied date/time from dependencies

  // Separate effect that only runs when user clicks Apply (when applied dates change)
  useEffect(() => {
    const layerInformation = mapLayer[mapLayer.length - 1]?.layer_information;
    if (country_code !== "PACIOOS"){
    
    if (isCoordinatesValid && mapLayer.length > 0 && appliedStartDate && appliedEndDate) {      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      var token = getValueByKey(x);
      let waveDataUrl = generateWaveDataUrl(station, token);

      // Apply date/time filters when user clicked Apply
      if (appliedStartDate) {
        const startIso = getCombinedDateTime(appliedStartDate, appliedStartTime, 'start');
        if (startIso) waveDataUrl += `&start=${encodeURIComponent(startIso)}`;
      }
      if (appliedEndDate) {
        const endIso = getCombinedDateTime(appliedEndDate, appliedEndTime, 'end');
        if (endIso) waveDataUrl += `&end=${encodeURIComponent(endIso)}`;
      }

      fetchWaveData(waveDataUrl, setChartDataFn);

      if (liveMode && isActive) {
        refreshIntervalRef.current = setInterval(() => {
          fetchWaveData(waveDataUrl, setChartDataFn);
        }, 1800000);
      }

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
    }
    else{
      if (isCoordinatesValid && mapLayer.length > 0 && appliedStartDate && appliedEndDate) {
      const now = new Date();

      // Use applied datetimes 
      let startDateStr, endDateStr;

      if (appliedStartDate && appliedEndDate) {
        startDateStr = getCombinedDateTime(appliedStartDate, appliedStartTime, 'start');
        endDateStr = getCombinedDateTime(appliedEndDate, appliedEndTime, 'end');
      } else {
        // Fallback to default range if only partial dates applied
        const startDateObj = new Date(now);
        startDateObj.setDate(now.getDate() - 5);
        const formatDate = (date) => date.toISOString().slice(0, 19) + 'Z';
        startDateStr = formatDate(startDateObj);
        endDateStr = formatDate(now);
      }

      // Use your API instead of ERDDAP
      const baseUrl = get_url('insitu-station');
      const url = `${baseUrl}/${station}?limit=${dataLimit}`;

      // OLD: fetchWaveDataV2(url, setChartDataFn);
      // NEW: Use the same fetch function as non-PACIOOS
      fetchWaveData(url, setChartDataFn);

      if (liveMode && isActive) {
        refreshIntervalRef.current = setInterval(() => {
          // OLD: fetchWaveDataV2(url, setChartDataFn);
          // NEW: Use the same fetch function as non-PACIOOS
          fetchWaveData(url, setChartDataFn);
        }, 1800000);
      }

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
      }
    }
  }, [appliedStartDate, appliedStartTime, appliedEndDate, appliedEndTime, isCoordinatesValid, mapLayer, station, country_code, liveMode, isActive]);

  // MutationObserver to detect theme changes
useEffect(() => {
  if (typeof window === 'undefined') return;
  const updateTheme = () => setThemeVersion((v) => v + 1);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'class') {
        updateTheme();
      }
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}, []);

  if (isLoading) {
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
        <Spinner animation="border" role="status" variant="primary"/>
        <span style={{ marginLeft: '10px', fontSize: '18px' }}>Fetching data from API...</span>
      </div>
    );
  }

  if (!isCoordinatesValid || !station) {
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
        <p style={{ fontSize: 16 }}>Please select a station to view wave data.</p>
      </div>
    );
  }

  return (
    <div id="timeseries-sofar" style={{
      display: 'flex',
      flexDirection: 'column',
      height: `${height}px`,
      position: 'relative',
      background: 'transparent',
      color: mainTextColor
    }} key={themeVersion}>
      <div id="timeseries-top-container"  style={{ 
        height: '35px',
        display: 'flex', 
        alignItems: 'center',
        padding: '0 10px',
       // backgroundColor: 'var(--color-surface, #6F757F)',
        borderBottom: '1px solid var(--color-secondary, #6F757F)',
        flexShrink: 0,
        marginTop: '-10px',
        gap: '10px',
        color: 'var(--color-text, #181c20)',
        borderRadius:10
      }}>
        <Form.Check 
          type="switch"
          id="live-mode-switch"
          label=""
          checked={liveMode}
          onChange={toggleLiveMode}
          disabled={!isActive}
          style={{ 
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            transform: 'scale(1.2)',
            opacity: isActive ? 1 : 0.6
          }}
        />
        
        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text, #181c20)' }}>
          {liveMode && isActive ? (
            <>
              <Lottie
                animationData={animationData}
                style={{ width: 50, height: 50, marginRight: '-12px',marginTop:'-1px' }}
                loop={true}
              />
              <i className="fas fa-circle" style={{ fontSize: '12px', color: '#28a745', marginRight: '5px' }}></i>
            </>
          ) : (
            <i className="fas fa-circle" style={{ 
              fontSize: '12px', 
              color: isActive ? '#ccc' : '#ff6b6b',
              marginRight: '5px' 
            }}></i>
          )}
          <span style={{ 
            fontSize: '12px',
            color: !isActive ? '#ff6b6b' :mainTextColor
          }}>
            {isActive 
              ? `Live Mode ${liveMode ? '(Active - 30 min updates)' : '(Inactive)'}`
              : 'Live Mode Disabled (Station Inactive)'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text, #181c20)' }}>
          <span style={{ fontSize: '12px', marginRight: '5px', color: mainTextColor }}>Data Points:</span>
          <Form.Control
            type="number"
            value={dataLimit}
            onChange={handleLimitChange}
            min="1"
            max="1000"
            style={{ 
              width: '60px',
              height: '25px',
              fontSize: '12px',
              padding: '0 5px',
              background: 'var(--color-surface, #fff)',
              color: 'var(--color-text, #181c20)',
              border: '1px solid var(--color-secondary, #dee2e6)'
            }}
          />
           <style>
{`
  @keyframes pulse-text {
    0% {
      transform: scale(1);
      color: #1e90ff;
      text-shadow: 0 0 8px #1e90ff80;
    }
    50% {
      transform: scale(1.16);
      color: #1976d2;
      text-shadow: 0 0 20px #1e90ff;
    }
    100% {
      transform: scale(1);
      color: #1e90ff;
      text-shadow: 0 0 8px #1e90ff80;
    }
  }
  .pulse-utc {
    display: inline-block;
    animation: pulse-text 1.4s infinite;
    font-weight: bold;
    font-size: 15px;
    letter-spacing: 0.5px;
    padding-left: 10px;
    padding-top: 14px;
    color: #1e90ff;
    text-shadow: 0 0 6px #1e90ff80;
  }
`}
</style>
  <p style={{paddingLeft:10, paddingTop:14, fontSize:13, fontWeight:'bold', color: mainTextColor}}>
          Station Name: {display_name}

        </p>
         
        </div>
      

        {/* Date controls moved to far right */}
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', color: 'var(--color-text, #181c20)' }}>
               
          <span style={{ fontSize: '12px', marginRight: '6px',color: mainTextColor }}>Start:</span>
          <Form.Control
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            style={{ 
              width: '140px', 
              height: '25px', 
              fontSize: '12px', 
              padding: '0 5px',
              background: 'var(--color-surface, #fff)',
              color: 'var(--color-text, #181c20)',
              border: '1px solid var(--color-secondary, #dee2e6)'
            }}
          />
          <Form.Control
            type="time"
            value={startTime}
            onChange={handleStartTimeChange}
            style={{ 
              width: '100px', 
              height: '25px', 
              fontSize: '12px', 
              padding: '0 5px', 
              marginLeft: '4px',
              background: 'var(--color-surface, #fff)',
              color: 'var(--color-text, #181c20)',
              border: '1px solid var(--color-secondary, #dee2e6)'
            }}
          />
          <span style={{ fontSize: '12px', marginLeft: '8px', marginRight: '6px',color: mainTextColor }}>End:</span>
          <Form.Control
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            style={{ 
              width: '140px', 
              height: '25px', 
              fontSize: '12px', 
              padding: '0 5px',
              background: 'var(--color-surface, #fff)',
              color: 'var(--color-text, #181c20)',
              border: '1px solid var(--color-secondary, #dee2e6)'
            }}
          />
          <Form.Control
            type="time"
            value={endTime}
            onChange={handleEndTimeChange}
            style={{ 
              width: '100px', 
              height: '25px', 
              fontSize: '12px', 
              padding: '0 5px', 
              marginLeft: '4px',
              background: 'var(--color-surface, #fff)',
              color: 'var(--color-text, #181c20)',
              border: '1px solid var(--color-secondary, #dee2e6)'
            }}
          />
          <Button
            variant="primary"
            size="sm"
            style={{ marginLeft: '8px' }}
            onClick={() => {
              setAppliedStartDate(startDate);
              setAppliedStartTime(startTime);
              setAppliedEndDate(endDate);
              setAppliedEndTime(endTime);
            }}
          >
            Apply
          </Button>
        </div>
      </div>
      {/* <<<<<<<<<<Spotter ID Heading */}
      {/* <div style={{
        padding: '0 10px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        fontWeight: 'bold',
        fontSize: '14px'
      }}>
        Spotter ID: {station}
      </div> */}
      {/* >>>>>>>>>>>END Spotter ID Heading */}
      <div style={{ 
        flex: 1,
        position: 'relative',
        minHeight: 0
      }}>
        {/* Dynamic y-axes logic */}
        {(() => {
          // Check if there's no data
          const hasData = chartData.datasets && chartData.datasets.length > 0 && 
                         chartData.datasets.some(dataset => dataset.data && dataset.data.length > 0);

          if (!hasData) {
            // Show no data message
            const isDarkMode = document.body.classList.contains('dark-mode');
            const textColor = isDarkMode ? '#ffffff' : '#666666';
           
            
            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
             
            //    color: textColor,
                fontSize: '18px',
                fontWeight: '500',
                textAlign: 'center',
             //   border: `1px solid ${isDarkMode ? '#4a5568' : '#dee2e6'}`,
                borderRadius: '4px'
              }}>
                No available data for this station
              </div>
            );
          }

          // Match styling from timeseries.jsx
          const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
          // Ticks/labels
          const textColor = isDarkMode ? '#ffffff' : '#666666';
          // Grid lines
          const gridColor = isDarkMode ? '#6F757F' : '#e1e1e1';
          
          // Build y-axes dynamically based on datasets
          const yAxes = chartData.datasets.map((dataset, index) => ({
            id: `y-axis-${index}`,
            type: 'linear',
            display: true,
            position: 'right', 
            title: {
              display: true,
              text: dataset.label,
              color: textColor,
              font: {
                weight: 'normal'
              }
            },
            ticks: {
              color: textColor,
              font: {
                weight: 'normal'
              },
              backdropColor: 'transparent',
            },
            grid: {
              drawOnChartArea: index === 0, // only draw grid for the first axis
              color: gridColor,
              lineWidth: 1,
            },
            border: {
              color: gridColor,
            },
          }));

          // Build the scales object
          const scales = {
            x: {
              title: {
      display: true,
      text: 'Time (UTC)',
      color: textColor,
    },
              ticks: {
                display: true,
                maxRotation: 45,
                autoSkip: true,
                color: textColor,
                font: {
                  weight: 'normal'
                }
              },
              grid: {
                color: gridColor,
                lineWidth: 1,
              },
              border: {
                color: gridColor,
              },
            },
          };

          yAxes.forEach(axis => {
            scales[axis.id] = axis;
          });

          return (
            <Suspense fallback={<Spinner animation="border" />}>
              <Line
                data={chartData}
                options={{
                  backgroundColor: 'transparent',
                  maintainAspectRatio: false,
                  responsive: true,
                  scales: scales,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  plugins: {
                    tooltip: {
                      backgroundColor: isDarkMode ? '#2d3748' : 'rgba(0,0,0,0.8)',
                      titleColor: '#ffffff',
                      bodyColor: '#ffffff',
                      borderColor: gridColor,
                      borderWidth: 1,
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ${context.parsed.y}`;
                        }
                      }
                    },
                    legend: {
                      labels: {
                        color: textColor,
                        font: {
                          weight: 'normal'
                        }
                      },
                      title: {
                        display: false,
                        color: textColor,
                      }
                    }
                  }
                }}
              />
            </Suspense>
          );
        })()}
      </div>
    </div>
  );
}

export default TimeseriesSofar;
