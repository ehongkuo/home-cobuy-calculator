// A scenario is every user input: the owners plus the deal and market
// assumptions. It round-trips through the URL hash and JSON export/import.

export const MAX_OWNERS = 5;
export const OWNER_COLORS = ["#818cf8", "#c084fc", "#2dd4bf", "#a3e635", "#fda4af"];

// equity: % of costs, rent income and upfront cash.
// title: % of the deed and loan, which drives tax deductions.
// rent: what they pay into the rent pot while living there (0 = not a resident).
export const DEFAULT_OWNERS = [
  { id: "investor", name: "Investor", equity: 50, title: 0, rent: 0, color: "#2dd4bf" },
  { id: "you", name: "You", equity: 25, title: 50, rent: 3200, color: "#818cf8", isYou: true },
  { id: "coOwner", name: "Co-owner", equity: 25, title: 50, rent: 3000, color: "#c084fc" },
];

export const DEFAULT_INPUTS = {
  owners: DEFAULT_OWNERS,
  tenantRent: 6500,
  includeTaxSavings: true,
  isRental: false,
  selectedYear: 1,
  purchasePrice: 1050000,
  interestRate: 6.5,
  baseHOA: 1500,
  hoaInflation: 4,
  appreciation: 3,
  rentInflation: 3,
  moveOutYear: 5,
  operatingExpenseRate: 0.5,
  downPaymentPercent: 20,
  propertyTaxRate: 1.18,
  takeHome: 6000,
  nonHousingExpenses: 2000,
  stockMarketReturn: 7,
  equivalentRent: 3300,
};

const finite = (value, fallback) => {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function newOwner(owners) {
  const ids = new Set(owners.map((o) => o.id));
  let n = owners.length + 1;
  while (ids.has(`owner${n}`)) n += 1;
  const used = new Set(owners.map((o) => o.color));
  return {
    id: `owner${n}`,
    name: `Owner ${n}`,
    equity: 0,
    title: 0,
    rent: 0,
    color: OWNER_COLORS.find((c) => !used.has(c)) ?? OWNER_COLORS[0],
  };
}

function normalizeOwners(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_OWNERS;
  const owners = [];
  for (const item of raw.slice(0, MAX_OWNERS)) {
    if (!item || typeof item !== "object") continue;
    const base = newOwner(owners);
    const id = typeof item.id === "string" && item.id && !owners.some((o) => o.id === item.id)
      ? item.id.slice(0, 40)
      : base.id;
    owners.push({
      id,
      name: typeof item.name === "string" && item.name.trim() ? item.name.slice(0, 30) : base.name,
      equity: clamp(finite(item.equity, 0), 0, 100),
      title: clamp(finite(item.title, 0), 0, 100),
      rent: clamp(finite(item.rent, 0), 0, 100000),
      color: typeof item.color === "string" && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : base.color,
      ...(item.isYou ? { isYou: true } : {}),
    });
  }
  if (owners.length === 0) return DEFAULT_OWNERS;
  // Exactly one owner is "you": the perspective for taxes and Buy vs Rent.
  const youIndex = Math.max(0, owners.findIndex((o) => o.isYou));
  return owners.map(({ isYou: _ignored, ...o }, i) => (i === youIndex ? { ...o, isYou: true } : o));
}

export function normalizeInputs(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const inputs = { ...DEFAULT_INPUTS, owners: normalizeOwners(source.owners) };
  for (const [key, fallback] of Object.entries(DEFAULT_INPUTS)) {
    if (key === "owners") continue;
    inputs[key] = typeof fallback === "boolean"
      ? (typeof source[key] === "boolean" ? source[key] : fallback)
      : finite(source[key], fallback);
  }
  inputs.selectedYear = clamp(Math.round(inputs.selectedYear), 1, 30);
  return inputs;
}

export function ownerTotals(owners) {
  return owners.reduce(
    (t, o) => ({ equity: t.equity + o.equity, title: t.title + o.title }),
    { equity: 0, title: 0 },
  );
}

// URL-safe base64 of the scenario JSON, used as the #s= hash.
export function encodeInputs(inputs) {
  const bytes = new TextEncoder().encode(JSON.stringify(inputs));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeInputs(encoded) {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return normalizeInputs(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

export function inputsFromHash(hash) {
  const match = /[#&]s=([^&]+)/.exec(hash || "");
  return match ? decodeInputs(match[1]) : null;
}
