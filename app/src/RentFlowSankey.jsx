import React, { useEffect, useMemo, useRef, useState } from "react";
import { FLOW_COLORS, formatCurrency } from "./utils";

const HEIGHT = 300;
const TOP = 26;
const BOTTOM = 26;
const NODE_W = 12;
const GAP = [18, 40, 14];
const COMPACT_WIDTH = 520;
// Below this the side labels leave too little room for the flows, so the
// chart goes edge to edge and the values move to a legend underneath.
const LEGEND_WIDTH = 440;

function useWidth(ref) {
  const [width, setWidth] = useState(560);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function layout(flow, width) {
  // Narrow charts stack each side label as name over amount.
  const compact = width < COMPACT_WIDTH;
  const legend = width < LEGEND_WIDTH;
  const labelGap = compact ? 28 : 17;
  const padLeft = legend ? 0 : compact ? 66 : Math.min(130, width * 0.24);
  const padRight = legend ? 0 : compact ? 106 : Math.min(170, width * 0.3);
  const xs = [padLeft, (padLeft + width - padRight - NODE_W) / 2, width - padRight - NODE_W];
  const columns = [0, 1, 2].map((c) => flow.nodes.filter((n) => n.column === c));
  const total = Math.max(1, ...columns.map((col) => col.reduce((s, n) => s + n.value, 0)));
  const inner = HEIGHT - TOP - BOTTOM;
  const scale = Math.min(
    ...columns.map((col, c) => (inner - GAP[c] * Math.max(0, col.length - 1)) / total),
  );

  const nodes = {};
  columns.forEach((col, c) => {
    const used = col.reduce((s, n) => s + n.value * scale, 0) + GAP[c] * Math.max(0, col.length - 1);
    let y = TOP + (inner - used) / 2;
    for (const n of col) {
      const h = Math.max(2, n.value * scale);
      nodes[n.id] = { ...n, x: xs[c], y, h, outY: y, inY: y };
      y += n.value * scale + GAP[c];
    }
  });

  const links = flow.links.map((l, i) => {
    const s = nodes[l.source];
    const t = nodes[l.target];
    const h = l.value * scale;
    const link = { ...l, id: i, h, x1: s.x + NODE_W, y1: s.outY, x2: t.x, y2: t.inY };
    s.outY += h;
    t.inY += h;
    return link;
  });

  // Side labels sit beside their nodes; nudge apart any that would collide.
  const spread = (col) => {
    const placed = col.map((n) => ({ id: n.id, y: nodes[n.id].y + nodes[n.id].h / 2 }));
    for (let i = 1; i < placed.length; i += 1)
      placed[i].y = Math.max(placed[i].y, placed[i - 1].y + labelGap);
    const overflow = placed.length ? placed.at(-1).y - (HEIGHT - 6) : 0;
    if (overflow > 0) placed.forEach((p) => (p.y -= overflow));
    for (const p of placed) nodes[p.id].labelY = p.y;
  };
  spread(columns[0]);
  spread(columns[2]);

  return { nodes: Object.values(nodes), links, compact, legend };
}

const ribbon = ({ x1, y1, x2, y2, h }) => {
  const mid = (x2 - x1) * 0.5;
  return `M${x1},${y1} C${x1 + mid},${y1} ${x2 - mid},${y2} ${x2},${y2} L${x2},${y2 + h} C${x2 - mid},${y2 + h} ${x1 + mid},${y1 + h} ${x1},${y1 + h} Z`;
};

export default function RentFlowSankey({ flow }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);
  const [hover, setHover] = useState(null);
  const [tip, setTip] = useState(null);
  const { nodes, links, compact, legend } = useMemo(() => layout(flow, width), [flow, width]);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const isActive = (link) =>
    !hover ||
    (hover.type === "link" ? hover.id === link.id : link.source === hover.id || link.target === hover.id);

  const track = (e, lines) => {
    const box = wrapRef.current.getBoundingClientRect();
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, lines });
  };
  const clear = () => {
    setHover(null);
    setTip(null);
  };

  const nodeLines = (n) => {
    const ins = links.filter((l) => l.target === n.id);
    const outs = links.filter((l) => l.source === n.id);
    const parts = (n.column === 0 ? outs : ins).map((l) => {
      const other = byId[n.column === 0 ? l.target : l.source];
      return `${n.column === 0 ? "→" : "←"} ${other.label}: ${formatCurrency(l.value)}`;
    });
    return [`${n.label}: ${formatCurrency(n.value)}/mo`, ...(parts.length > 1 ? parts : [])];
  };

  return (
    <>
      <div className="sankey-wrap" ref={wrapRef} onMouseLeave={clear}>
        <svg
          className={compact ? "is-compact" : undefined}
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`Monthly rent flow: ${flow.links
            .map((l) => `${byId[l.source]?.label} to ${byId[l.target]?.label} ${formatCurrency(l.value)}`)
            .join("; ")}`}
        >
          <defs>
            {links.map((l) => (
              <linearGradient key={l.id} id={`flow-grad-${l.id}`} gradientUnits="userSpaceOnUse" x1={l.x1} x2={l.x2} y1="0" y2="0">
                <stop offset="0%" stopColor={FLOW_COLORS[byId[l.source].kind]} />
                <stop offset="100%" stopColor={FLOW_COLORS[byId[l.target].kind]} />
              </linearGradient>
            ))}
          </defs>

          {links.map((l) => (
            <path
              key={l.id}
              className={`sankey-ribbon${isActive(l) ? "" : " is-dim"}${hover && isActive(l) ? " is-hot" : ""}`}
              d={ribbon(l)}
              fill={`url(#flow-grad-${l.id})`}
              onMouseEnter={() => setHover({ type: "link", id: l.id })}
              onMouseMove={(e) =>
                track(e, [`${byId[l.source].label} → ${byId[l.target].label}`, `${formatCurrency(l.value)}/mo`])
              }
              onMouseLeave={clear}
            />
          ))}

          {nodes.map((n) => {
            const color = FLOW_COLORS[n.kind];
            const dim = hover && hover.type === "node" && hover.id !== n.id &&
              !links.some((l) => isActive(l) && (l.source === n.id || l.target === n.id));
            return (
              <g
                key={n.id}
                className={`sankey-node${dim ? " is-dim" : ""}`}
                onMouseEnter={() => setHover({ type: "node", id: n.id })}
                onMouseMove={(e) => track(e, nodeLines(n))}
                onMouseLeave={clear}
              >
                <rect x={n.x} y={n.y} width={NODE_W} height={n.h} rx={3} fill={color} />
                {legend && n.column !== 1 ? null : n.column === 1 ? (
                  <text x={n.x + NODE_W / 2} y={n.id === "pot" ? n.y - 8 : n.y + n.h + 18} textAnchor="middle" className="sankey-text">
                    <tspan className="sankey-name">{n.label}</tspan>
                    <tspan className="sankey-amount" dx="6">{formatCurrency(n.value)}</tspan>
                  </text>
                ) : (
                  <text
                    x={n.column === 0 ? n.x - 8 : n.x + NODE_W + 8}
                    y={n.labelY}
                    dy={compact ? "-0.2em" : "0.35em"}
                    textAnchor={n.column === 0 ? "end" : "start"}
                    className="sankey-text"
                  >
                    <tspan className="sankey-name">{n.label}</tspan>
                    <tspan
                      className="sankey-amount"
                      {...(compact
                        ? { x: n.column === 0 ? n.x - 8 : n.x + NODE_W + 8, dy: "1.15em" }
                        : { dx: 6 })}
                    >
                      {formatCurrency(n.value)}
                    </tspan>
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {tip && (
          <div
            className="sankey-tip"
            style={{ left: Math.min(tip.x + 14, width - 190), top: tip.y + 14 }}
          >
            {tip.lines.map((line, i) => (
              <div key={i} className={i === 0 ? "sankey-tip-head" : undefined}>{line}</div>
            ))}
          </div>
        )}
      </div>
      {legend && (
        <div className="sankey-legend">
          {[0, 2].map((column) => (
            <ul key={column} aria-label={column === 0 ? "Money in" : "Money out"}>
              {nodes
                .filter((n) => n.column === column)
                .map((n) => (
                  <li key={n.id}>
                    <span className="sankey-swatch" style={{ background: FLOW_COLORS[n.kind] }} />
                    <span className="sankey-legend-name">{n.label}</span>
                    <span className="sankey-legend-amount">{formatCurrency(n.value)}</span>
                  </li>
                ))}
            </ul>
          ))}
        </div>
      )}
    </>
  );
}
