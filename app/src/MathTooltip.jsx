import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const MathTooltip = ({ children, ledger }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const spanRef = useRef(null);

  useEffect(() => {
    if (isHovered && spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      setCoords({
        left: rect.left + rect.width / 2,
        top: rect.top + window.scrollY,
      });
    }
  }, [isHovered]);

  return (
    <>
      <span 
        ref={spanRef}
        tabIndex={ledger ? 0 : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        style={{ borderBottom: '1px dotted rgba(255,255,255,0.4)', cursor: 'help' }}
      >
        {children}
      </span>
      {isHovered && ledger && createPortal(
        <div style={{
          position: 'absolute',
          top: coords.top - 8,
          left: coords.left,
          transform: 'translate(-50%, -100%)',
          background: '#1e293b',
          color: '#f8fafc',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8)',
          whiteSpace: 'pre',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          zIndex: 999999,
          border: '1px solid rgba(255,255,255,0.2)',
          pointerEvents: 'none',
          minWidth: 'max-content',
          textAlign: 'left'
        }}>
          {ledger}
        </div>,
        document.body
      )}
    </>
  );
};

export default MathTooltip;
