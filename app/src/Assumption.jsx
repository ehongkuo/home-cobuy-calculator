import React, { useEffect, useId, useRef, useState } from "react";

const formatters = {
  currency: (v) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(v),
  percentage: (v) => `${v}%`,
  years: (v) => `Year ${v}`,
};

const suffixes = { "currency/mo": "/mo", percentage: "%", years: "" };

const formatValue = (value, format) => {
  const base = format.startsWith("currency") ? "currency" : format;
  const text = (formatters[base] ?? String)(value);
  return format === "currency/mo" ? `${text}/mo` : text;
};

// A labeled slider that is always fully visible, with a typed-in value field.
export function AssumptionSlider({
  icon: Icon,
  label,
  hint,
  value,
  setValue,
  min,
  max,
  step,
  format = "currency",
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => setDraft(String(value)), [value]);

  const shown = focused
    ? draft
    : Number(value).toLocaleString("en-US", { maximumFractionDigits: 3 });

  const commit = (text) => {
    const parsed = parseFloat(text);
    setFocused(false);
    if (cancelled.current || Number.isNaN(parsed)) {
      cancelled.current = false;
      setDraft(String(value));
      return;
    }
    setValue(Math.min(max, Math.max(min, parsed)));
  };

  const fill = ((value - min) / (max - min)) * 100;
  const prefix = format.startsWith("currency") ? "$" : format === "years" ? "Yr" : "";
  const suffix = suffixes[format] ?? "";

  return (
    <div className="assumption">
      <div className="assumption-head">
        <label htmlFor={id} className="assumption-label" title={hint}>
          {Icon && <Icon size={14} />}
          {label}
        </label>
        <div className="assumption-input">
          {prefix && <span>{prefix}</span>}
          <input
            type="text"
            inputMode="decimal"
            value={shown}
            onFocus={(e) => {
              setFocused(true);
              requestAnimationFrame(() => e.target.select());
            }}
            style={{ width: `${Math.max(2, shown.length) + 0.5}ch` }}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9.-]/g, ""))}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                cancelled.current = true;
                e.currentTarget.blur();
              }
            }}
            aria-label={`${label} value`}
          />
          {suffix && <span>{suffix}</span>}
        </div>
      </div>
      <input
        id={id}
        type="range"
        className="assumption-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ "--fill": `${fill}%` }}
        aria-valuetext={formatValue(value, format)}
      />
    </div>
  );
}

export function AssumptionPanel({ title, note, children }) {
  return (
    <section className="assumption-panel" aria-label={title}>
      <div className="assumption-panel-head">
        <h3>{title}</h3>
        {note && <span>{note}</span>}
      </div>
      <div className="assumption-grid">{children}</div>
    </section>
  );
}
