import React, { useRef, useState } from "react";
import { Download, Link2, RotateCcw, Upload } from "lucide-react";

// Share link, JSON export/import and reset for the whole scenario.
export default function ScenarioMenu({ inputs, onLoad, onReset }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null);

  const flash = (text) => {
    setStatus(text);
    window.setTimeout(() => setStatus(null), 2000);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash("Link copied");
    } catch {
      flash("Copy the URL from the address bar");
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, ...inputs }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "housing-scenario.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file) => {
    try {
      onLoad(JSON.parse(await file.text()));
      flash("Scenario loaded");
    } catch {
      flash("That file isn't a valid scenario");
    }
  };

  return (
    <div className="scenario-menu" role="group" aria-label="Scenario">
      <button type="button" className="scenario-btn" onClick={copyLink} title="Copy a link to this exact scenario">
        <Link2 size={13} /> Share
      </button>
      <button type="button" className="scenario-btn" onClick={exportJson} title="Download the scenario as JSON">
        <Download size={13} /> Export
      </button>
      <button type="button" className="scenario-btn" onClick={() => fileRef.current?.click()} title="Load a scenario JSON file">
        <Upload size={13} /> Import
      </button>
      <button
        type="button"
        className="scenario-btn"
        onClick={() => window.confirm("Reset every input to the example scenario?") && onReset()}
        title="Reset to the example scenario"
        aria-label="Reset scenario"
      >
        <RotateCcw size={13} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importJson(file);
          e.target.value = "";
        }}
      />
      {status && <span className="scenario-status" role="status">{status}</span>}
    </div>
  );
}
