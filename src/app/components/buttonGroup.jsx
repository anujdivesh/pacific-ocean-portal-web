"use client" // client side rendering 
import React from 'react';
import { Row, Button } from 'react-bootstrap';
import { useAppSelector, useAppDispatch } from '@/app/GlobalRedux/hooks'
//import '@/components/css/butttongroup.css';
import { setDataset } from '@/app/GlobalRedux/Features/dataset/dataSlice';
import { showModaler } from '@/app/GlobalRedux/Features/modal/modalSlice';
import { setAccordion } from '@/app/GlobalRedux/Features/accordion/accordionSlice';
import Dropdown from 'react-bootstrap/Dropdown';
import { updateMapLayer, removeMapLayer,setBounds } from '@/app/GlobalRedux/Features/map/mapSlice';
import { showoffCanvas, hideoffCanvas } from '@/app/GlobalRedux/Features/offcanvas/offcanvasSlice';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { IoIosAddCircleOutline, IoMdRemoveCircleOutline } from "react-icons/io";
import { FaRegTrashCan } from "react-icons/fa6";
import { get_url } from './urls';
import { IoIosArrowDown } from "react-icons/io"; // Import the icon
import { GoPlus } from "react-icons/go";
import { FiMinus } from "react-icons/fi";
import { IoDocumentTextOutline } from "react-icons/io5";


function ButtonGroupComp({ item }) {
  const isVisible = useAppSelector((state) => state.offcanvas.isVisible);
  const dispatch = useAppDispatch();
  const mapLayer = useAppSelector((state) => state.mapbox.layers);

  const fetchData = async (id) => {
    try {
      const response = await fetch(get_url('metadata', id)); // Replace with your API URL
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      dispatch(setDataset(result));
      //setData(result);
    } catch (error) {
      //setError(error);
    }
  };

  const removeLayerById = (item) => {
    dispatch(removeMapLayer({ id: item.id }));
  };

  const handleShow = (id) => {
    if (isVisible) {
      dispatch(hideoffCanvas());
    } else {
      dispatch(showoffCanvas(id)); // Pass the id to showoffCanvas
    }
  };

  const handleUpdateLayer = (id, updates) => {
    dispatch(updateMapLayer({ id, updates }));
  };

  const idealZoom = (item) => {
    dispatch(
      setBounds({
        west:  item.west_bound_longitude,
        east: item.east_bound_longitude,
        south: item.south_bound_latitude,
        north: item.north_bound_latitude,
      })
    );
  };

  return (
    <Row>
      <ButtonGroup size="sm" style={{ marginLeft: 0, marginTop: -16 }}>
      <Button 
          variant="success" 
          style={{ fontSize: '12px', borderRadius: 0,color:'white' }}
          onClick={() => handleShow(item.id)}
          
        >
         {isVisible ? <FiMinus size={18} color='white' style={{marginTop:-2}}/> : <GoPlus size={18} color='white' style={{marginTop:-2}}/>}   PLOTTER
        </Button>
        <Button 
          variant="secondary" 
          style={{ borderRadius: 0, fontSize: '12px' }}
          onClick={() => idealZoom(item)}
        >
          IDEAL ZOOM
        </Button>

      



        <Dropdown style={{ borderRadius: 0 }}>
  <Dropdown.Toggle 
    className="custom-dropdown-button no-caret" 
    variant="warning" 
    id="dropdown-basic"
    style={{ 
      borderRadius: 0, 
      fontSize: '12px', 
      color: 'white',
      width: '110px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <span style={{paddingLeft:'10px'}}>UTILITIES</span>
    <IoIosArrowDown size={14} style={{ marginRight: '5px' }} />
  </Dropdown.Toggle>

  <Dropdown.Menu>
    <Dropdown.Item
      eventKey="1"
      onClick={() => {
        dispatch(setAccordion(item.id));
        dispatch(showModaler());
      }}
      style={{ borderRadius: 0, fontSize: '12px' }}
    >
    <IoDocumentTextOutline size={16} style={{marginTop:-2}}/> &nbsp;Show Metadata
    </Dropdown.Item>
    <Dropdown.Item 
      eventKey="1" 
      onClick={() => removeLayerById(item)} 
      style={{ borderRadius: 0, fontSize: '12px' }}
    >
      <FaRegTrashCan size={15} style={{marginTop:-2}} />&nbsp;Remove Layer
    </Dropdown.Item>
  </Dropdown.Menu>
</Dropdown>
      </ButtonGroup>
    </Row>
  );
}

export default ButtonGroupComp;