import React, { useState, useEffect, useRef } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '@/app/GlobalRedux/hooks';
import { updateMapLayer } from '@/app/GlobalRedux/Features/map/mapSlice';
import { get_url } from './urls';

const SofarTypeFilter = ({ item }) => {
  const [types, setTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useAppDispatch();
  const prevEnabledRef = useRef(item.layer_information.enabled);

  ///api call
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        setLoading(true);
        var url = get_url('insitu')
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch types');
        }
        const data = await response.json();
        var selected_Data;
        if ( item.layer_information.is_composite){
          const idString = item.layer_information.composite_layer_id; 
          selected_Data = data.filter(item => String(item.id) === idString);
        }
        else{
          selected_Data = data;
        }
        setTypes(selected_Data);
        
        // if none then select all
      /*  var existingSelectedTypes;
        if ( item.layer_information.is_composite){
          existingSelectedTypes = [item.layer_information.composite_layer_id];
        }
        else{
           existingSelectedTypes = item.layer_information.selectedSofarTypes;
        }*/
        const existingSelectedTypes = item.layer_information.selectedSofarTypes;
      /*  console.log(`SofarTypeFilter for layer ${item.id}:`, {
          existingSelectedTypes,
          typesCount: data.length
        });*/
        if (existingSelectedTypes && existingSelectedTypes.length > 0) {
          setSelectedTypes(existingSelectedTypes);
        } else {
          // all by default
          const allTypeIds = data.map(type => type.id);
          setSelectedTypes(allTypeIds);
          updateLayerTypes(allTypeIds);
        }
      } catch (error) {
        console.error('Error fetching SOFAR types:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTypes();
  }, []);

  // Update
  useEffect(() => {
    const existingSelectedTypes = item.layer_information.selectedSofarTypes;
    if (existingSelectedTypes && existingSelectedTypes.length > 0) {
      setSelectedTypes(existingSelectedTypes);
    }
  }, [item.layer_information.selectedSofarTypes]);

  //check if the the Pacific wave buoy network is checked
  useEffect(() => {
    
    if (prevEnabledRef.current !== item.layer_information.enabled) {
      const isLayerEnabled = item.layer_information.enabled;
      
      if (isLayerEnabled) {
        // Only update if we have types loaded and no existing selection
        if (types.length > 0) {
          const existingSelectedTypes = item.layer_information.selectedSofarTypes;
          if (!existingSelectedTypes || existingSelectedTypes.length === 0) {
            // Only select all if no existing selection (for new layers)
            const allTypeIds = types.map(type => type.id);
            setSelectedTypes(allTypeIds);
            updateLayerTypes(allTypeIds);
          } else {
            // Use existing selection (for restored layers)
            setSelectedTypes(existingSelectedTypes);
          }
        }
      } else {
        setSelectedTypes([]);
        updateLayerTypes([]);
      }
      
      // Update the ref
      prevEnabledRef.current = isLayerEnabled;
    }
  }, [item.layer_information.enabled, types]);

  const updateLayerTypes = (typeIds) => {
    dispatch(updateMapLayer({
      id: item.id,
      updates: {
        layer_information: {
          ...item.layer_information,
          selectedSofarTypes: typeIds
        }
      }
    }));
  };

  const handleTypeChange = (typeId, checked) => {
    let newSelectedTypes;
    
    if (checked) {
      // add to my array
      newSelectedTypes = [...selectedTypes, typeId];
    } else {
      // remove from my array
      newSelectedTypes = selectedTypes.filter(id => id !== typeId);
    }
    
    setSelectedTypes(newSelectedTypes);
    updateLayerTypes(newSelectedTypes);
  };

  const handleSelectAll = () => {
    const allTypeIds = types.map(type => type.id);
    setSelectedTypes(allTypeIds);
    updateLayerTypes(allTypeIds);
  };

  const handleClearAll = () => {
    setSelectedTypes([]);
    updateLayerTypes([]);
  };

  // Determine if all types are selected or none are selected
  const allTypesSelected = selectedTypes.length === types.length && types.length > 0;
  const noTypesSelected = selectedTypes.length === 0;
  
  // Determine button text and action based on current state
  const getButtonText = () => {
    if (allTypesSelected) {
      return 'Remove all';
    } else {
      return 'Add all';
    }
  };

  const handleToggleAll = () => {
    if (allTypesSelected) {
      // If all are selected, remove all
      handleClearAll();
    } else {
      // If not all are selected, add all
      handleSelectAll();
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
        Loading types...
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: '10px', paddingBottom: '0px', marginBottom: '-19px', overflowY: 'auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px',
        paddingBottom: '5px',
        borderBottom: '1px solid #eee'
      }}>
        <span style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          color: item.layer_information.enabled ? '#999' : '#999'
        }}>
          Filter by Type {!item.layer_information.enabled && '(Layer Disabled)'}
        </span>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={handleToggleAll}
            disabled={!item.layer_information.enabled}
            style={{
              fontSize: '12px',
              padding: '2px 6px',
              marginTop:'4px',
              marginRight:'4px',
              border: '1px solid #ccc',
              background: item.layer_information.enabled ? '#f8f9fa' : '#f0f0f0',
              color: '#222',
              cursor: item.layer_information.enabled ? 'pointer' : 'not-allowed',
              borderRadius: '3px',
              opacity: item.layer_information.enabled ? 1 : 0.6
            }}
          >
            {getButtonText()}
          </button>
        </div>
      </div>
      
      <div style={{ display: 'inline-block' }}>
        {types.map((type) => {
  let circleColor = "#01dddd"; // default blue
  if (type.id === 3) {
    circleColor = "#3f51b5"; // light purple
  } else if (type.id === 4) {
    circleColor = "#fe7e0f"; // light green
  }

  return (
    <Form.Check
      key={type.id}
      type="checkbox"
      id={`sofar-type-${item.id}-${type.id}`}
      label={
        <span style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: circleColor,
              marginRight: 8,
              border: "1.5px solid #fff",
              boxShadow: "0 0 2px rgba(0,0,0,0.2)"
            }}
          />
          {type.value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      }
      checked={selectedTypes.includes(type.id)}
      onChange={(e) => handleTypeChange(type.id, e.target.checked)}
      disabled={!item.layer_information.enabled}
      style={{
        fontSize: '14px',
        marginBottom: '5px',
        cursor: item.layer_information.enabled ? 'pointer' : 'not-allowed',
        opacity: item.layer_information.enabled ? 1 : 0.6
      }}
    />
  );
})}
      </div>
    </div>
  );
};

export default SofarTypeFilter;
