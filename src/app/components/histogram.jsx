'use client';
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'chart.js/auto';
import { useAppSelector } from '@/app/GlobalRedux/hooks';
import { Spinner } from 'react-bootstrap';
import { getLayerById, getCoordinatesForLayer } from './helper';

const Chart = dynamic(() => import('react-chartjs-2').then((mod) => mod.Chart), {
  ssr: false,
});

const fixedColors = [
  'rgb(255, 99, 132)',
  'rgb(54, 162, 235)',
  'rgb(255, 206, 86)',
  'rgb(75, 192, 192)',
  'rgb(153, 102, 255)',
];

// Helper to filter to every 6th hour (UTC-based, robust to arbitrary start)
function filterToSixHourly(times, values) {
  const filteredTimes = [];
  const filteredValues = [];
  if (!times.length) return { times: filteredTimes, values: filteredValues };

  // Find the first index where hour is divisible by 6
  let firstIdx = -1;
  for (let i = 0; i < times.length; i++) {
    const date = new Date(times[i]);
    if (date.getUTCHours() % 6 === 0) {
      firstIdx = i;
      break;
    }
  }

  // If found, select every 6th step after that (for strictly 1-hourly data)
  if (firstIdx !== -1) {
    for (let i = firstIdx; i < times.length; i += 6) {
      const date = new Date(times[i]);
      if (date.getUTCHours() % 6 === 0) {
        filteredTimes.push(times[i]);
        filteredValues.push(values[i]);
      }
    }
  }

  return { times: filteredTimes, values: filteredValues };
}


function Histogram({ height }) {
  const mapLayer = useAppSelector((state) => state.mapbox.layers);
  const currentId = useAppSelector((state) => state.offcanvas.currentId);
  // Coordinates for THIS layer only (its own station click, otherwise the
  // shared base map click). Never fall back to another layer's coordinates.
  const allCoordinates = useAppSelector((state) => state.coordinate.coordinates);
  const coordinates = getCoordinatesForLayer(allCoordinates, currentId) || {};
  const { x, y, sizex, sizey, bbox } = coordinates;
  const isCoordinatesValid = [x, y, sizex, sizey, bbox].every(v => v !== null && v !== undefined && v !== '');
//  console.log('Coordinates used for histogram:', { x, y, sizex, sizey, bbox });

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });
  const [axesConfig, setAxesConfig] = useState({});
  const [datasetsConfig, setDatasetsConfig] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allDataLoaded, setAllDataLoaded] = useState(false);
  const [loadedDatasets, setLoadedDatasets] = useState(0);
  const [enabledChart, setEnabledChart] = useState(false);
  const prevCoordinates = useRef({ x, y, sizex, sizey, bbox });
  const prevLayerId = useRef(null);
  // Monotonic id for in-flight loads; only the newest one may update state.
  const requestSeq = useRef(0);
  // Add themeVersion state to force re-render on theme change
  const [themeVersion, setThemeVersion] = useState(0);

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

  const isDirectionDataset = (label) => {
    const directionKeywords = ['direction', 'dir', 'deg', 'bearing', 'angle'];
    return directionKeywords.some(keyword => label.toLowerCase().includes(keyword));
  };

  const fetchData = async (time, url_tmp, layer, label, index) => {
    try {
      let url = url_tmp;
      if (url.includes('@')) {
        const parts = url_tmp.split('?');
        const remaining = parts.slice(2);
        const joined = remaining.join('?');
        url = joined.replace(/@/g, '?');
      } else {
        url = url_tmp;
      }

      var urlWithParams = "";
      let count = (url.match(/REQUEST/g) || []).length;

      if (count >= 2) {
        var featureInfoUrl = url;
        featureInfoUrl = featureInfoUrl.replace(/wms\?.*?REQUEST=[^&]*?&.*?REQUEST=[^&]*?&/, '');
        featureInfoUrl = featureInfoUrl.replace(/VERSION=1\.3\.0&/g, '');
        if (!/\/ncWMS\/wms\?/.test(featureInfoUrl)) {
          featureInfoUrl = featureInfoUrl.replace(/\/ncWMS\/?/i, '/ncWMS/wms?REQUEST=GetTimeseries&');
        }
        urlWithParams = featureInfoUrl
          .replace('${layer}', layer)
          .replace('${layer2}', layer)
          .replace('${bbox}', bbox)
          .replace('${x}', x)
          .replace('${y}', y)
          .replace('${sizex}', sizex)
          .replace('${time}', time)
          .replace('${sizey}', sizey);
      } else {
        urlWithParams = url
          .replace('${layer}', layer)
          .replace('${layer2}', layer)
          .replace('${x}', x)
          .replace('${y}', y)
          .replace('${bbox}', bbox)
          .replace('${sizex}', sizex)
          .replace('${time}', time)
          .replace('${sizey}', sizey);
      }
      if (!urlWithParams.includes("VERSION")) {
        const separator = urlWithParams.includes('?') ? '&' : '?';
        urlWithParams = urlWithParams + separator + 'VERSION=1.1.1';
      }
      
      const res = await fetch(urlWithParams);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const responseBody = await res.text();
      if (!responseBody) throw new Error(`No data returned from the server.`);
      let layerName = layer.includes("/") ? layer.split("/")[1] : layer;
      const data = JSON.parse(responseBody);
      const times = data.domain.axes.t.values;
      const values = data.ranges[layerName].values;

      // Calculate min time difference (in hours)
      let minDiff = null;
      if (times.length > 1) {
        minDiff = Math.min(...times.slice(1).map((t, i) => (new Date(t) - new Date(times[i])) / 36e5));
      }

      let filteredTimes = times;
      let filteredValues = values;
      // Only filter to 6-hourly if data is finer than 6 hours
      if (minDiff !== null && minDiff < 6) {
        const filtered = filterToSixHourly(times, values);
        filteredTimes = filtered.times;
        filteredValues = filtered.values;
      }

      const formattedTimes = filteredTimes.map((time) => {
        const date = new Date(time);
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      });

      return { times: formattedTimes, values: filteredValues, label, index };
    } catch (error) {
      console.log(`Error fetching ${label} data:`, error);
      return null;
    }
  };

  const processDataset = ({ times, values, label, index }) => {
    const color = fixedColors[index] || 'rgb(255, 99, 132)';
    const isDirection = isDirectionDataset(label);
    const isFirstDataset = index === 0;

    let axisId = 'y';
    if (isDirection) {
      axisId = `y-direction`;
      setAxesConfig(prev => ({
        ...prev,
        [label]: {
          axisId,
          position: 'right',
          min: 0,
          max: 360,
          ticks: {
            stepSize: 45,
            callback: function(value) {
              const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
              return directions[value / 45] || value;
            }
          },
          title: {
            display: true,
            text: 'Direction (°)'
          }
        }
      }));
    }

    const commonProps = {
      label,
      data: values.map((value, i) => ({
        x: times[i],
        y: isDirection ? (value % 360) : value
      })),
      borderColor: color,
      backgroundColor: color,
      yAxisID: axisId,
    };

    if (isFirstDataset) {
      // First dataset as histogram
      return {
        ...commonProps,
        type: 'bar',
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.9,
        categoryPercentage: 0.8,
      };
    } else if (isDirection) {
      // Direction datasets as scatter
      return {
        ...commonProps,
        type: 'scatter',
        pointRadius: 5,
        pointHoverRadius: 7,
        showLine: false,
      };
    } else {
      // Other datasets as line
      return {
        ...commonProps,
        type: 'line',
        fill: false,
        tension: 0.1,
      };
    }
  };

  const loadAllData = async () => {
    if (!isCoordinatesValid || datasetsConfig.length === 0) return;

    setIsLoading(true);
    setAllDataLoaded(false);
    setLoadedDatasets(0);
    setChartData({ labels: [], datasets: [] });
    setAxesConfig({});

    // Tag this run so a slow response from a previous layer/position can never
    // paint over the chart the user is now looking at.
    const requestId = ++requestSeq.current;
    prevLayerId.current = currentId;
    prevCoordinates.current = { x, y, sizex, sizey, bbox };

    const results = await Promise.all(
      datasetsConfig.map((dataset, index) =>
        fetchData(dataset.timerange, dataset.query_url, dataset.layer, dataset.label, index)
      )
    );

    if (requestId !== requestSeq.current) return; // superseded

    const validResults = results.filter(Boolean);
    const newDatasets = validResults.map(result => processDataset(result));

    if (validResults.length > 0) {
      setChartData({
        labels: validResults[0].times, // Use first dataset's times as labels
        datasets: newDatasets,
      });
    }

    setLoadedDatasets(validResults.length);
    setIsLoading(false);
    setAllDataLoaded(true);
  };

  useEffect(() => {
    if (isCoordinatesValid && mapLayer.length > 0) {
      const selected_layer = getLayerById(mapLayer, currentId);
      if (!selected_layer) {
        // The plotter's layer is gone (removed while open). Show nothing rather
        // than charting some other layer's variables.
        setDatasetsConfig([]);
        setChartData({ labels: [], datasets: [] });
        setEnabledChart(false);
        return;
      }
      const layerInformation = selected_layer.layer_information;
      if (layerInformation?.enable_chart_timeseries) {
        const { timeseries_variables, timeseries_variable_label, timeseries_url, 
               timeIntervalStartOriginal,timeIntervalStart, timeIntervalEnd, enable_chart_timeseries, url } = layerInformation;
        const variables = timeseries_variables.split(',');
        const labels = timeseries_variable_label.split(',');
        const query_url = timeseries_url;
         var use_time = timeIntervalStartOriginal;
        if (timeIntervalStartOriginal == null){
          use_time = timeIntervalStart
        }
        const time_range = use_time + "/" + timeIntervalEnd;
       // const time_range = timeIntervalStartOriginal + "/" + timeIntervalEnd;
        setEnabledChart(enable_chart_timeseries);
        setDatasetsConfig(
          variables.map((variable, index) => {
            const fullUrl = url + "?" + query_url;
          //  console.log('Formed histogram API URL:', fullUrl);
            return {
              key: variable,
              label: labels[index],
              layer: variable,
              query_url: fullUrl,
              timerange: time_range,
            };
          })
        );
      } else {
        setEnabledChart(false);
      }
    }
  }, [mapLayer, isCoordinatesValid,currentId]);

  useEffect(() => {
    const coordinatesChanged = (
      prevCoordinates.current.x !== x ||
      prevCoordinates.current.y !== y ||
      prevCoordinates.current.sizex !== sizex ||
      prevCoordinates.current.sizey !== sizey ||
      prevCoordinates.current.bbox !== bbox
    );

    // Compare against the layer the plotter is showing, NOT the last layer
    // added to the workbench — with several accordions open those differ.
    const layerChanged = prevLayerId.current !== currentId;

    if (coordinatesChanged || layerChanged) {
      loadAllData();
    }
  }, [x, y, sizex, sizey, bbox, currentId, datasetsConfig]);

  const getChartOptions = () => {
    const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#ffffff' : '#666666';
    const gridColor = isDarkMode ? '#6F757F' : '#e1e1e1';
    
    const scales = {
      x: {
        type: 'category',
        ticks: {
          display: true,
          maxRotation: 45,
          autoSkip: true,
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
        border: {
          color: gridColor,
        },
      },
      y: {
        position: 'left',
        ticks: {
          display: true,
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
        border: {
          color: gridColor,
        },
        beginAtZero: false,
        grace: '5%',
        min: (ctx) => {
          const values = ctx.chart.data.datasets
            .filter(ds => ds.yAxisID === 'y')
            .flatMap(ds => ds.data.map(item => item.y));
          const minVal = Math.min(...values);
          return minVal - (Math.abs(minVal) * 0.1);
        },
        max: (ctx) => {
          const values = ctx.chart.data.datasets
            .filter(ds => ds.yAxisID === 'y')
            .flatMap(ds => ds.data.map(item => item.y));
          const maxVal = Math.max(...values);
          return maxVal + (Math.abs(maxVal) * 0.1);
        }
      },
    };

    Object.values(axesConfig).forEach(config => {
      scales[config.axisId] = {
        ...config,
        grid: {
          drawOnChartArea: false,
          color: gridColor,
        },
        border: {
          color: gridColor,
        },
        ticks: {
          ...config.ticks,
          color: textColor,
        },
        title: {
          ...config.title,
          color: textColor,
        },
        beginAtZero: false,
        grace: '5%',
        min: (ctx) => {
          const values = ctx.chart.data.datasets
            .filter(ds => ds.yAxisID === config.axisId)
            .flatMap(ds => ds.data.map(item => item.y));
          const minVal = Math.min(...values);
          return minVal - (Math.abs(minVal) * 0.1);
        },
        max: (ctx) => {
          const values = ctx.chart.data.datasets
            .filter(ds => ds.yAxisID === config.axisId)
            .flatMap(ds => ds.data.map(item => item.y));
          const maxVal = Math.max(...values);
          return maxVal + (Math.abs(maxVal) * 0.1);
        }
      };
    });

    return {
      maintainAspectRatio: false,
      responsive: true,
      scales,
      interaction: {
        mode: 'nearest',
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            color: textColor,
          },
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return isDirectionDataset(label) 
                ? `${label}: ${value}° (${getDirectionName(value)})`
                : `${label}: ${value}`;
            }
          }
        }
      }
    };
  };

  const getDirectionName = (degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round((degrees % 360) / 22.5);
    return directions[index % 16];
  };

  if (!isCoordinatesValid) {
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
        <p style={{ fontSize: 16}}>Click on map to retrieve data.</p>
      </div>
    );
  }

  if (!enabledChart) {
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
        <p style={{ fontSize: 16, color: 'var(--color-text, #333)' }}>This Feature is disabled.</p>
      </div>
    );
  }

  if (isLoading || !allDataLoaded) {
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
        <Spinner animation="border" role="status" variant="primary" />
        <span style={{ marginLeft: '10px', fontSize: '18px' }}>
        Fetching data from API...
        </span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: `${height}px`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative', width: '100%', height: `calc(${height}px)` }}>
        <Chart
          type='bar'
          data={chartData}
          options={getChartOptions()}
          height={height}
          key={JSON.stringify(chartData) + themeVersion}
        />
      </div>
    </div>
  );
}

export default Histogram;