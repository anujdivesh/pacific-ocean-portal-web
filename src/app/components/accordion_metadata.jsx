import Accordion from 'react-bootstrap/Accordion';
import React from 'react';
import SmallMap from './small_map';
import { useAppSelector, useAppDispatch } from '@/app/GlobalRedux/hooks';
import { hideModal } from '@/app/GlobalRedux/Features/modal/modalSlice';

function AccordionMetadata() {
    const dataset_list = useAppSelector(state => state.dataset_list.value);
    const dispatch = useAppDispatch();

    if (dataset_list.length === 0) {
        return (
            <div className="text-center" style={{marginTop:0, paddingTop:0}}>
                <div>
                    <SmallMap currentDataset={dataset_list} />
                </div>
                <div className="mt-2 mb-2">
                    Select a dataset to see a preview
                </div>
                <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill w-10" 
                style={{padding:'8px', marginLeft:'5px'}} onClick={()=>{ dispatch(hideModal())}}>
                    &nbsp;Go to the Map&nbsp;
                    </button>
            </div>
        );
    }

    const stripBracketed = (s = '') =>
  s
    .replace(/\[(?:[^\[\]]*?)\]|\{(?:[^{}]*?)\}/g, '') // remove [...] and {...}
    .replace(/\s{2,}/g, ' ') // collapse extra spaces
    .trim();

    return (
        <div style={{ margin: 0, padding: 0 }}>
            <div style={{ margin: 0, padding: 0 }}>
                <SmallMap currentDataset={dataset_list} />
            </div>
            <div className="mt-3" style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: 0 }}>
                <div className="fw-bold mb-2 mr-2" style={{marginLeft: '10px', fontSize:18}}>{stripBracketed(dataset_list.name)}</div>
                <div className="mb-3  mr-2" style={{marginLeft: '10px',fontSize:14}}>{dataset_list.copyright}</div>
                {dataset_list.metadata_one_id !== "" && (
                    <Accordion className="mb-1" defaultActiveKey="1" style={{ borderRadius: 0 }}>
                        <Accordion.Item eventKey="1" style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                            <Accordion.Header style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>{dataset_list.metadata_one_id}</Accordion.Header>
                            <Accordion.Body style={{fontSize:15, borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                                {dataset_list.metadata_one_value}
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                )}
                {dataset_list.metadata_two_id !== "" && (
                    <Accordion className="mb-1" defaultActiveKey="2" style={{ borderRadius: 0,marginTop:-10 }}>
                        <Accordion.Item eventKey="2" style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                            <Accordion.Header style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>{dataset_list.metadata_two_id}</Accordion.Header>
                            <Accordion.Body style={{fontSize:15, borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                                {dataset_list.metadata_two_value}
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                )}
                {dataset_list.metadata_three_id !== "" && (
                    <Accordion className="mb-1" defaultActiveKey="3" style={{ borderRadius: 0,marginTop:-10 }}>
                        <Accordion.Item eventKey="3" style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                            <Accordion.Header style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>{dataset_list.metadata_three_id}</Accordion.Header>
                            <Accordion.Body style={{fontSize:15, borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                                {dataset_list.metadata_three_value}
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                )}
                {dataset_list.metadata_four_id !== "" && (
                    <Accordion className="mb-1" defaultActiveKey="4" style={{ borderRadius: 0,marginTop:-10 }}>
                        <Accordion.Item eventKey="4" style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                            <Accordion.Header style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>{dataset_list.metadata_four_id}</Accordion.Header>
                            <Accordion.Body style={{fontSize:15, borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                                {dataset_list.metadata_four_value}
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                )}
                {dataset_list.metadata_five_id !== "" && (
                    <Accordion className="mb-1" defaultActiveKey="5" style={{ borderRadius: 0,marginTop:-10 }}>
                        <Accordion.Item eventKey="5" style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                            <Accordion.Header style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>{dataset_list.metadata_five_id}</Accordion.Header>
                            <Accordion.Body style={{fontSize:15, borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                                {dataset_list.metadata_five_value}
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                )}
                 {dataset_list.metadata_six_id !== "" && (
                    <Accordion className="mb-1" defaultActiveKey="6" style={{ borderRadius: 0,marginTop:-10 }}>
                        <Accordion.Item eventKey="6" style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                            <Accordion.Header style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>{dataset_list.metadata_six_id}</Accordion.Header>
                            <Accordion.Body style={{fontSize:15, borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                                  <ul style={{ marginBottom: 0 }}>
                                    {dataset_list.metadata_six_value.split("/").map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                    </ul>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                )}
                {dataset_list.metadata_seven_id !== "" && (
                    <Accordion className="mb-1" defaultActiveKey="7" style={{ borderRadius: 0,marginTop:-10 }}>
                        <Accordion.Item eventKey="7" style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                            <Accordion.Header style={{ borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>{dataset_list.metadata_seven_id}</Accordion.Header>
                            <Accordion.Body style={{fontSize:15, borderRadius: 0, border: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                                {dataset_list.metadata_seven_value}
                                
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                )}
               
            </div>
        </div>
    );
}

export default AccordionMetadata;