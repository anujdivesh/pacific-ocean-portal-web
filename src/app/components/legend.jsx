import React from 'react';

function Legend({url}) {
  const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
  
  return(
    <div className="row" style={{marginTop:'5px'}}>
      <div className="col-sm-5" style={{marginLeft:15}}>
        <p style={{
          fontSize: 13,
          color: isDarkMode ? '#ffffff' : '#333333'
        }}>Legends:</p>
      </div>
      <div className="col-sm-7">
        <img src={url} style={{ width: '50px', height: 'auto' }} />
      </div>
    </div>
  )
}
export default Legend;