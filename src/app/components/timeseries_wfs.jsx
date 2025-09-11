'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Spinner } from 'react-bootstrap'; 
import { Line } from 'react-chartjs-2'; 
import 'chart.js/auto'; 
import { useAppSelector } from '@/app/GlobalRedux/hooks';

const fixedColors = [
' 	rgb(255, 87, 51)',
    'rgb(153, 102, 255)', 
  'rgb(255, 206, 86)', 
  'rgb(54, 162, 235)', 
  'rgb(255, 99, 132)', 
  'rgb(75, 192, 192)', 
];

const getColorByIndex = (index) => {
  return fixedColors[index] || 'rgb(169, 169, 169)'; 
};

function TimeseriesWfs({ height, data }) {
  const mapLayer = useAppSelector((state) => state.mapbox.layers);
  const lastlayer = useRef(0);
  const { id, x, y, sizex, sizey, bbox, station } = data || {};
  console.log({ id, x, y, sizex, sizey, bbox, station })
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [enabledChart, setEnabledChart] = useState(true);

  // Check if the station is set and coordinates are valid
  const isCoordinatesValid =  station !== null;

  // Dynamically set the WFS URL based on the selected station
  
  const fetchWfsDailyData = async (url, setDataFn) => {
    try {
      if (!url) {
        setDataFn([], []);
        return;
      }

      setIsLoading(true);
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const times = data.map((entry) => entry[5]);
      const values = data.map((entry) => parseFloat(entry[4].replace(' m', '')));

      const formattedTimes = times.map((time) => {
        const date = new Date(time);
        const year = String(date.getFullYear()).slice(-2); 
        return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${year}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      });

      setDataFn(formattedTimes, values, 'Tide Prediction');
    } catch (error) {
      console.log(`Error fetching WFS_DAILY data:`, error);
      setDataFn([], []);
    } finally {
      setIsLoading(false);
    }
  };

  const setChartDataFn = (times, values, label) => {
    setChartData((prevData) => {
      const color = getColorByIndex(0);
      const newDataset = {
        label,
        data: values,
        borderColor: color,
        backgroundColor: color,
        fill: false,
        tension: 0.4,
        cubicInterpolationMode: 'monotone',
      };

      return {
        labels: times,
        datasets: [newDataset],
      };
    });
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  

  useEffect(() => {
    //console.log("mapLayer updated:", mapLayer);  // Debugging line
    const layerInformation = mapLayer[mapLayer.length - 1]?.layer_information;

    ///console.log(layerInformation, isCoordinatesValid)

    
    if (isCoordinatesValid && mapLayer.length > 0) {
      const { timeIntervalStart,timeIntervalStartOriginal, timeIntervalEnd,timeseries_url } = layerInformation;

      var dateOnlyStart = timeIntervalStart.split('T')[0];
      var dateOnlyEnd = timeIntervalEnd.split('T')[0];
      if (timeIntervalStart == timeIntervalStartOriginal){
        const today = new Date();
        const sevenDaysLater = new Date(today); // Copy the current date
        sevenDaysLater.setDate(today.getDate() + 7);
        dateOnlyStart = formatDate(today);
        dateOnlyEnd = formatDate(sevenDaysLater);
      }


      const wfsUrl = station 
    ? `${timeseries_url}/${station}/${dateOnlyStart}/${dateOnlyEnd}/6b6a1f8f5a75b760b91a414d76c6b831774dd52802a76f41`
    : null;

   // console.log(wfsUrl)
      
      fetchWfsDailyData(wfsUrl, setChartDataFn);
    }
  }, [isCoordinatesValid, enabledChart, mapLayer,station]);  // Depend on mapLayer
  

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

  // If station is not set, do not show the chart
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
        
    <p 
                style={{ fontSize: 16, 
                color: (typeof document !== 'undefined' &&
                        document.body.classList.contains('dark-mode')) ? '#fff' : '#333' 
                      }}>
                        Please select a station to view data.
    </p>
        </div>
      );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', height: `${height}px` }}>
        <Line
          data={chartData}
          options={{
            maintainAspectRatio: false,
            responsive: true,
            scales: {
              x: {
                ticks: {
                  display: true,
                  maxRotation: 45,
                  autoSkip: true,
                  color: (() => {
                    const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
                    return isDarkMode ? '#ffffff' : '#666666';
                  })(),
                },
                grid: {
                  color: (() => {
                    const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
                    return isDarkMode ? '#444444' : '#e1e1e1';
                  })(),
                },
                border: {
                  color: (() => {
                    const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
                    return isDarkMode ? '#444444' : '#e1e1e1';
                  })(),
                },
              },
              y: {
                ticks: {
                  display: true,
                  color: (() => {
                    const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
                    return isDarkMode ? '#ffffff' : '#666666';
                  })(),
                },
                grid: {
                  color: (() => {
                    const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
                    return isDarkMode ? '#444444' : '#e1e1e1';
                  })(),
                },
                border: {
                  color: (() => {
                    const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
                    return isDarkMode ? '#444444' : '#e1e1e1';
                  })(),
                },
              },
            },
            plugins: {
              legend: {
                labels: {
                  color: (() => {
                    const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
                    return isDarkMode ? '#ffffff' : '#666666';
                  })(),
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}

export default TimeseriesWfs;
