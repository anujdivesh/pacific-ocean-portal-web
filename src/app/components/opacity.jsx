import React,{useState} from 'react';
import { useAppDispatch } from '@/app/GlobalRedux/hooks'
import { updateMapLayer } from '@/app/GlobalRedux/Features/map/mapSlice';
import { Row,Col,Badge } from 'react-bootstrap';
//import '@/components/css/opacity.css';

function Opacity({ item,id}) {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState(1);
  const handleUpdateLayer = (id, updates) => {
    dispatch(updateMapLayer({ id, updates }));
  };

  const handleChange = (event,item) => {
    setValue(parseFloat(event.target.value));
    const updatedObject = {
      ...item,
      layer_information: {
        ...item.layer_information,
        opacity: event.target.value // Updated value
      }
    };
    handleUpdateLayer(item.id, {
      layer_information: {
        ...item.layer_information,
        opacity: event.target.value,
        zoomToLayer:false // Updated value
      }
    });

    event.currentTarget.blur()
  };


return(
  <div style={{ padding: "0px 8px" }}>
  <style>{`
  .custom-range-slider {
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    background: linear-gradient(to right, #e7a33a var(--percent, 100%), #d9d9d9 var(--percent, 100%));
    border-radius: 4px;
    outline: none;
    position: relative;
  }
  .custom-range-slider::-webkit-slider-runnable-track {
    height: 6px;
    background: transparent;
    border-radius: 4px;
  }
  .custom-range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
  width: 8px; /* widened for Chrome */
  height: 22px; /* increased height */
    background: #e7a33a;
    border: 2px solid #ffffff;
    border-radius: 2px;
    cursor: pointer;
  margin-top: -8px; /* recenter for 22px thumb over 6px track */
    box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
  box-sizing: border-box; /* ensure width includes border */
  }
  .custom-range-slider:focus::-webkit-slider-thumb { outline: 2px solid #e7a33a; }
  .custom-range-slider::-moz-range-track { height:6px; background: transparent; }
  .custom-range-slider::-moz-range-progress { height:6px; background:#e7a33a; border-radius:4px; }
  .custom-range-slider::-moz-range-thumb { width:8px; height:22px; background:#e7a33a; border:2px solid #ffffff; border-radius:2px; cursor:pointer; box-sizing:border-box; }
  .custom-range-slider::-ms-track { height:6px; background:transparent; border-color:transparent; color:transparent; }
  .custom-range-slider::-ms-fill-lower { background:#e7a33a; border-radius:4px; }
  .custom-range-slider::-ms-fill-upper { background:#d9d9d9; border-radius:4px; }
  .custom-range-slider::-ms-thumb { width:8px; height:22px; background:#e7a33a; border:2px solid #ffffff; border-radius:2px; cursor:pointer; box-sizing:border-box; }
  `}</style>
  {/* Opacity Slider - matching style */}
  <Row className="align-items-center g-1" style={{ marginBottom: "6px" }}>
    <Col xs="auto" className="pe-1" style={{ paddingTop: "6px" }}>
      <span style={{ 
        fontSize: '12px', 
        whiteSpace: 'nowrap',
        fontWeight: '500',
        color: 'var(--color-text)'
      }}>Opacity:</span>
    </Col>
    
    <Col className="d-flex align-items-center gap-1">
      <div style={{ flex: 1, marginTop: "2px" }}>
        <input
          type="range"
          className="form-range custom-range-slider"
          min={0}
          max={1}
          step={0.1}
          value={value}
          onChange={(e) => handleChange(e, item)}
          style={{ "--value": value }}
          onClick={(e) => e.currentTarget.blur()}
        />
      </div>
      
      <Badge bg="secondary" className="fw-bold small" style={{
        fontSize: "11px",
        color: "white",
        backgroundColor: "#6c757d",
        padding: "2px 6px",
        borderRadius: "4px",
        minWidth: "40px",
        textAlign: "center",
        marginTop:'7px'
      }}>
        {Math.round(value * 100)}%
      </Badge>
    </Col>
  </Row>
  </div>
  
)
}
export default Opacity;