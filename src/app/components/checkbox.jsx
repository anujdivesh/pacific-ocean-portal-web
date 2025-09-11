import React from 'react';
import { Form} from 'react-bootstrap';
import {  useAppDispatch, useAppSelector } from '@/app/GlobalRedux/hooks'
import { updateMapLayer } from '@/app/GlobalRedux/Features/map/mapSlice';
import { hideoffCanvas } from '@/app/GlobalRedux/Features/offcanvas/offcanvasSlice';

function CheckBox({ item}) {

    const dispatch = useAppDispatch();
    const currentId = useAppSelector((state) => state.offcanvas.currentId);

    const handleUpdateLayer = (id, updates) => {
        dispatch(updateMapLayer({ id, updates }));
      };
    // Toggle checkbox state
    const handleCheckboxChange = (event,item) => {
      handleUpdateLayer(item.id, {
        layer_information: {
          ...item.layer_information,
          enabled: event.target.checked // Updated value
        }
      });
      
      // Close bottom offcanvas if this layer is being disabled and it's the current layer in the offcanvas
      if (!event.target.checked && currentId === item.id) {
        dispatch(hideoffCanvas());
      }
      
      // Also close offcanvas if this is a SOFAR layer being disabled (regardless of currentId)
      if (!event.target.checked && item.layer_information?.layer_type === 'SOFAR') {
        dispatch(hideoffCanvas());
      }
    };


return(
    <Form.Check
    type="checkbox"
    id={`checkbox-${item.id}`}
    label={item.label} // Custom label or use item.label
    checked={item.layer_information.enabled}
    onClick={(e) => e.currentTarget.blur()}
    onChange={(e) => handleCheckboxChange(e,item)}
    style={{ marginRight: '1px',borderRadius:0,cursor:'pointer'}}
  />
  
)
}
export default CheckBox;