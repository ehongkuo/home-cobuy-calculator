export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

// Sankey colors for non-owner nodes; owners carry their own color.
export const FLOW_COLORS = {
  tenant: "#38bdf8",
  pot: "#6366f1",
  topUp: "#f472b6",
  interest: "#f87171",
  propertyTax: "#fb923c",
  hoa: "#fbbf24",
  opex: "#94a3b8",
  principal: "#34d399",
};
