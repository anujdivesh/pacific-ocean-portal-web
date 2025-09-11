import React, {useEffect } from 'react';
import NestedAccordion from './nested_accordion';
import { useAppSelector } from '@/app/GlobalRedux/hooks'
function MyAccordion({dataset}) {
  const accordion_val = useAppSelector((state) => state.accordion.value);
  // Accept searchQuery as prop
  const searchQuery = arguments[0]?.searchQuery || "";

    useEffect(() => {
        // This will run when the dataset changes
       // console.log("Dataset updated:", dataset);
      }, [dataset]); // The effect runs whenever `dataset` changes
    
   
   // Check if the dataset is empty or undefined
   if (!dataset || dataset.length === 0) {
    return (
      <div>
        <p style={{padding:120}}>No dataset found.</p>
      </div>
    );
  } else {
    return (
      <div>
        {/* If dataset exists, render NestedAccordion */}
        <NestedAccordion data={dataset} openIds={accordion_val} searchQuery={searchQuery} />
      </div>
    );
  }

}

export default MyAccordion;