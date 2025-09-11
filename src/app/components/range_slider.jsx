import React, { useEffect, useState, useRef } from 'react';
import { Row,Col } from 'react-bootstrap';
//import '@/components/css/timeseries_scroll.css'
import { FaPlay, FaPause, FaForward, FaBackward } from 'react-icons/fa'; 
import { formatDateToISOWithoutMilliseconds} from './helper';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { updateMapLayer } from '@/app/GlobalRedux/Features/map/mapSlice';
import {useAppDispatch } from '@/app/GlobalRedux/hooks';
import Badge from 'react-bootstrap/Badge';

function RangeSlider({item}) { // Default value for the slider
    const sliderRef = useRef(0);
    const dispatch = useAppDispatch();
    const [playing, setPlaying] = useState(false);
    const [intervalId, setIntervalId] = useState(null);
    const intervalRef = useRef(null); 
      //SLIDERR
      const timeIntervalStart = new Date(item.layer_information.timeIntervalStart);
      const timeIntervalEnd = new Date(item.layer_information.timeIntervalEnd);
    const [sliderValue, setSliderValue] = useState(timeIntervalStart);
      // Define the start and end dates for the slider
      const [startDate,setStartDate] = useState(new Date(item.layer_information.timeIntervalStart));
      const [endDate, setEndDate] = useState(new Date(item.layer_information.timeIntervalEnd));
      const [period, setPeriod] = useState(parseInt(item.layer_information.interval_step,10)*3600000);
     //const startDate = new Date(2024, 8, 12, 0, 0); // January 1, 2024, 00:00
    
      // Convert datetime to timestamp
      const dateToTimestamp = (date) => date.getTime();
      const timestampToDate = (timestamp) => new Date(timestamp);
    
      const minTimestamp = startDate.getTime()
      const maxTimestamp = endDate.getTime()
    
      const formatDate = (date) => {
        const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('en-US', options);
      };

      // Handle slider change event
  const handleSliderChange = (event) => {
    const value = parseInt(event.target.value, 10);
    const date = timestampToDate(value);
    setSliderValue(date);
   // console.log(`Slider value: ${formatDate(date)}`);
  };

  // Handle play button click
  const handlePlayClick = () => {
    if (!playing) {
      setPlaying(true);
      
      // Start the interval for updating the slider value periodically
      const id = setInterval(() => {
        if (sliderRef.current) {
          let newValue = parseInt(sliderRef.current.value, 10) + period;// Increment by the period
  
         // console.log(endDate)
          if (newValue > endDate.getTime()) {
            newValue = endDate.getTime(); // Cap to maxTimestamp
            clearInterval(id); // Stop the interval
            setPlaying(false); // Update the playing state
          }
  
          // Update the slider and state
          sliderRef.current.value = newValue;
          setSliderValue(timestampToDate(newValue));
        }
      }, 2500); // Check every 1.5 seconds
  
      setIntervalId(id); // Store the interval ID for later cleanup
    } else {
      // Pause playback
      setPlaying(false);
      if (intervalId) {
        clearInterval(intervalId); // Clear the interval
        setIntervalId(null); // Reset intervalId
      }
    }
  };
  

  // Handle next button click
  const handleNextClick = () => {
    if (sliderRef.current) {
      let newValue = parseInt(sliderRef.current.value, 10) + period; // Increment by 1 hour (3600000 ms)
      if (newValue > maxTimestamp) newValue = minTimestamp; // Loop back to minTimestamp
      sliderRef.current.value = newValue;
      setSliderValue(timestampToDate(newValue));
      handleSliderChange({ target: { value: newValue } });
    }
  };

  // Handle previous button click
  const handlePreviousClick = () => {
    if (sliderRef.current) {
      let newValue = parseInt(sliderRef.current.value, 10) - period; // Decrement by 1 hour (3600000 ms)
      if (newValue < minTimestamp) newValue = maxTimestamp; // Loop back to maxTimestamp
      sliderRef.current.value = newValue;
      setSliderValue(timestampToDate(newValue));
      handleSliderChange({ target: { value: newValue } });
    }
  };

  const handleUpdateLayer = (id, updates) => {
    dispatch(updateMapLayer({ id, updates }));
  };
/*
  useEffect(() => {

    setStartDate(new Date(item.layer_information.timeIntervalStart))
    setEndDate(new Date(item.layer_information.timeIntervalEnd))

  // Clean up on unmount
  return () => {
  };
}, []);
*/


  useEffect(() => {
    // Initialize the map
    handleUpdateLayer(item.id, {
        layer_information: {
          ...item.layer_information,
          timeIntervalStart:formatDateToISOWithoutMilliseconds(sliderValue),
          zoomToLayer:false // Updated value
        }
      });


    // Clean up on unmount
    return () => {
    };
  }, [sliderValue]);
  
  // Progress percentage (0-100) for gradient fill similar to opacity slider
  const progressPercent = (maxTimestamp > minTimestamp)
    ? ((dateToTimestamp(sliderValue) - minTimestamp) / (maxTimestamp - minTimestamp)) * 100
    : 0;



  return (
    <div style={{ padding: "0px 10px", marginBottom:8}}>
      <style>{`
      /* Range slider styled exactly like opacity slider but blue */
      .custom-range-slider2 {
        width: 100%;
        height: 6px;
        -webkit-appearance: none;
        background: linear-gradient(to right, #0d6efd var(--percent, 100%), #d9d9d9 var(--percent, 100%));
        border-radius: 4px;
        outline: none;
        position: relative;
      }
      .custom-range-slider2::-webkit-slider-runnable-track {
        height: 6px;
        background: transparent;
        border-radius: 4px;
      }
      .custom-range-slider2::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 8px; /* same as opacity slider */
        height: 22px; /* same as opacity slider */
        background: #0d6efd;
        border: 2px solid #ffffff;
        border-radius: 2px;
        cursor: pointer;
        margin-top: -8px; /* center over 6px track */
        box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
        box-sizing: border-box;
      }
      .custom-range-slider2:focus::-webkit-slider-thumb { outline: 2px solid #0d6efd; }
      .custom-range-slider2::-moz-range-track { height:6px; background: transparent; }
      .custom-range-slider2::-moz-range-progress { height:6px; background:#0d6efd; border-radius:4px; }
      .custom-range-slider2::-moz-range-thumb { width:8px; height:22px; background:#0d6efd; border:2px solid #ffffff; border-radius:2px; cursor:pointer; box-sizing:border-box; }
      .custom-range-slider2::-ms-track { height:6px; background:transparent; border-color:transparent; color:transparent; }
      .custom-range-slider2::-ms-fill-lower { background:#0d6efd; border-radius:4px; }
      .custom-range-slider2::-ms-fill-upper { background:#d9d9d9; border-radius:4px; }
      .custom-range-slider2::-ms-thumb { width:8px; height:22px; background:#0d6efd; border:2px solid #ffffff; border-radius:2px; cursor:pointer; box-sizing:border-box; }
      `}</style>
      <Row className="align-items-center g-1">
        {/* Time Label - aligned with slider */}
        <Col xs="auto" className="pe-1" style={{ marginTop: "-10px" }}>
          {(() => {
            const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
            return (
              <span style={{ 
                fontSize: '12px', 
                whiteSpace: 'nowrap',
                fontWeight: '500',
                color: isDarkMode ? '#ffffff' : '#495057'
              }}>Time Range:</span>
            );
          })()}
        </Col>
        
        {/* Combined Slider + Controls */}
        <Col className="d-flex flex-column">
          {/* Top Row: Slider + Buttons */}
          <div className="d-flex align-items-center gap-1">
            {/* Slider takes remaining space */}
            <div style={{ flex: 1, marginTop: "2px" }}>
              <input
                type="range"
                onClick={(e) => e.currentTarget.blur()}
                min={minTimestamp}
                max={maxTimestamp}
                step={period}
                value={dateToTimestamp(sliderValue)}
                className="form-range custom-range-slider2"
                ref={sliderRef}
                onChange={handleSliderChange}
                style={{ "--percent": `${progressPercent}%` }}
              />
            </div>
            
            {/* Control buttons */}
            <div className="d-flex gap-1" style={{ flexShrink: 0 }}>
              {(() => {
                const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
                return (
                  <>
                    <button 
                      className="btn btn-xs p-0"
                      onClick={handlePreviousClick}
                      style={{ 
                        width: "22px",
                        height: "22px",
                        lineHeight: "1",
                        backgroundColor: isDarkMode ? '#495057' : '#f8f9fa',
                        border: isDarkMode ? '1px solid #6c757d' : '1px solid #dee2e6',
                        color: isDarkMode ? '#ffffff' : '#495057'
                      }}
                    >
                      <FaBackward size={8} style={{marginTop:'-3px'}}/>
                    </button>
                    <button 
                      className={`btn btn-xs p-0 ${playing ? 'btn-danger' : 'btn-success'}`}
                      onClick={handlePlayClick}
                      style={{ 
                        width: "22px",
                        height: "22px",
                        lineHeight: "1"
                      }}
                    >
                      {playing ? <FaPause size={8} style={{marginTop:'-3px'}}/> : <FaPlay size={8} style={{marginTop:'-3px'}}/>}
                    </button>
                    <button 
                      className="btn btn-xs p-0"
                      onClick={handleNextClick}
                      style={{ 
                        width: "22px",
                        height: "22px",
                        lineHeight: "1",
                        backgroundColor: isDarkMode ? '#495057' : '#f8f9fa',
                        border: isDarkMode ? '1px solid #6c757d' : '1px solid #dee2e6',
                        color: isDarkMode ? '#ffffff' : '#495057'
                      }}
                    >
                      <FaForward size={8} style={{marginTop:'-3px'}}/>
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
          
          {/* Date label - closer to slider */}
          {(() => {
            const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
            return (
              <div style={{ 
                marginTop: "2px",
                marginLeft: "2px"
              }}>
                <Badge bg="secondary" className="fw-bold small p-1" style={{
                  fontSize: "11px",
                  color: isDarkMode ? '#ffffff' : 'white',
                  backgroundColor: "#6c757d",
                  padding: "2px 6px",
                  borderRadius: "4px"
                }}>
                  {formatDateToISOWithoutMilliseconds(sliderValue)}
                </Badge>
              </div>
            );
          })()}
        </Col>
      </Row>
    </div>
)
}
export default RangeSlider;