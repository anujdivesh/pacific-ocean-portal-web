'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '@/app/GlobalRedux/hooks';
import { Spinner } from 'react-bootstrap';

// Jet colormap: returns rgb string for value in [0, 1]
function jetColor(value, min = 0, max = 4) {
  let v = Math.max(min, Math.min(max, value));
  v = (v - min) / (max - min);
  let r = Math.floor(255 * Math.max(Math.min(1.5 - Math.abs(4 * v - 3), 1), 0));
  let g = Math.floor(255 * Math.max(Math.min(1.5 - Math.abs(4 * v - 2), 1), 0));
  let b = Math.floor(255 * Math.max(Math.min(1.5 - Math.abs(4 * v - 1), 1), 0));
  if ([r, g, b].some(x => isNaN(x))) return "rgb(127,127,127)";
  return `rgb(${r},${g},${b})`;
}

// Red colormap: returns rgb string for value in [min, max] mapped to a red gradient
function redColor(value, min = 0, max = 20) {
  let v = Math.max(min, Math.min(max, value));
  v = (v - min) / (max - min);
  const start = { r: 255, g: 229, b: 229 };
  const end = { r: 127, g: 0, b: 0 };
  const r = Math.round(start.r + (end.r - start.r) * v);
  const g = Math.round(start.g + (end.g - start.g) * v);
  const b = Math.round(start.b + (end.b - start.b) * v);
  return `rgb(${r},${g},${b})`;
}

// Blue colormap: returns rgb string for value in [min, max] mapped to a blue gradient
function blueColor(value, min = 0, max = 4) {
  let v = Math.max(min, Math.min(max, value));
  v = (v - min) / (max - min);
  const start = { r: 232, g: 244, b: 255 };
  const end = { r: 0, g: 51, b: 102 };
  const r = Math.round(start.r + (end.r - start.r) * v);
  const g = Math.round(start.g + (end.g - start.g) * v);
  const b = Math.round(start.b + (end.b - start.b) * v);
  return `rgb(${r},${g},${b})`;
}

// Parse label config, detect {calc}, color type, range, decimal places (default 0)
function parseLabelConfig(label) {
  const configMatch = label.match(/\{([^}]*)\}/);
  let config = {};
  if (configMatch) {
    const configParts = configMatch[1].split('/');
    configParts.forEach(part => {
      const lower = part.trim().toLowerCase();
      if (lower === 'calc') config.calc = true;
      else if (lower === 'jet' || lower === 'dir' || lower === 'rd' || lower === 'bu') config.type = lower;
      else if (/^\d+\s*-\s*\d+$/.test(lower)) {
        const [min, max] = lower.split('-').map(Number);
        config.min = min;
        config.max = max;
      }
      else if (/^\d+$/.test(lower)) {
        config.decimalPlaces = parseInt(lower, 10);
      }
    });
  }
  if (typeof config.decimalPlaces !== "number") {
    config.decimalPlaces = 0; // default to 0 if not provided
  }
  const cleanLabel = label.replace(/\{[^}]*\}/, '').trim();
  return { ...config, cleanLabel };
}

function isColorDark(colorString) {
  if (!colorString) return false;
  let r, g, b;
  const rgbMatch = colorString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    [r, g, b] = rgbMatch.slice(1, 4).map(Number);
  }
  else if (colorString[0] === '#') {
    let hex = colorString.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    if (hex.length !== 6) return false;
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    const numbers = colorString.match(/\d+/g);
    if (numbers && numbers.length >= 3) {
      [r, g, b] = numbers.map(Number);
    } else {
      return false;
    }
  }
  if ([r, g, b].some(v => typeof v !== 'number' || isNaN(v))) return false;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}

function filterToSixHourly(times, values) {
  const filteredTimes = [];
  const filteredValues = [];
  if (!times.length) return { times: filteredTimes, values: filteredValues };
  let firstIdx = -1;
  for (let i = 0; i < times.length; i++) {
    const date = new Date(times[i]);
    if (date.getUTCHours() % 6 === 0) {
      firstIdx = i;
      break;
    }
  }
  if (firstIdx !== -1) {
    for (let i = firstIdx; i < times.length; i += 6) {
      filteredTimes.push(times[i]);
      filteredValues.push(values[i]);
    }
  }
  return { times: filteredTimes, values: filteredValues };
}

function calculateWaveEnergyKw(xValues, yValues) {
  if (!Array.isArray(xValues) || !Array.isArray(yValues)) return [];
  const rho = 1025;
  const g = 9.81;
  const len = Math.min(xValues.length, yValues.length);
  const result = [];
  for (let i = 0; i < len; i++) {
    const x = xValues[i];
    const y = yValues[i];
    if ((typeof x === "number" || !isNaN(Number(x)))
      && (typeof y === "number" || !isNaN(Number(y)))) {
      const mag = Math.sqrt(Number(x) * Number(x) + Number(y) * Number(y));
      const Hs = mag;
      const T = 8;
      const P = (rho * g * g / (32 * Math.PI)) * (Hs * Hs) * T;
      result.push(P / 1000);
    } else {
      result.push(null);
    }
  }
  return result;
}

// formatSmart uses decimalPlaces (defaulted to 0 in config)
const formatSmart = (value, decimalPlaces) => {
  if (value === null || value === undefined || value === "") return '';
  if (typeof value !== "number") {
    let num = Number(value);
    if (isNaN(num)) return String(value).slice(0, 2);
    value = num;
  }
  if (typeof decimalPlaces !== "number") decimalPlaces = 0;
  return value.toFixed(decimalPlaces);
};

function Tabular({ height }) {
  const mapLayer = useAppSelector((state) => state.mapbox.layers);
  const currentId = useAppSelector((state) => state.offcanvas.currentId);
  const allCoordinates = useAppSelector((state) => state.coordinate.coordinates);
  let coordinates = allCoordinates[currentId];
  if (!coordinates) {
    // Fallback: use first available coordinates if currentId is missing
    const keys = Object.keys(allCoordinates);
    if (keys.length > 0) {
      coordinates = allCoordinates[keys[0]];
      console.warn('Tablular.jsx fallback to first available coordinates:', coordinates);
    } else {
      coordinates = {};
    }
  }
  const { x, y, sizex, sizey, bbox, station } = coordinates;
  const isCoordinatesValid = [x, y, sizex, sizey, bbox].every(v => v !== null && v !== undefined && v !== '');
  const [data, setData] = useState([]);
  const [rawValuesMap, setRawValuesMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [enabledTable, setEnabledTable] = useState(false);
  const [datasetsConfig, setDatasetsConfig] = useState([]);
  const [selectedDatasets, setSelectedDatasets] = useState({});
  const lastlayer = useRef(0);
  

  // HOVER STATE for (rowIdx, colIdx)
  const [hover, setHover] = useState({ row: null, col: null });

  const fetchData = async (time, url_tmp, layer, label, setDataFn, variable) => {
    let url = url_tmp;
    if (url.includes('@')) {
      const parts = url_tmp.split('?');
      const remaining = parts.slice(2);
      const joined = remaining.join('?');
      url = joined.replace(/@/g, '?');
    }
    setLoading(true);
    let urlWithParams = "";
    let count = (url.match(/REQUEST/g) || []).length;
    if (count >= 2) {
      var featureInfoUrl = url;
      featureInfoUrl = featureInfoUrl.replace(/wms\?.*?REQUEST=[^&]*?&.*?REQUEST=[^&]*?&/, '');
      featureInfoUrl = featureInfoUrl.replace(/VERSION=1\.3\.0&/g, '');
      if (!/\/ncWMS\/wms\?/.test(featureInfoUrl)) {
        featureInfoUrl = featureInfoUrl.replace(/\/ncWMS\/?/i, '/ncWMS/wms?REQUEST=GetTimeseries&');
      }
      urlWithParams = featureInfoUrl
        .replace('${layer}', layer)
        .replace('${layer2}', layer)
        .replace('${bbox}', bbox)
        .replace('${x}', x)
        .replace('${y}', y)
        .replace('${sizex}', sizex)
        .replace('${time}', time)
        .replace('${sizey}', sizey);
    } else {
      urlWithParams = url
        .replace('${layer}', layer)
        .replace('${layer2}', layer)
        .replace('${x}', x)
        .replace('${y}', y)
        .replace('${bbox}', bbox)
        .replace('${sizex}', sizex)
        .replace('${time}', time)
        .replace('${sizey}', sizey);
    }
    if (!urlWithParams.includes("VERSION")) {
      const separator = urlWithParams.includes('?') ? '&' : '?';
      urlWithParams = urlWithParams + separator + 'VERSION=1.1.1';
    }
    try {
      const res = await fetch(urlWithParams);
      if (!res.ok) {
        setDataFn([], [], label, variable);
        return;
      }
      const responseText = await res.text();
      try {
        const data = JSON.parse(responseText);
        if (data && data.domain && data.domain.axes && data.domain.axes.t && data.domain.axes.t.values) {
          let layerName = layer.includes("/") ? layer.split("/")[1] : layer;
          let times = data.domain.axes.t.values;
          let values = data.ranges[layerName]?.values || [];
          let minDiff = null;
          if (times.length > 1) {
            minDiff = Math.min(...times.slice(1).map((t, i) => (new Date(t) - new Date(times[i])) / 36e5));
          }
          if (minDiff !== null && minDiff < 6) {
            const filtered = filterToSixHourly(times, values);
            times = filtered.times;
            values = filtered.values;
          }
          const formattedTimes = times.map((time) => {
            const date = new Date(time);
            const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
            const dayCode = days[date.getDay()];
            const dayNum = String(date.getDate());
            const hour = `${String(date.getHours()).padStart(2, '0')}hr`;
            return { dayCode, dayNum, hour };
          });
          setDataFn(formattedTimes, values, label, variable);
        } else {
          setDataFn([], [], label, variable);
        }
      } catch (jsonError) {
        setDataFn([], [], label, variable);
      }
    } catch (error) {
      setDataFn([], [], label, variable);
    } finally {
      setLoading(false);
    }
  };

  const setTableData = (times, values, label, variable) => {
    setData((prevData) => {
      const newData = { label, values, times, variable };
      return [...prevData.filter((item) => item.variable !== variable), newData];
    });
    setRawValuesMap((prev) => ({
      ...prev,
      [variable]: { times, values },
    }));
  };

  function getLayerById(layersArray, id) {
    for (let i = 0; i < layersArray.length; i++) {
      if (layersArray[i].id === id) {
        return layersArray[i];
      }
    }
    return undefined;
  }

  useEffect(() => {
    if (isCoordinatesValid && mapLayer.length > 0) {
      let selected_layer = getLayerById(mapLayer, currentId);
      if (!selected_layer) {
        // Fallback: use first available layer if currentId not found
        selected_layer = mapLayer[0];
        console.warn('Tablular.jsx fallback to first available layer:', selected_layer);
      }
      lastlayer.current = selected_layer;
      const layerInformation = selected_layer.layer_information;
      if (layerInformation) {
        const { table_variables, enable_chart_table, table_variable_label, table_url, timeIntervalStartOriginal,timeIntervalStart, timeIntervalEnd, url } = layerInformation;
        if (enable_chart_table) {
          const variables = table_variables.split(',');
          const labels = table_variable_label.split(',');
          const query_url = table_url;
           var use_time = timeIntervalStartOriginal;
        if (timeIntervalStartOriginal == null){
          use_time = timeIntervalStart
        }
        const time_range = use_time + "/" + timeIntervalEnd;
          //const time_range = timeIntervalStartOriginal + "/" + timeIntervalEnd;
          setEnabledTable(enable_chart_table);
          let configs = [];
          for (let i = 0; i < variables.length; i++) {
            const variable = variables[i];
            const labelConfig = parseLabelConfig(labels[i]);
            configs.push({
              key: variable,
              label: labelConfig.cleanLabel,
              layer: variable,
              query_url: url + "?" + query_url,
              timerange: time_range,
              config: labelConfig,
              originalVariable: variable,
              rawLabel: labels[i]
            });
            if (labelConfig.calc && variable.endsWith('_x')) {
              const yVar = variable.replace(/_x$/, '_y');
              configs.push({
                key: yVar,
                label: yVar,
                layer: yVar,
                query_url: url + "?" + query_url,
                timerange: time_range,
                config: { ...labelConfig, calc_prefetch_y: true },
                originalVariable: yVar,
                rawLabel: yVar,
                hidden: true
              });
            }
          }
          setDatasetsConfig(configs);
          const newSelectedDatasets = configs.reduce((acc, dataset) => {
            acc[dataset.key] = true;
            return acc;
          }, {});
          setSelectedDatasets(newSelectedDatasets);
        }
      }
    }
  }, [mapLayer, isCoordinatesValid, currentId]);

  useEffect(() => {
    if (isCoordinatesValid) {
      datasetsConfig.forEach((dataset) => {
        if (selectedDatasets[dataset.key]) {
          fetchData(dataset.timerange, dataset.query_url, dataset.layer, dataset.label, setTableData, dataset.key);
        } else {
          setData((prevData) => prevData.filter((item) => item.variable !== dataset.key));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatasets, datasetsConfig, x, y, isCoordinatesValid]);

  const handleCheckboxChange = (datasetKey) => {
    setSelectedDatasets((prevState) => ({
      ...prevState,
      [datasetKey]: !prevState[datasetKey],
    }));
  };

  if (!isCoordinatesValid) {
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
        <p style={{ fontSize: 16 }}>Click on map to retrieve data.</p>
      </div>
    );
  }

  if (!enabledTable) {
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
        <p style={{ fontSize: 16, color: 'var(--color-text, #333)' }}> This Feature is disabled.</p>
      </div>
    );
  }

  if (loading) {
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
        <Spinner animation="border" role="status" variant="primary" />
        <span style={{ marginLeft: '10px', fontSize: '18px' }}>Fetching data from API...</span>
      </div>
    );
  }

  const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const bgColor = isDarkMode ? '#2d3748' : '#eeeeee';
  const borderColor = isDarkMode ? '#4a5568' : '#E5E4E2';
  const hoverBgColor = isDarkMode ? '#4a5568' : '#eeeeee';
  const hoverTextColor = isDarkMode ? '#ffffff' : '#000000';

  const thFirstCol = {
    textAlign: 'center',
    fontWeight: 'normal',
    backgroundColor: bgColor,
    color: textColor,
    border: `1px solid ${borderColor}`,
    whiteSpace: 'nowrap',
    maxWidth: '240px',
    width: 'max-content',
  };
  const thOtherCols = {
    fontWeight: 'normal',
    textAlign: 'center',
    backgroundColor: bgColor,
    color: textColor,
    border: `1px solid ${borderColor}`,
    padding: '0 4px',
    minWidth: 32,
    maxWidth: 48,
    width: 38,
    whiteSpace: 'nowrap',
  };
  const tdFirstCol = {
    fontWeight: 'normal',
    textAlign: 'left',
    padding: '2px 6px',
    border: `1px solid ${borderColor}`,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '240px',
    width: 'max-content',
    backgroundColor: bgColor,
    color: textColor,
  };
  const tdOtherCols = {
    fontWeight: 'normal',
    textAlign: 'center',
    padding: '0 6px',
    border: `1px solid ${borderColor}`,
    minWidth: 32,
    maxWidth: 48,
    width: 38,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
    color: textColor,
  };

  const ArrowSVG = ({ angle }) => (
    <svg width="22" height="22" viewBox="0 0 22 22" style={{
      display: 'inline-block',
      transform: `rotate(${angle}deg)`,
      transition: "transform 0.2s",
      verticalAlign: "middle"
    }}>
      <line x1="11" y1="18" x2="11" y2="4" stroke={textColor} strokeWidth="2"/>
      <polygon points="11,2 7,8 15,8" fill={textColor} />
    </svg>
  );

  const timesArr = data.find(row => row.times)?.times || [];

  // Apply hover effect using inline style (so no CSS file needed)
  // The rowIdx is by datasetsConfig.filter(...).map index, colIdx is times index

  return (
    <div style={{
      display: 'block',
      height: `${height}px`,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      width: 'auto',
      minWidth: 0,
      maxWidth: '100vw',
      overflowX: 'auto'
    }}>
      <table
        style={{
          borderCollapse: 'collapse',
          textAlign: 'center',
          fontSize: 14,
          border: `1px solid ${borderColor}`,
          tableLayout: 'auto',
          width: 'auto',
          minWidth: 0,
          maxWidth: '100vw'
        }}
        className="table table-bordered"
      >
        <thead>
          <tr>
            <th style={thFirstCol}>
              Parameter
            </th>
            {timesArr.map((time, idx) => (
              <th key={idx} style={thOtherCols}>
                {time.dayCode}<br />{time.dayNum}<br />{time.hour}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datasetsConfig.filter(d => !d.hidden).map((dataset, rowIdx) => {
            if (dataset.config && dataset.config.calc) {
              const xVar = dataset.key;
              const yVar = dataset.key.replace(/_x$/, '_y');
              const xData = rawValuesMap[xVar];
              const yData = rawValuesMap[yVar];
              const times = xData?.times || yData?.times || timesArr;
              const waveEnergy = calculateWaveEnergyKw(xData?.values || [], yData?.values || []);
              return (
                <tr key={dataset.key}>
                  <td style={tdFirstCol}>
                    <input
                      type="checkbox"
                      checked={selectedDatasets[dataset.key] || false}
                      onChange={() => handleCheckboxChange(dataset.key)}
                    />
                    &nbsp;&nbsp;
                    {dataset.label}
                  </td>
                  {times.map((_, colIdx) => {
                    let cellStyle = { ...tdOtherCols };
                    const { min, max, type, decimalPlaces } = dataset.config || {};
                    let color = "#000";
                    if (
                      (type === "jet" || type === "rd" || type === "bu") &&
                      typeof waveEnergy[colIdx] === "number"
                    ) {
                      let bg;
                      if (type === "jet") {
                        bg = jetColor(waveEnergy[colIdx], min, max);
                      } else if (type === "rd") {
                        bg = redColor(waveEnergy[colIdx], min, max);
                      } else if (type === "bu") {
                        bg = blueColor(waveEnergy[colIdx], min, max);
                      }
                      color = isColorDark(bg) ? "#eeeeee" : "#000";
                      cellStyle = {
                        ...cellStyle,
                        backgroundColor: bg,
                        color,
                        transition: 'background-color 0.3s'
                      };
                    }
                    // Add hover effect
                    if (hover.row === rowIdx && hover.col === colIdx) {
                      cellStyle = {
                        ...cellStyle,
                        backgroundColor: hoverBgColor,
                        color: hoverTextColor,
                        zIndex: 10
                      };
                    }
                    return (
                      <td
                        key={colIdx}
                        style={cellStyle}
                        onMouseEnter={() => setHover({ row: rowIdx, col: colIdx })}
                        onMouseLeave={() => setHover({ row: null, col: null })}
                      >
                        {waveEnergy && waveEnergy[colIdx] != null ? formatSmart(waveEnergy[colIdx], decimalPlaces) : ""}
                      </td>
                    );
                  })}
                </tr>
              );
            }
            if (!dataset.hidden && !(dataset.config && dataset.config.calc)) {
              return (
                <tr key={dataset.key}>
                  <td style={tdFirstCol}>
                    <input
                      type="checkbox"
                      checked={selectedDatasets[dataset.key] || false}
                      onChange={() => handleCheckboxChange(dataset.key)}
                    />
                    &nbsp;&nbsp;
                    {dataset.label}
                  </td>
                  {data
                    .filter((row) => row.variable === dataset.key)
                    .map((row) =>
                      row.values.map((value, colIdx) => {
                        let cellStyle = { ...tdOtherCols };
                        const { min, max, type, decimalPlaces } = dataset.config || {};
                        let color = "#000";
                        if (
                          (type === "jet" || type === "rd" || type === "bu") &&
                          typeof value === "number"
                        ) {
                          let bg;
                          if (type === "jet") {
                            bg = jetColor(value, min, max);
                          } else if (type === "rd") {
                            bg = redColor(value, min, max);
                          } else if (type === "bu") {
                            bg = blueColor(value, min, max);
                          }
                          color = isColorDark(bg) ? "#eeeeee" : "#000";
                          cellStyle = {
                            ...cellStyle,
                            backgroundColor: bg,
                            color,
                            transition: 'background-color 0.3s'
                          };
                        }
                        // Add hover effect
                        if (hover.row === rowIdx && hover.col === colIdx) {
                          cellStyle = {
                            ...cellStyle,
                            backgroundColor: hoverBgColor,
                            color: hoverTextColor,
                            zIndex: 10
                          };
                        }
                        const isDirection = type === "dir";
                        // Improve visibility of direction (arrow) cells, especially in dark mode
                        if (isDirection) {
                          cellStyle = {
                            ...cellStyle,
                            backgroundColor: isDarkMode ? '#374151' : '#f9fafb'
                          };
                        }
                        return (
                          <td
                            key={colIdx}
                            style={cellStyle}
                            onMouseEnter={() => setHover({ row: rowIdx, col: colIdx })}
                            onMouseLeave={() => setHover({ row: null, col: null })}
                          >
                            {isDirection && typeof value === "number" ? (
                              <ArrowSVG angle={value+180} />
                            ) : (
                              formatSmart(value, decimalPlaces)
                            )}
                          </td>
                        );
                      })
                    )}
                </tr>
              );
            }
            return null;
          })}
        </tbody>
      </table>
    </div>
  );
}

export default Tabular;