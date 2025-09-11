

'use client';
import React, { useState, useEffect } from 'react';
import { Accordion, Spinner } from 'react-bootstrap';
import { IoMdAddCircleOutline, IoMdCheckmarkCircleOutline } from "react-icons/io";
import { useAppDispatch } from '@/app/GlobalRedux/hooks';
import { setDataset } from '@/app/GlobalRedux/Features/dataset/dataSlice';
import { setAccordion } from '@/app/GlobalRedux/Features/accordion/accordionSlice';

const NestedAccordion = ({ data, openIds, searchQuery = "" }) => {
  // Lowercase searchQuery for matching
  const normalizedSearch = searchQuery.toLowerCase();

  // Filter function for search, also collect first match for auto-expand
  let firstMatchId = null;
  const filterData = (items) => {
    if (!normalizedSearch) return items;
    return items
      .map(item => {
        let filteredContent = item.content ? item.content.filter(ci => {
          const match = ci.name.toLowerCase().includes(normalizedSearch);
          if (match && !firstMatchId) firstMatchId = ci.id;
          return match;
        }) : [];
        let filteredChildren = item.children ? filterData(item.children) : [];
        const itemMatch = item.display_title?.toLowerCase().includes(normalizedSearch);
        if (itemMatch && !firstMatchId) firstMatchId = item.id;
        if (itemMatch || filteredContent.length > 0 || filteredChildren.length > 0) {
          return {
            ...item,
            content: filteredContent,
            children: filteredChildren
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const filteredData = filterData(data);

  // Helper to compute grouped labels for expansion
  const groupedLabels = React.useMemo(() => {
    if (!filteredData) return [];
    const labels = [];
    const collectLabels = (items) => {
      items.forEach(item => {
        if (item.content && item.content.length > 0) {
          item.content.forEach(ci => {
            const match = normalizedSearch && ci.name.toLowerCase().includes(normalizedSearch);
            if (match && ci.name.match(/\[(.*?)\]/)) {
              const label = ci.name.match(/\[(.*?)\]/)[1].trim();
              labels.push(label);
            }
          });
        }
        if (item.children && item.children.length > 0) {
          collectLabels(item.children);
        }
      });
    };
    collectLabels(filteredData);
    return labels;
  }, [filteredData, normalizedSearch]);

  // Auto-expand grouped accordions if a match is found in the group when searching
  useEffect(() => {
    if (normalizedSearch && groupedLabels.length > 0) {
      setSstAccordionOpen(groupedLabels[0]);
    }
  }, [normalizedSearch, groupedLabels]);

  const dispatch = useAppDispatch();
  const [activeItemId, setActiveItemId] = useState(null);
  const [sstAccordionOpen, setSstAccordionOpen] = useState(null);
  const [manuallyOpenedAccordions, setManuallyOpenedAccordions] = useState(new Set());

  const findPathToRoot = (node, targetId) => {
    if (node.content && node.content.some(item => item.id === targetId)) {
      return [node.id, targetId];
    }
    if (node.children) {
      for (const child of node.children) {
        const result = findPathToRoot(child, targetId);
        if (result) {
          return [node.id, ...result];
        }
      }
    }
    return null;
  };

  const findIdsPath = (data, targetId) => {
    for (const rootNode of data) {
      const result = findPathToRoot(rootNode, targetId);
      if (result) {
        return result.reverse();
      }
    }
    return null;
  };

  // Effect to automatically expand accordion when data changes and there's an active item
  useEffect(() => {
    if (data && data.length > 0 && activeItemId) {
      const pathToItem = findIdsPath(data, activeItemId);
      if (pathToItem && pathToItem.length > 0) {
        dispatch(setAccordion(activeItemId));
      }
    }
  }, [data, activeItemId, dispatch]);

  const handleClick = (contentItem) => {
    dispatch(setDataset(contentItem));
    setActiveItemId(contentItem.id);
    
    // Find the path to this item and update accordion state
    const pathToItem = findIdsPath(data, contentItem.id);
    if (pathToItem && pathToItem.length > 0) {
      // Set the accordion to open the path to this item
      dispatch(setAccordion(contentItem.id));
    }
  };

  // Handle manual accordion expansion/collapse
  // Allow only one manually opened accordion at a time (click again to close)
  const handleAccordionToggle = (accordionId) => {
    setManuallyOpenedAccordions(prev => {
      const newSet = new Set();
      if (!prev.has(accordionId) && accordionId) {
        newSet.add(accordionId);
      }
      return newSet; // either empty (all closed) or containing single id
    });
  };

  // Helper to find all parent accordion IDs that contain search results
  const findSearchResultParents = (items) => {
    const parentIds = new Set();
    
    const traverse = (items) => {
      items.forEach(item => {
        let hasSearchResults = false;
        
        // Check if this item's content has search results
        if (item.content && item.content.length > 0) {
          hasSearchResults = true;
        }
        
        // Check if this item's title matches search
        if (item.display_title?.toLowerCase().includes(normalizedSearch)) {
          hasSearchResults = true;
        }
        
        // Check children recursively
        if (item.children && item.children.length > 0) {
          const childHasResults = traverse(item.children);
          if (childHasResults) {
            hasSearchResults = true;
          }
        }
        
        if (hasSearchResults) {
          parentIds.add(item.id);
        }
        
        return hasSearchResults;
      });
    };
    
    traverse(items);
    return Array.from(parentIds);
  };

  // Calculate activeKeys for accordion expansion
  let activeKeys = [];
  
  if (normalizedSearch && filteredData.length > 0) {
    // When searching, expand all parent accordions that contain search results
    const searchResultParents = findSearchResultParents(filteredData);
    activeKeys = [...searchResultParents, ...manuallyOpenedAccordions];
  } else if (data.length !== 0) {
    // Normal behavior when not searching
    if (openIds !== '') {
      const pathKeys = findIdsPath(data, openIds);
      if (pathKeys && pathKeys.length > 0) {
        pathKeys.shift();
        activeKeys = [...pathKeys.reverse(), ...manuallyOpenedAccordions];
      }
    } else if (activeItemId) {
      const pathKeys = findIdsPath(data, activeItemId);
      if (pathKeys && pathKeys.length > 0) {
        pathKeys.shift();
        activeKeys = [...pathKeys.reverse(), ...manuallyOpenedAccordions];
      }
    } else {
      activeKeys = [...manuallyOpenedAccordions];
    }
  }

  // Auto-expand all levels for first match when searching
  React.useEffect(() => {
    if (normalizedSearch && firstMatchId) {
      // Don't automatically select the first match when searching
      // setActiveItemId(firstMatchId);
    }
  }, [normalizedSearch, firstMatchId]);

  const countItems = (item) => {
    let count = item.content ? item.content.length : 0;
    if (item.children) {
      item.children.forEach(child => {
        count += countItems(child);
      });
    }
    return count;
  };

  const renderContentItems = (contentItems, parentId) => {
    const grouped = {};
    const regularItems = [];

    contentItems.forEach(item => {
      const match = item.name.match(/\[(.*?)\]/);
      if (match) {
        const label = match[1].trim();
        if (!grouped[label]) {
          grouped[label] = [];
        }
        grouped[label].push(item);
      } else {
        regularItems.push(item);
      }
    });
    const stripBracketed = (s = '') =>
  s
    .replace(/\[(?:[^\[\]]*?)\]|\{(?:[^{}]*?)\}/g, '') // remove [...] and {...}
    .replace(/\s{2,}/g, ' ') // collapse extra spaces
    .trim();

    // Helper to highlight matches
    // const highlightStyle = { backgroundColor: '#fff59d' }; // Search highlighting disabled

    return (
      <>
        {/* Render grouped accordions */}
        {Object.entries(grouped).map(([label, items]) => (
          <div key={label} className="sst-accordion-wrapper">
            <Accordion
              activeKey={normalizedSearch ? label : (sstAccordionOpen === label ? label : '')}
              onSelect={() => setSstAccordionOpen(sstAccordionOpen === label ? null : label)}
              flush
              style={{ '--bs-accordion-border-radius': '0', '--bs-accordion-inner-border-radius': '0' }}
            >
              <Accordion.Item 
                eventKey={label}
                style={{ 
                  borderRadius: 0, 
                  padding: 2, 
                  borderRight: '1px solid #ccc', 
                  borderBottom: '1px solid #ccc',
                }}
              >
                <Accordion.Header onClick={(e) => e.currentTarget.blur()} style={{ borderRadius: 0 }}>
                  {label}
                  <span className="badge bg-light text-dark ms-2">{items.length}</span>
                </Accordion.Header>
                <Accordion.Body style={{ paddingLeft: 20, paddingRight: 0, backgroundColor: '#ffffff' }}>
                  {items.map((contentItem, itemIndex) => {
                    const isMatch = normalizedSearch && contentItem.name.toLowerCase().includes(normalizedSearch);
                    return (
                      <div
                        className={`flex-container ${activeItemId === contentItem.id ? 'active' : ''}`}
                        key={`${contentItem.id}-${itemIndex}`}
                        onClick={() => handleClick(contentItem)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: activeItemId === contentItem.id ? '#d3f4ff' : 'transparent', // Search highlighting disabled
                          borderRadius: 0,
                          padding: '2px',
                        }}
                      >
                        <div className="item">{stripBracketed(contentItem.name)}</div>
                        <div className="item">
                          {activeItemId === contentItem.id ? (
                            <IoMdCheckmarkCircleOutline size={22} style={{ cursor: 'pointer', color: 'green' }} />
                          ) : (
                            <IoMdAddCircleOutline size={22} style={{ cursor: 'pointer' }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </div>
        ))}

        {/* Render regular items */}
        {regularItems.map((contentItem, itemIndex) => {
          const isMatch = normalizedSearch && contentItem.name.toLowerCase().includes(normalizedSearch);
          return (
            <div
              className={`flex-container ${activeItemId === contentItem.id ? 'active' : ''}`}
              key={`${contentItem.id}-${itemIndex}`}
              onClick={() => handleClick(contentItem)}
              style={{
                cursor: 'pointer',
                backgroundColor: activeItemId === contentItem.id ? '#d3f4ff' : 'transparent', // Search highlighting disabled
                borderRadius: 0,
                padding: '2px',
                marginTop: '2px'
              }}
            >
              <div className="item">{contentItem.name}</div>
              <div className="item">
                {activeItemId === contentItem.id ? (
                  <IoMdCheckmarkCircleOutline size={22} style={{ cursor: 'pointer', color: 'green' }} />
                ) : (
                  <IoMdAddCircleOutline size={22} style={{ cursor: 'pointer' }} />
                )}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  const renderAccordionItems = (items) => {
    return items.map((item, index) => {
      const sortedContent = item.content 
        ? [...item.content].sort((a, b) => a.name.localeCompare(b.name))
        : [];

      return (
        <Accordion.Item eventKey={item.id} key={`${item.id}-${index}`} style={{ borderRadius: '0 !important', padding: 2, borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc' }}>
          <Accordion.Header onClick={(e) => e.currentTarget.blur()} style={{ borderRadius: 0 }}>
            {item.display_title} 
            <span className="badge bg-light text-dark ms-2">
              {countItems(item)} 
            </span>
          </Accordion.Header>
          <Accordion.Body style={{ paddingLeft: 20, paddingRight: 0, backgroundColor: '#ffffff', borderRadius: 0 }}>
            {renderContentItems(sortedContent, item.id)}
            {item.children && item.children.length > 0 && (
              <Accordion flush activeKey={activeKeys} onSelect={handleAccordionToggle} style={{ '--bs-accordion-border-radius': '0', '--bs-accordion-inner-border-radius': '0' }}>
                {renderAccordionItems(item.children)} 
              </Accordion>
            )}
          </Accordion.Body>
        </Accordion.Item>
      );
    });
  };

  return (
    <>
      {filteredData.length === 0 ? (
        <div style={{padding:120}}>No results found.</div>
      ) : (
        <div className="nested-accordion">
          <Accordion flush activeKey={activeKeys} onSelect={handleAccordionToggle}>
            {renderAccordionItems(filteredData)}
          </Accordion>
        </div>
      )}
    </>
  );
};

export default NestedAccordion;
