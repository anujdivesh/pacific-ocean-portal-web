import React,{useState} from 'react';
import { useAppDispatch } from '@/app/GlobalRedux/hooks'
import { removeMapLayer,updateMapLayer } from '@/app/GlobalRedux/Features/map/mapSlice';
//import '@/components/css/input.css'
import { Row,Col,Badge } from 'react-bootstrap';

function ColorScale({item }) {
    
  const [colormin, setColorMin] = useState("-100");
  const [colormax, setColorMax] = useState("-100");
  const [legend,setLegend] = useState(item.layer_information.legend_url);
  const dispatch = useAppDispatch();

  const handleUpdateLayer = (id, updates) => {
    dispatch(updateMapLayer({ id, updates }));
  };

  const removeLayerById = (item) => {
    dispatch(removeMapLayer({ id: item.id }));
};

const handleChangemin = (event,item) => {
  setColorMin( event.target.value)

  const updatedObject = {
    ...item,
    layer_information: {
      ...item.layer_information,
      colormin: event.target.value // Updated value
    }
  };
  handleUpdateLayer(item.id, {
    layer_information: {
      ...item.layer_information,
      colormin: event.target.value,
      zoomToLayer:false // Updated value // Updated value
    }
  });
  //removeLayerById(item)
  //dispatch(addMapLayer(updatedObject));

  event.currentTarget.blur()
};


const handleChangemax = (event,item) => {
setColorMax( event.target.value)
handleUpdateLayer(item.id, {
  layer_information: {
    ...item.layer_information,
    colormax: event.target.value // Updated value
  }
});

  /*
  const updatedObject = {
    ...item,
    layer_information: {
      ...item.layer_information,
      colormax: event.target.value // Updated value
    }
  };
  removeLayerById(item)
  dispatch(addMapLayer(updatedObject));*/

  event.currentTarget.blur()
};

const rowStyle = {
  display: 'flex',
  flexDirection: 'row', // Align items horizontally
  justifyContent: 'space-between', // Adjust alignment as needed
  gap: '1px', // Space between items, optional
};

const itemStyle = {
  fontSize:12,
  flex: '1', // Allow items to grow equally, optional
};


return(
  <>
 <style>{`
 /* Color scale input theming */
 .color-scale-wrap .color-scale-input {
   background:#ffffff;
   color:#1d1d1d;
 }
 html.dark-mode .color-scale-wrap .color-scale-input {
   background:#3F4854 !important;
   color:#e6e9ed !important;
   border:1px solid #6E767D !important;
  color-scheme: light; /* force light-mode form control (spinner) colors */
 }
  /* Label colors */
  .color-scale-wrap .color-scale-label { color:#1d1d1d; }
  html.dark-mode .color-scale-wrap .color-scale-label { color:#ffffff !important; }
 html.dark-mode .color-scale-wrap .color-scale-input:focus {
   outline:2px solid #4d8ac9;
   box-shadow:none;
 }
 /* Keep selection (highlight) light readable */
 .color-scale-wrap .color-scale-input::selection {
   background:#2563eb;
   color:#ffffff;
 }
 /* Webkit spin buttons visible on dark */
 /* Always show spin buttons (same look both modes) */
 .color-scale-wrap .color-scale-input::-webkit-inner-spin-button,
 .color-scale-wrap .color-scale-input::-webkit-outer-spin-button {
   -webkit-appearance: inner-spin-button;
   opacity:1;
   display:block;
   margin:0;
   filter:none;
 }
 /* Remove dark filter so identical */
 html.dark-mode .color-scale-wrap .color-scale-input::-webkit-inner-spin-button,
 html.dark-mode .color-scale-wrap .color-scale-input::-webkit-outer-spin-button {
   filter:none;
 }
 /* Firefox number input caret color */
 html.dark-mode .color-scale-wrap .color-scale-input { caret-color:#ffffff; }
 `}</style>
 <div className="color-scale-wrap" style={{ padding: "6px 10px" }}>
  {/* Color Range Inputs */}
  <Row className="align-items-center g-1" style={{ marginBottom: "2px" }}>
    <Col className="d-flex align-items-center gap-2">
      {/* Min Color */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px',
        flex: 1
      }}>
        <span className="color-scale-label" style={{ 
          fontSize: '12px', 
          whiteSpace: 'nowrap',
          fontWeight: '500',
          minWidth: '60px'
        }}>Min Color</span>
        <input 
          type="number" 
          className="form-control form-control-sm color-scale-input" 
          style={{ width:'70px', borderRadius:'4px', padding:'0.25rem 0.5rem', fontSize:'12px', border:'1px solid #ced4da' }} 
          onChange={(e) => handleChangemin(e, item)} 
          value={colormin == "-100" ? item.layer_information.colormin : colormin}
        />
      </div>
      
      {/* Max Color */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px',
        flex: 1
      }}>
        <span className="color-scale-label" style={{ 
          fontSize: '12px', 
          whiteSpace: 'nowrap',
          fontWeight: '500',
          minWidth: '60px'
        }}>Max Color</span>
        <input 
          type="number" 
          className="form-control form-control-sm color-scale-input" 
          style={{ width:'70px', borderRadius:'4px', padding:'0.25rem 0.5rem', fontSize:'12px', border:'1px solid #ced4da' }} 
          onChange={(e) => handleChangemax(e, item)} 
          value={colormax == "-100" ? item.layer_information.colormax : colormax}
        />
      </div>
    </Col>
  </Row>

  {/* Legend Image */}
  {item.layer_information.legend_url && item.layer_information.legend_url !== 'null' && (
    <Row className="g-1" style={{ marginTop: "4px" }}>
      <Col>
        <img 
          src={item.layer_information.legend_url} 
          alt="Color scale legend" 
          style={{ 
            width: '100%', 
            height: 'auto',
            borderRadius: '4px'
          }} 
        />
      </Col>
    </Row>
  )}
</div>
      </>
)
}
export default ColorScale;