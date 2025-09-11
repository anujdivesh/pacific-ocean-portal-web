"use client";
import React,{useState,useEffect,useRef} from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
//import '@/components/css/datepicker.css';
import { updateMapLayer } from '@/app/GlobalRedux/Features/map/mapSlice';
import {  useAppDispatch } from '@/app/GlobalRedux/hooks';
import {getDateFromArray, formatDateToISOWithoutMilliseconds,getDay,formatDateToISOWithoutMilliseconds3Monthly} from './helper';

import ReactDOM from 'react-dom';


function DateSelector({item,period,startDateStr,endDateStr}) {
  // Safety check to ensure item and layer_information exist
  if (!item || !item.layer_information) {
    console.warn('DateSelector: item or layer_information is undefined', item);
    return <div>Loading...</div>;
  }

  const PortalDatePicker = ({ children }) => {
    return ReactDOM.createPortal(children, document.body);
  };
  
  
  const dispatch = useAppDispatch();
  const _isMounted = useRef(true);
      const [startDateOrig, setStartDateOrig] = useState(new Date(item.layer_information?.timeIntervalStartOriginal || new Date()));
    const [endDateOrig, setEndDateOrig] = useState(new Date(item.layer_information?.timeIntervalEndOriginal || new Date()));

    const [startDate, setStartDate] = useState(startDateStr);
    const [endDate, setEndDate] = useState(endDateStr);
    const dateArray = useRef([]);
    var spec = item.layer_information?.specific_timestemps || null;
    var specifc_stemps = item.layer_information?.specific_timestemps && item.layer_information.specific_timestemps !== null ? item.layer_information.specific_timestemps.split(',') : null;
    var weekRange = item.layer_information?.interval_step && item.layer_information.interval_step !== null ? item.layer_information.interval_step.split(',') : null;


    const [currentDate, setCurrentDate] = useState();

      const today = new Date();
      const sevenDaysLater = new Date(today); // Copy the current date
      sevenDaysLater.setDate(today.getDate() + 7);

      const [starttoday, setstarttoday] = useState(today);
      const [end7day, setend7day] = useState(sevenDaysLater);

      const [startDate3, setStartDate3] = useState(startDateStr);
    const [endDate3, setEndDate3] = useState(endDateStr);
      const [startDate2, setStartDate2] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    
      const handleUpdateLayer = (id, updates) => {
        dispatch(updateMapLayer({ id, updates }));
      };

      // Function to handle date changes
      const handleChange = (date,item) => {
        if (item.layer_information.datetime_format === 'MONTHLY'){
          if (spec !== ""){
            var date = getDateFromArray(dateArray.current,date.getFullYear(), date.getMonth()+1);
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}.000Z`;
            var day = getDay(dateArray.current,date.getFullYear(), date.getMonth()+1)
           // console.log(dateArray.current,date.getFullYear(), date.getMonth(),day)
            setCurrentDate(date);
            //console.log(new Date(date.getFullYear(), date.getMonth(), day))
            
            handleUpdateLayer(item.id, {
              layer_information: {
                ...item.layer_information,
                // Ensure both start & end updated so map refresh logic (which may read one or the other) always sees change
                timeIntervalStart: dateString,
                timeIntervalEnd: dateString,
                zoomToLayer:false // Updated value
              }
            });
          }
          else{
            setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
            handleUpdateLayer(item.id, {
              layer_information: {
                ...item.layer_information,
                // For non-specific monthly pick first day; mirror to end for consistency
                timeIntervalStart:formatDateToISOWithoutMilliseconds(new Date(date.getFullYear(), date.getMonth(), 1)),
                timeIntervalEnd:formatDateToISOWithoutMilliseconds(new Date(date.getFullYear(), date.getMonth(), 1)),
                zoomToLayer:false // Updated value
              }
            });
          }
        }
        else if (item.layer_information.datetime_format === 'WEEKLY'){
           setCurrentDate(date)
          //setStartDate(date)
          
          handleUpdateLayer(item.id, {
            layer_information: {
              ...item.layer_information,
              timeIntervalStart:date,
              zoomToLayer:false // Updated value
            }
          });
        }
        else{
            setCurrentDate(date)
            
            handleUpdateLayer(item.id, {
              layer_information: {
                ...item.layer_information,
                // Generic single-date selection: update both start & end for robustness
                timeIntervalStart:formatDateToISOWithoutMilliseconds(date),
                timeIntervalEnd:formatDateToISOWithoutMilliseconds(date),
                zoomToLayer:false // Updated value
              }
            });
            
      
        }
     //   console.log(date)
      };

      const handleonchange3month = (date, item) => {
       // console.log(formatDateToISOWithoutMilliseconds3Monthly(date))
        
        handleUpdateLayer(item.id, {
          layer_information: {
            ...item.layer_information,
            // 3MONTHLY: sync both start & end to chosen period key
            timeIntervalStart: formatDateToISOWithoutMilliseconds3Monthly(date),
            timeIntervalEnd: formatDateToISOWithoutMilliseconds3Monthly(date),
            zoomToLayer: false
          }
        });
      };
      const customStyles = {
        popper: {
          zIndex: 9999, // Higher than other elements
        },
      };
       const handleonchange3monthSeasonal = (date, item) => {
  const d = new Date(date);
  // Force midnight (00:00:00) in UTC
  console.log(d)
  console.log(formatDateToISOWithoutMilliseconds3Monthly(d))

  handleUpdateLayer(item.id, {
    layer_information: {
      ...item.layer_information,
  // Seasonal 3-month: set both for consistent refresh
  timeIntervalStart: formatDateToISOWithoutMilliseconds3Monthly(d),
  timeIntervalEnd: formatDateToISOWithoutMilliseconds3Monthly(d),
      zoomToLayer: false
    }
  });
};
      useEffect(() => {  
        if (_isMounted.current){

          if (item.layer_information.datetime_format === 'DAILY') {
            setStartDate(startDateStr)
            setEndDate(endDateStr)
            
            if (item.layer_information.layer_type == "WMS_FORECAST"){
              setCurrentDate(startDateStr)
            }
            else{
              setCurrentDate(endDateStr)
            }
           // console.log(endDateStr,startDateStr )
          }
          else if (item.layer_information.datetime_format === 'MONTHLY' || item.layer_information.datetime_format === '3MONTHLY') {
            var dateTimeArray;
            if (spec !== ""){
            dateTimeArray = spec.split(',').map(timestamp => new Date(timestamp.trim()));
            }
            dateArray.current = dateTimeArray;
            setStartDate(dateTimeArray[0])
            setEndDate(dateTimeArray[dateTimeArray.length - 1])
            //setCurrentDate(dateTimeArray[dateTimeArray.length - 1])
            if (item.layer_information.layer_type == "WMS_FORECAST"){
              setCurrentDate(dateTimeArray[0])
            }
            else{
              setCurrentDate(dateTimeArray[dateTimeArray.length - 1])
            }
          }
          else if (item.layer_information.datetime_format === 'WEEKLY_NRT'){
            var dateTimeArray;
            if (spec !== ""){
            dateTimeArray = spec.split(',').map(timestamp => new Date(timestamp.trim()));
            }
            dateArray.current = dateTimeArray;
            setStartDate(dateTimeArray[0])
            setEndDate(dateTimeArray[dateTimeArray.length - 1])
            //setCurrentDate(dateTimeArray[dateTimeArray.length - 1])
            if (item.layer_information.layer_type == "WMS_FORECAST"){
              setCurrentDate(dateTimeArray[0])
            }
            else{
              setCurrentDate(dateTimeArray[dateTimeArray.length - 1])
            }
          }
          else if (item.layer_information.datetime_format === 'HOURLY') {
            console.log(endDateStr)
            //setCurrentDate(endDateStr)
            setCurrentDate(new Date(endDateStr));

          }
           // inside useEffect, add this branch
          else if (item.layer_information.datetime_format === '3MONTHLY_SEASONAL') {
            let dateTimeArray = [];
            const hasSpec = typeof spec === 'string' && spec.trim() !== '';

            if (hasSpec) {
              dateTimeArray = spec
                .split(',')
                .map(t => new Date(t.trim()))
                .filter(d => !isNaN(d));
            } else {
              const sSrc = item.layer_information?.timeIntervalStartOriginal || startDateStr;
              const eSrc = item.layer_information?.timeIntervalEndOriginal || endDateStr;
              const s = sSrc ? new Date(sSrc) : null;
              const e = eSrc ? new Date(eSrc) : null;

              if (s && e && !isNaN(s) && !isNaN(e)) {
                const d = new Date(s.getFullYear(), s.getMonth(), 1);
                while (d <= e) {
                  dateTimeArray.push(new Date(d));
                  d.setMonth(d.getMonth() + 3);
                }
              }
            }

            dateArray.current = dateTimeArray;

            if (dateTimeArray.length) {
              setStartDate(dateTimeArray[0]);
              setEndDate(dateTimeArray[dateTimeArray.length - 1]);
              setCurrentDate(
                item.layer_information.layer_type == "WMS_FORECAST"
                  ? dateTimeArray[0]
                  : dateTimeArray[dateTimeArray.length - 1]
              );
            }
          }
          else if (item.layer_information.datetime_format === 'WEEKLY'){
            let dateWithoutZ = startDateStr.replace(/Z/g,'');

           let index = specifc_stemps.findIndex(date => date.trim() === dateWithoutZ.trim());
            setCurrentDate(specifc_stemps[index]);
          }

        }  
        return () => { _isMounted.current = false }; 
        },[]);

        const onChange = (dates,item) => {
         // console.log(dates)
          const [start, end] = dates;
          setstarttoday(start);
          setend7day(end);
          if (start != null && end != null){

          handleUpdateLayer(item.id, {
            layer_information: {
              ...item.layer_information,
              timeIntervalStart:formatDateToISOWithoutMilliseconds(start),
              timeIntervalEnd:formatDateToISOWithoutMilliseconds(end),
              zoomToLayer:false // Updated value
            }
          });
        }
        };

  //new
  let content;
  if (item.layer_information.datetime_format === 'DAILY') {
    content = <div style={{ width: '90%' }}>
  <DatePicker
    id="datepicker"
    selected={currentDate}
    showIcon
    onChange={(date) => handleChange(date,item)}
    minDate={startDate}
    maxDate={endDate}
    className="form-control date-picker-dark"
    placeholderText="MM/DD/YYYY"
    popperContainer={PortalDatePicker}
    onClick={(e) => e.currentTarget.blur()}
  />
  </div>
  }else if (item.layer_information.datetime_format === 'SPECIFIC') {
    content = <DatePicker
    showIcon
    selected={dateTimeArray[0]}
    onChange={(date)=>handleChange(date,item)}
    includeDates={dateTimeArray}
  className="form-control form-control-sm date-picker-dark"
    wrapperClassName="w-100"
    popperPlacement="bottom-start"
    popperContainer={PortalDatePicker}
    />;
  } else if (item.layer_information.datetime_format === 'MONTHLY') {
    content = <div style={{ width: '90%' }}>
    <DatePicker
    showIcon
        selected={currentDate}
        onChange={(date)=>handleChange(date,item)}
        onClick={(e) => e.currentTarget.blur()}
        dateFormat="yyyy/MM" // Display only month and year
        showMonthYearPicker // Show month and year picker
        showYearDropdown // Show year dropdown
        scrollableYearDropdown // Make the year dropdown scrollable
        yearDropdownItemNumber={15} // Number of years to display in dropdown
        minDate={startDate} // Set minimum date
        maxDate={endDate} // Set maximum date
  className="form-control form-control-sm date-picker-dark"
        wrapperClassName="w-100"
        popperPlacement="bottom-start"
        popperContainer={PortalDatePicker}
      />
      </div>
  } /*else if (item.layer_information.datetime_format === '3MONTHLY') {
     // Check if dateArray.current exists and has items
  if (!dateArray.current || dateArray.current.length === 0) {
    content = <div>Loading dates...</div>;
  } else {
    content = (
      <div style={{ width: '80%' }}>
      <select 
      className="form-select form-select-sm rounded-pill"
      value={currentDate} 
      onChange={(e) => {
          const selectedDate = new Date(e.target.value);
          setCurrentDate(selectedDate);
          handleonchange3month(selectedDate, item);
      }}
  >
      {dateArray.current.map((date, index) => {
          const startDate = new Date(date);
          const endDate = new Date(startDate);
          endDate.setMonth(startDate.getMonth() + 2); // Add 3 months
          
          const startYear = startDate.getFullYear();
          const startMonth = startDate.toLocaleString('default', { month: 'short' });
          const endMonth = endDate.toLocaleString('default', { month: 'short' });
          
          return (
              <option key={index} value={date}>
                  {startYear}, {startMonth} - {endMonth}
              </option>
          );
      })}
  </select>
  </div>
    );
  }
}*/

//used to work
/*
else if (item.layer_information.datetime_format === '3MONTHLY') {
  // Check if dateArray.current exists and has items
  if (!dateArray.current || dateArray.current.length === 0) {
    content = <div>Loading dates...</div>;
  } else {
    // Extract unique years from dateArray
    const years = [...new Set(dateArray.current.map(date => new Date(date).getFullYear()))];
    
    // For 3-monthly intervals, we need to find unique 3-month periods
    // Group dates by year and starting month of 3-month period
    const monthPeriods = new Map();
    
    dateArray.current.forEach(date => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = d.getMonth();
      
      // Determine which 3-month period this month belongs to
      // 0-2 -> Jan-Mar (period 0), 3-5 -> Apr-Jun (period 3), etc.
      const periodStart = Math.floor(month / 3) * 3;
      const periodKey = `${year}-${periodStart}`;
      
      if (!monthPeriods.has(periodKey)) {
        monthPeriods.set(periodKey, {
          year: year,
          startMonth: periodStart,
          startMonthName: new Date(year, periodStart, 1).toLocaleString('default', { month: 'short' }),
          endMonthName: new Date(year, periodStart + 2, 1).toLocaleString('default', { month: 'short' })
        });
      }
    });

    // Convert to sorted array
    const sortedPeriods = Array.from(monthPeriods.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.startMonth - b.startMonth;
    });

    // Find current year and month from currentDate
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentPeriodStart = Math.floor(currentMonth / 3) * 3;

    content = (
      <div style={{ width: '80%', display: 'flex', gap: '5px', marginLeft: -20  }}>
       
        <select 
          className="form-select form-select-sm rounded-pill"
          value={currentYear}
          style={{ minWidth: '80px' }}
          onChange={(e) => {
            const selectedYear = parseInt(e.target.value);
            const newDate = new Date(currentDate);
            newDate.setFullYear(selectedYear);
            
            // Find the first available period for this year
            const availablePeriod = sortedPeriods.find(p => p.year === selectedYear);
            if (availablePeriod) {
              newDate.setMonth(availablePeriod.startMonth);
            }
            
            setCurrentDate(newDate);
            handleonchange3month(newDate, item);
          }}
        >
          {years.map((year, index) => (
            <option key={`year-${index}`} value={year}>
              {year}
            </option>
          ))}
        </select>

    
        <select 
          className="form-select form-select-sm rounded-pill"
          value={currentPeriodStart}
          style={{ minWidth: '120px' }}
          onChange={(e) => {
            const selectedPeriodStart = parseInt(e.target.value);
            const newDate = new Date(currentDate);
            newDate.setMonth(selectedPeriodStart);
            setCurrentDate(newDate);
            handleonchange3month(newDate, item);
          }}
        >
          {sortedPeriods
            .filter(period => period.year === currentYear)
            .map((period, index) => (
              <option key={`period-${index}`} value={period.startMonth}>
                {period.startMonthName} - {period.endMonthName}
              </option>
            ))}
        </select>
      </div>
    );
  }
}
*/

else if (item.layer_information.datetime_format === '3MONTHLY') {
  if (!dateArray.current || dateArray.current.length === 0 || !currentDate) {
    content = <div>Loading dates...</div>;
  } else {
    // Collect unique years and months-by-year (no duplicates)
    const years = [
      ...new Set(dateArray.current.map(d => new Date(d).getFullYear()))
    ].sort((a, b) => a - b);

    const monthsByYear = new Map(); // year -> sorted array of unique month numbers
    dateArray.current.forEach(date => {
      const d = new Date(date);
      const y = d.getFullYear();
      const m = d.getMonth();
      if (!monthsByYear.has(y)) monthsByYear.set(y, new Set());
      monthsByYear.get(y).add(m);
    });
    // Convert month sets to sorted arrays
    for (const [y, mset] of monthsByYear.entries()) {
      monthsByYear.set(y, Array.from(mset).sort((a, b) => a - b));
    }

    // Resolve current selections safely
    const curr = currentDate instanceof Date ? currentDate : new Date(currentDate);
    const currentYear = years.includes(curr.getFullYear()) ? curr.getFullYear() : years[0];
    const monthsForYear = monthsByYear.get(currentYear) || [];
    const currentMonth = monthsForYear.includes(curr.getMonth())
      ? curr.getMonth()
      : (monthsForYear[0] ?? 0);

    content = (
      <div style={{ width: '80%', display: 'flex', gap: '5px', marginLeft: -20 }}>
          <style>{`
          body.dark-mode .date-selector-dark-select,
          html.dark-mode .date-selector-dark-select {
            background-color: #3F4853 !important;
            color: #f1f5f9 !important;
            border: 1px solid #808080 !important;
          }
          body.dark-mode .date-selector-dark-select option,
          html.dark-mode .date-selector-dark-select option {
            background-color: #3F4853 !important;
            color: #f1f5f9 !important;
          }
        `}</style>
        {/* Year Select */}
        <select
          className="form-select form-select-sm rounded-pill date-selector-dark-select"
          value={currentYear}
          style={{ minWidth: '80px' }}
          onChange={(e) => {
            const selectedYear = parseInt(e.target.value, 10);
            const monthsForSelectedYear = monthsByYear.get(selectedYear) || [0];

            // Keep current month if available for the new year; otherwise use the first available month
            const monthToUse = monthsForSelectedYear.includes(currentMonth)
              ? currentMonth
              : (monthsForSelectedYear[0] ?? 0);

            const newDate = new Date(currentDate);
            newDate.setFullYear(selectedYear);
            newDate.setMonth(monthToUse);

            setCurrentDate(newDate);
            handleonchange3month(newDate, item);
          }}
        >
          {years.map((year) => (
            <option key={`year-${year}`} value={year}>
              {year}
            </option>
          ))}
        </select>

        {/* Month Range Select (no duplicates; scoped to selected year) */}
        <select
          className="form-select form-select-sm rounded-pill date-selector-dark-select"
          value={currentMonth}
          style={{ minWidth: '120px' }}
          onChange={(e) => {
            const selectedMonth = parseInt(e.target.value, 10);
            const newDate = new Date(currentDate);
            newDate.setFullYear(currentYear);
            newDate.setMonth(selectedMonth);
            setCurrentDate(newDate);
            handleonchange3month(newDate, item);
          }}
        >
          {monthsForYear.map((m) => {
            const startMonth = new Date(currentYear, m, 1).toLocaleString('default', { month: 'short' });
            const endMonth = new Date(currentYear, m + 2, 1).toLocaleString('default', { month: 'short' });
            return (
              <option key={`month-${currentYear}-${m}`} value={m}>
                {startMonth} - {endMonth}
              </option>
            );
          })}
        </select>
      </div>
    );
  }
}


else if (item.layer_information.datetime_format === 'WEEKLY_NRT') {
  if (!dateArray.current || dateArray.current.length === 0) {
    content = <div>Loading dates...</div>;
  } else {
    // Extract unique years
    const years = [...new Set(dateArray.current.map(date => new Date(date).getFullYear()))];
    const currentYear = currentDate.getFullYear();

    // Filter dates for current year and sort them
    const datesInYear = dateArray.current
      .map(dateStr => new Date(dateStr))
      .filter(d => d.getFullYear() === currentYear)
      .sort((a, b) => a - b);

    // ISO week number function
    const getISOWeek = (date) => {
      const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
    };

    // Format MM/DD
    const formatDate = (date) => {
      const m = date.getMonth() + 1;
      const d = date.getDate();
      return `${m.toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}`;
    };

    // Build unique week numbers and corresponding start dates
    const weekMap = new Map();
    datesInYear.forEach(date => {
      const week = getISOWeek(date);
      if (!weekMap.has(week)) {
        weekMap.set(week, date);
      }
    });

    const weekOptions = Array.from(weekMap.entries()).map(([week, date]) => {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      return {
        value: startDate.toISOString(),
        label: `${formatDate(startDate)}-${formatDate(endDate)}`
      };
    });

    // Find the week option matching currentDate
    const currentWeek = getISOWeek(currentDate);
    const currentWeekOption = weekOptions.find(opt => getISOWeek(new Date(opt.value)) === currentWeek);

    content = (
      <div style={{ width: '80%', display: 'flex', gap: '5px', marginLeft: -20 }}>
        {/* Year Select */}
        <select
          className="form-select form-select-sm rounded-pill"
          value={currentYear}
          style={{ minWidth: '80px' }}
          onChange={(e) => {
            const selectedYear = parseInt(e.target.value, 10);
            // Pick the first week date in the new year as default
            const availableDate = dateArray.current
              .map(dateStr => new Date(dateStr))
              .find(d => d.getFullYear() === selectedYear);
            if (availableDate) {
              setCurrentDate(availableDate);
              handleonchange3month(availableDate, item);
            }
          }}
        >
          {years.map((year, index) => (
            <option key={`year-${index}`} value={year}>
              {year}
            </option>
          ))}
        </select>

        {/* Week Select */}
        <select
          className="form-select form-select-sm rounded-pill"
          value={currentWeekOption ? currentWeekOption.value : weekOptions[0]?.value || ''}
          style={{ minWidth: '130px' }}
          onChange={(e) => {
            const selectedDate = new Date(e.target.value);
            setCurrentDate(selectedDate);
            handleonchange3month(selectedDate, item);
          }}
        >
          {weekOptions.map((opt, idx) => (
            <option key={`week-${idx}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
}



  else if (item.layer_information.datetime_format === 'HOURLY') {
    content =  (
    <>
    <div style={{width:'90%'}}>
     <style>{`
        /* Light selects only inside this datepicker instance */
        .dp-light-selects .react-datepicker__month-select,
        .dp-light-selects .react-datepicker__year-select {
          background-color: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;

           padding: 4px 5px 4px 5px;
        }

        /* Optional: make header and time list light as well */
        .dp-light-selects .react-datepicker__header {
          background-color: #ffffff !important;
        }
        .dp-light-selects .react-datepicker__time-container,
        .dp-light-selects .react-datepicker__time,
        .dp-light-selects .react-datepicker__time-box,
        .dp-light-selects .react-datepicker__time-list {
          background-color: #ffffff !important;
          color: #111827 !important;
        }
      `}</style>
    <DatePicker
    showIcon
    selected={currentDate}
    minDate={startDate ? new Date(startDate) : undefined}
    maxDate={endDate ? new Date(endDate) : undefined}
    onChange={(date)=>handleChange(date,item)}
    showTimeSelect
    timeIntervals={60}
    timeCaption="Hour"
    dateFormat="yyyy/MM/dd HH:00"
    timeFormat='HH:00'
    //includeDates={dateTimeArray}
  className="form-control form-control-sm date-picker-dark"
    popperPlacement="bottom-start"
    popperContainer={PortalDatePicker}

      // Month/Year selection

      showYearDropdown
      showMonthDropdown
      dropdownMode="select"
      scrollableYearDropdown
      yearDropdownItemNumber={50} // adjust as needed
      calendarClassName="dp-light-selects" 
  />
  </div>
  </>
  
    )
  }
  else if (item.layer_information.datetime_format === 'WEEKLY') {
    
    content = (
      <div style={{ width: '80%' }}>
        <style>{`
          body.dark-mode .date-selector-dark-select,
          html.dark-mode .date-selector-dark-select {
            background-color: #3F4853 !important;
            color: #f1f5f9 !important;
            border: 1px solid #808080 !important;
          }
          body.dark-mode .date-selector-dark-select option,
          html.dark-mode .date-selector-dark-select option {
            background-color: #3F4853 !important;
            color: #f1f5f9 !important;
          }
        `}</style>
      <select className="form-select form-select-sm rounded-pill date-selector-dark-select"
      value={currentDate} 
        onChange={(e) => handleChange(e.target.value,item)} 
        
      >
        {weekRange.map((item, index) => (
          <option key={index} value={specifc_stemps[index]}>
            {item} Week
          </option>
        ))}
      </select>
      </div>
    );
  }
  else if (item.layer_information.datetime_format === 'WFS_DAILY'){
    content = (
      
      <div style={{ paddingTop: 15, textAlign: 'center' }}>
         <p style={{ fontSize: 13, padding: '0 10px', textAlign:'left', whiteSpace:'nowrap', fontWeight:500 }}>Date Range:</p>
        <DatePicker
          selected={starttoday}
          onChange={(date)=>onChange(date,item)}
          minDate={startDateOrig}
          maxDate={endDateOrig}
          startDate={starttoday}
          endDate={end7day}
          selectsRange
          inline
          showDisabledMonthNavigation
          popperContainer={PortalDatePicker}
        />
      </div>
 
    );
  }
   else if (item.layer_information.datetime_format === '3MONTHLY_SEASONAL') {
  if (!dateArray.current || dateArray.current.length === 0 || !currentDate) {
    content = <div>Loading dates...</div>;
  } else {
    // Normalize all available dates to UTC midnight
    const parsedUTC = dateArray.current
      .map(d => new Date(d))
      .filter(d => !isNaN(d))
      .map(d => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)));

    // Build year/month map using UTC parts
    const years = [...new Set(parsedUTC.map(d => d.getUTCFullYear()))].sort((a, b) => a - b);

    const monthsByYearMap = new Map();
    parsedUTC.forEach(d => {
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      let arr = monthsByYearMap.get(y);
      if (!arr) {
        arr = [];
        monthsByYearMap.set(y, arr);
      }
      if (!arr.includes(m)) arr.push(m);
    });
    for (const [y, arr] of monthsByYearMap.entries()) {
      arr.sort((a, b) => a - b);
      monthsByYearMap.set(y, arr);
    }

    // Helper: get the correct day-of-month for a given UTC year/month from source data
    const dayFor = (y, m) => {
      const match = parsedUTC.find(d => d.getUTCFullYear() === y && d.getUTCMonth() === m);
      return match ? match.getUTCDate() : 1;
    };

    // Resolve currently selected year/month via UTC
    const curr = currentDate instanceof Date ? currentDate : new Date(currentDate);
    const yearToUse = years.includes(curr.getUTCFullYear()) ? curr.getUTCFullYear() : years[0];
    const monthsForYear = monthsByYearMap.get(yearToUse) || [];
    const monthToUse = monthsForYear.includes(curr.getUTCMonth())
      ? curr.getUTCMonth()
      : (monthsForYear[0] ?? 0);

    content = (
      <div style={{ width: '80%', display: 'flex', gap: '5px', marginLeft: -20 }}>
        <style>{`
          body.dark-mode .date-selector-dark-select,
          html.dark-mode .date-selector-dark-select {
            background-color: #3F4853 !important;
            color: #f1f5f9 !important;
            border: 1px solid #808080 !important;
          }
          body.dark-mode .date-selector-dark-select option,
          html.dark-mode .date-selector-dark-select option {
            background-color: #3F4853 !important;
            color: #f1f5f9 !important;
          }
        `}</style>
        {/* Year Select */}
        <select
          className="form-select form-select-sm rounded-pill date-selector-dark-select"
          value={yearToUse}
          style={{ minWidth: '80px' }}
          onChange={(e) => {
            const selectedYear = parseInt(e.target.value, 10);
            const monthsForSelectedYear = monthsByYearMap.get(selectedYear) || [0];
            const firstMonth = monthsForSelectedYear[0] ?? 0;
            const day = dayFor(selectedYear, firstMonth);

            // Construct exact UTC midnight using the correct day from data
            const newDateUTC = new Date(Date.UTC(selectedYear, firstMonth, day, 0, 0, 0, 0));
            setCurrentDate(newDateUTC);
            handleonchange3monthSeasonal(newDateUTC, item);
          }}
        >
          {years.map((year) => (
            <option key={`year-${year}`} value={year}>
              {year}
            </option>
          ))}
        </select>

        {/* Month Select (label shows prev - next month) */}
        <select
          className="form-select form-select-sm rounded-pill date-selector-dark-select"
          value={monthToUse}
          style={{ minWidth: '120px' }}
          onChange={(e) => {
            const selectedMonth = parseInt(e.target.value, 10);
            const day = dayFor(yearToUse, selectedMonth);

            const newDateUTC = new Date(Date.UTC(yearToUse, selectedMonth, day, 0, 0, 0, 0));
            setCurrentDate(newDateUTC);
            handleonchange3monthSeasonal(newDateUTC, item);
          }}
        >
          {(monthsByYearMap.get(yearToUse) || []).map((m) => {
            const prev = new Date(Date.UTC(yearToUse, m - 1, 1));
            const next = new Date(Date.UTC(yearToUse, m + 1, 1));
            const label = `${prev.toLocaleString('default', { month: 'short' })} - ${next.toLocaleString('default', { month: 'short' })}`;
            return (
              <option key={`month-${m}`} value={m}>
                {label}
              </option>
            );
          })}
        </select>
      </div>
    );
  }
}
  
  
  else {
    content = <div>Default Content</div>;
  }


  
return (
  <div className="row align-items-center" style={{ marginTop: '-5px', marginBottom: '8px',paddingTop:8 }}>
    {item.layer_information.datetime_format !== 'WFS_DAILY' && (
      <div className="col-sm-4">
        <style>{`
  /* Light mode date picker input white background */
  html.light-mode .date-picker-dark, body.light-mode .date-picker-dark {
    background-color: #ffffff !important;
    color: #111827 !important;
    border: 1px solid #d1d5db !important;
  }
  .date-selector-label { padding: 0 10px; white-space: nowrap; font-size:13px; font-weight:500; }
       select.form-select.form-select-sm.rounded-pill {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23000000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  }
  body.dark-mode select.form-select.form-select-sm.rounded-pill {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23FFFFFF' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  }
    `}</style>
        <div className="date-selector-label">Date Range:</div>
      </div>
    )}
    <div className={item.layer_information.datetime_format === 'WFS_DAILY' ? 'col-sm-12' : 'col-sm-8'}>
      {content}
    </div>
  </div>
);

}
export default DateSelector;
