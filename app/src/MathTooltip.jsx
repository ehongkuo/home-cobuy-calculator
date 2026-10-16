import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const MARGIN = 12;

// Shows the math behind a number. Mouse: hover. Touch: tap to toggle, tap
// elsewhere or scroll to close. Keyboard: focus.
const MathTooltip = ({ children, ledger }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const spanRef = useRef(null);
  const tipRef = useRef(null);
  const pointerDown = useRef(false);

  // Place above the number (below if there's no room), kept inside the screen.
  useLayoutEffect(() => {
    if (!open || !spanRef.current || !tipRef.current) return;
    const anchor = spanRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    const maxLeft = window.innerWidth - tip.width - MARGIN;
    const left = Math.max(MARGIN, Math.min(anchor.left + anchor.width / 2 - tip.width / 2, maxLeft));
    const above = anchor.top - tip.height - 8;
    setPos({ left, top: above >= MARGIN ? above : anchor.bottom + 8 });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const onPointerDown = (e) => {
      if (!spanRef.current?.contains(e.target)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setPos(null);
  }, [open]);

  return (
    <>
      <span
        ref={spanRef}
        tabIndex={ledger ? 0 : undefined}
        role={ledger ? 'button' : undefined}
        aria-expanded={ledger ? open : undefined}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
        onPointerDown={(e) => {
          pointerDown.current = e.pointerType !== 'mouse';
        }}
        onClick={() => {
          if (pointerDown.current) setOpen((o) => !o);
          pointerDown.current = false;
        }}
        onFocus={() => !pointerDown.current && setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        style={{
          textDecoration: 'underline dotted rgba(255,255,255,0.4)',
          textUnderlineOffset: '3px',
          cursor: 'help',
          padding: '10px 0', // taller tap target without changing line height
        }}
      >
        {children}
      </span>
      {open && ledger && createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: pos ? pos.top : 0,
            left: pos ? pos.left : 0,
            visibility: pos ? 'visible' : 'hidden',
            maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
            overflowX: 'auto',
            background: '#1e293b',
            color: '#f8fafc',
            padding: '12px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8)',
            whiteSpace: 'pre',
            fontFamily: 'monospace',
            fontSize: 'clamp(0.7rem, 2.6vw, 0.85rem)',
            zIndex: 999999,
            border: '1px solid rgba(255,255,255,0.2)',
            pointerEvents: 'none',
            textAlign: 'left',
          }}
        >
          {ledger}
        </div>,
        document.body
      )}
    </>
  );
};

export default MathTooltip;
