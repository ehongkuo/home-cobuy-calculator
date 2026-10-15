export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

// Sankey colors, shared by the rent flow chart and its summary legend.
export const FLOW_COLORS = {
  user: "#818cf8",
  coOwner: "#c084fc",
  investor: "#2dd4bf",
  tenant: "#38bdf8",
  pot: "#6366f1",
  topUp: "#f472b6",
  interest: "#f87171",
  propertyTax: "#fb923c",
  hoa: "#fbbf24",
  opex: "#94a3b8",
  principal: "#34d399",
};
