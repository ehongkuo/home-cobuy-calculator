import React, { useEffect, useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { MAX_OWNERS, newOwner, ownerTotals } from "./scenario";

// Numeric cell that keeps the typed text while focused, so clearing the
// field to retype doesn't snap it back to 0.
function NumberField({ value, onChange, min = 0, max, label, prefix, suffix, area }) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  return (
    <label className={`owner-number owner-${area}`}>
      <span className="owner-cell-label">{label}</span>
      <span className="owner-number-box">
        {prefix && <span>{prefix}</span>}
        <input
          type="text"
          inputMode="decimal"
          value={focused ? draft : Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}
          onFocus={(e) => {
            setFocused(true);
            setDraft(String(value));
            requestAnimationFrame(() => e.target.select());
          }}
          onChange={(e) => {
            const text = e.target.value.replace(/[^0-9.]/g, "");
            setDraft(text);
            const n = parseFloat(text);
            onChange(Number.isFinite(n) ? Math.min(max ?? Infinity, Math.max(min, n)) : 0);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-label={label}
        />
        {suffix && <span>{suffix}</span>}
      </span>
    </label>
  );
}

const TotalCell = ({ value, label }) => {
  const off = Math.abs(value - 100) > 0.01;
  return (
    <span className={`owners-total${off ? " is-off" : ""}`} title={off ? `${label} should add up to 100%` : undefined}>
      {Number(value.toFixed(2))}%
    </span>
  );
};

// Rent a new resident starts at; adjust it with the slider in the Rent panel.
const DEFAULT_RESIDENT_RENT = 3000;

const pct = (n) => `${Number(n.toFixed(2))}%`;

// A setup step: edit the owners once, then it folds down to a one-line summary.
export default function OwnersPanel({ owners, setOwners }) {
  const totals = ownerTotals(owners);
  const update = (id, patch) =>
    setOwners((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const setYou = (id) =>
    setOwners((list) => list.map(({ isYou: _was, ...o }) => (o.id === id ? { ...o, isYou: true } : o)));
  const remove = (id) =>
    setOwners((list) => {
      const next = list.filter((o) => o.id !== id);
      return next.some((o) => o.isYou) ? next : next.map((o, i) => (i === 0 ? { ...o, isYou: true } : o));
    });

  const problems = [
    Math.abs(totals.equity - 100) > 0.01 && `Equity adds up to ${Number(totals.equity.toFixed(2))}%, not 100%.`,
    Math.abs(totals.title - 100) > 0.01 && `Title adds up to ${Number(totals.title.toFixed(2))}%, not 100%.`,
  ].filter(Boolean);

  // Start open only if the split needs fixing.
  const [editing, setEditing] = useState(problems.length > 0);
  const residents = owners.filter((o) => o.rent > 0).length;

  if (!editing) {
    return (
      <section className="assumption-panel owners-panel owners-summary" aria-label="Owners">
        <div className="owners-summary-main">
          <h3>Owners</h3>
          <ul className="owners-chips">
            {owners.map((o) => (
              <li key={o.id} className={o.isYou ? "is-you" : undefined} title={`${o.name}: ${pct(o.equity)} equity, ${pct(o.title)} title${o.rent > 0 ? ", lives there" : ""}`}>
                <span className="owner-swatch" style={{ background: o.color }} />
                {o.name}
                <strong>{pct(o.equity)}</strong>
              </li>
            ))}
          </ul>
          {problems.length > 0 && (
            <span className="owners-warning" role="status">{problems.join(" ")}</span>
          )}
        </div>
        <button type="button" className="owners-edit" onClick={() => setEditing(true)} aria-label="Edit owners">
          <Pencil size={14} /> Edit
        </button>
      </section>
    );
  }

  return (
    <section className="assumption-panel owners-panel" aria-label="Owners">
      <div className="assumption-panel-head">
        <h3>Owners</h3>
        <span>
          Equity splits costs, rent income and cash to close. Title share drives tax deductions.
          Residents pay rent into the pot while living there; set their rent in the Rent panel below.
        </span>
      </div>

      <div className="owners-table">
        <div className="owners-row owners-head" aria-hidden="true">
          <span />
          <span>Name</span>
          <span>Equity</span>
          <span>Title</span>
          <span>Lives there</span>
          <span>You</span>
          <span />
        </div>

        {owners.map((o) => (
          <div key={o.id} className={`owners-row${o.isYou ? " is-you" : ""}`}>
            <span className="owner-swatch" style={{ background: o.color }} />
            <label className="owner-name">
              <span className="owner-cell-label">Name</span>
              <input
                type="text"
                value={o.name}
                maxLength={30}
                onChange={(e) => update(o.id, { name: e.target.value })}
                onBlur={(e) => !e.target.value.trim() && update(o.id, { name: "Owner" })}
                aria-label="Owner name"
              />
            </label>
            <NumberField area="equity" label="Equity %" suffix="%" max={100} value={o.equity} onChange={(equity) => update(o.id, { equity })} />
            <NumberField area="title" label="Title %" suffix="%" max={100} value={o.title} onChange={(title) => update(o.id, { title })} />
            <label className="owner-resident">
              <span className="owner-cell-label">Lives there</span>
              <input
                type="checkbox"
                checked={o.rent > 0}
                onChange={(e) => update(o.id, { rent: e.target.checked ? DEFAULT_RESIDENT_RENT : 0 })}
              />
            </label>
            <label className="owner-you" title="Show taxes, Buy vs Rent and the top-bar net from this owner's point of view">
              <span className="owner-cell-label">This is me</span>
              <input type="radio" name="owner-you" checked={!!o.isYou} onChange={() => setYou(o.id)} />
            </label>
            <button
              type="button"
              className="owner-remove"
              onClick={() => remove(o.id)}
              disabled={owners.length <= 1}
              aria-label={`Remove ${o.name}`}
              title="Remove owner"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        <div className="owners-row owners-foot">
          <span />
          <span>Total</span>
          <TotalCell value={totals.equity} label="Equity" />
          <TotalCell value={totals.title} label="Title" />
          <span className="owners-total">{residents} of {owners.length}</span>
          <span />
          <span />
        </div>
      </div>

      <div className="owners-actions">
        <button
          type="button"
          className="owners-add"
          onClick={() => setOwners((list) => [...list, newOwner(list)])}
          disabled={owners.length >= MAX_OWNERS}
        >
          <Plus size={14} /> Add owner
        </button>
        <button type="button" className="owners-done" onClick={() => setEditing(false)}>
          <Check size={14} /> Done
        </button>
        {problems.length > 0 && (
          <span className="owners-warning" role="status">{problems.join(" ")}</span>
        )}
      </div>
    </section>
  );
}
