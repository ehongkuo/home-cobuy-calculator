import React, { useEffect, useMemo, useRef, useState } from "react";

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5;
const SETTLE_MS = 120;

// Only one wheel is open at a time: opening one tells the rest to close.
const openListeners = new Set();
function useWheelOpen(id) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onOpen = (openedId) => openedId !== id && setOpen(false);
    openListeners.add(onOpen);
    return () => openListeners.delete(onOpen);
  }, [id]);
  const toggle = () =>
    setOpen((was) => {
      if (!was) openListeners.forEach((fn) => fn(id));
      return !was;
    });
  return [open, toggle];
}

// Every step from min to max, rounded so 0.1 steps don't drift (0.30000000000000004).
function stepValues(min, max, step) {
  const decimals = (String(step).split(".")[1] ?? "").length;
  const count = Math.round((max - min) / step) + 1;
  return Array.from({ length: count }, (_, i) => Number((min + i * step).toFixed(decimals)));
}

const nearestIndex = (values, value) => {
  let best = 0;
  values.forEach((v, i) => {
    if (Math.abs(v - value) < Math.abs(values[best] - value)) best = i;
  });
  return best;
};

// An iOS-style scroll wheel. Commits the centered value once scrolling settles.
export function WheelPicker({ values, value, onChange, format, label, onPreview }) {
  const listRef = useRef(null);
  const settleTimer = useRef(null);
  const frame = useRef(null);
  const index = useMemo(() => nearestIndex(values, value), [values, value]);

  // Fade and tilt each row by its distance from the center band.
  const paint = () => {
    const list = listRef.current;
    if (!list) return;
    const center = list.scrollTop / ITEM_HEIGHT;
    for (const el of list.children) {
      const offset = Number(el.dataset.index) - center;
      const distance = Math.min(Math.abs(offset), 3);
      el.style.opacity = String(1 - distance * 0.28);
      el.style.transform = `rotateX(${Math.max(-60, Math.min(60, -offset * 20))}deg)`;
    }
    onPreview?.(values[Math.max(0, Math.min(values.length - 1, Math.round(center)))]);
  };

  // Snap to the current value on open and whenever it changes from outside.
  useEffect(() => {
    const list = listRef.current;
    if (!list || settleTimer.current) return;
    list.scrollTop = index * ITEM_HEIGHT;
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(
    () => () => {
      clearTimeout(settleTimer.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(paint);
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      const list = listRef.current;
      if (!list) return;
      const settled = Math.max(0, Math.min(values.length - 1, Math.round(list.scrollTop / ITEM_HEIGHT)));
      if (values[settled] !== value) onChange(values[settled]);
    }, SETTLE_MS);
  };

  const scrollToIndex = (i) => {
    const clamped = Math.max(0, Math.min(values.length - 1, i));
    listRef.current?.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
  };

  const onKeyDown = (e) => {
    const moves = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 };
    if (e.key in moves) scrollToIndex(index + moves[e.key]);
    else if (e.key === "Home") scrollToIndex(0);
    else if (e.key === "End") scrollToIndex(values.length - 1);
    else return;
    e.preventDefault();
  };

  const pad = ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;

  return (
    <div className="wheel" style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}>
      <div className="wheel-band" style={{ top: pad, height: ITEM_HEIGHT }} aria-hidden="true" />
      <div
        ref={listRef}
        className="wheel-list"
        style={{ paddingBlock: pad }}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-valuemin={values[0]}
        aria-valuemax={values[values.length - 1]}
        aria-valuenow={value}
        aria-valuetext={format(value)}
      >
        {values.map((v, i) => (
          <div
            key={v}
            data-index={i}
            className="wheel-item"
            style={{ height: ITEM_HEIGHT }}
            onClick={() => scrollToIndex(i)}
            aria-hidden="true"
          >
            {format(v)}
          </div>
        ))}
      </div>
    </div>
  );
}

// A compact row (label + value) that expands a wheel underneath when tapped.
export function WheelField({ id, icon: Icon, label, hint, value, setValue, min, max, step, format, className = "" }) {
  const values = useMemo(() => stepValues(min, max, step), [min, max, step]);
  const [open, toggle] = useWheelOpen(id);
  const [preview, setPreview] = useState(null);
  const shown = open && preview !== null ? preview : value;

  useEffect(() => {
    if (!open) setPreview(null);
  }, [open]);

  return (
    <div className={`wheel-field ${open ? "is-open" : ""} ${className}`}>
      <button type="button" className="wheel-field-row" onClick={toggle} aria-expanded={open}>
        <span className="wheel-field-label">
          {Icon && <Icon size={14} />}
          <span>{label}</span>
          {hint && <small>{hint}</small>}
        </span>
        <span className="wheel-field-value">{format(shown)}</span>
      </button>
      {open && (
        <WheelPicker
          values={values}
          value={value}
          onChange={setValue}
          onPreview={setPreview}
          format={format}
          label={label}
        />
      )}
    </div>
  );
}
