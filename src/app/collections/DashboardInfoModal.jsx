import React from 'react';
import { Modal, Button } from 'react-bootstrap';

export default function DashboardInfoModal({ show, onHide, card }) {
  if (!card) return null;
  
  // Inline styles for the modal
  const styles = `
    .dashboard-modal .btn-close {
      filter: invert(1) grayscale(100%) brightness(200%);
    }
    .modal-backdrop.show {
      opacity: 0 !important;
    }
    .modal {
      --bs-modal-zindex: 1055;
      --bs-modal-width: 500px;
      --bs-modal-padding: 1rem;
      --bs-modal-margin: 0.5rem;
      --bs-modal-bg: #fff;
      --bs-modal-border-color: var(--bs-border-color-translucent);
      --bs-modal-border-width: 1px;
      --bs-modal-border-radius: 0.5rem;
      --bs-modal-box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
      --bs-modal-inner-border-radius: calc(0.5rem - 1px);
      --bs-modal-header-padding-x: 1rem;
      --bs-modal-header-padding-y: 1rem;
      --bs-modal-header-padding: 1rem 1rem;
      --bs-modal-header-border-color: var(--bs-border-color);
      --bs-modal-header-border-width: 1px;
      --bs-modal-title-line-height: 1.5;
      --bs-modal-footer-gap: 0.5rem;
      --bs-modal-footer-bg: ;
      --bs-modal-footer-border-color: var(--bs-border-color);
      --bs-modal-footer-border-width: 1px;
    }
  `;
  
  return (
    <>
      <style>{styles}</style>
      <Modal
        show={show}
        onHide={onHide}
        size="lg"
        className="dashboard-modal"
        style={{ borderRadius: '0' }}
        contentClassName="rounded-0"
      >
        <Modal.Header 
          closeButton 
          style={{ 
            backgroundColor: '#3F51B5', 
            color: 'white',
            border: 'none',
            borderRadius: '0'
          }}
        >
          <Modal.Title style={{ color: 'white' }}>
            {card.display_title || card.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <tbody>
               <tr>
                <td style={{ fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid #eee', width: '40%' }}>Title</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>{card.title}</td>
              </tr>
               <tr>
                <td style={{ fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid #eee' }}>Description</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>{card.description}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid #eee' }}>Project Code</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>{card.project?.project_code}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid #eee' }}>Project Name</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>{card.project?.project_name}</td>
              </tr>
              
              <tr>
                <td style={{ fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid #eee' }}>Available to</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>{card.country?.long_name || card.country?.short_name}</td>
              </tr>
              
              <tr>
                <td style={{ fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid #eee' }}>Maintainer</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>{card.maintainer}</td>
              </tr>
            </tbody>
          </table>
        </Modal.Body>
        <Modal.Footer style={{ border: 'none', borderRadius: '0' }}>
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}