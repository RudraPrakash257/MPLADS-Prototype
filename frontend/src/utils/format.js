export const formatINR = (val) => {
  if (val === undefined || val === null) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
};

export const formatINRShort = (val) => {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  return formatINR(val);
};

export const getBandColor = (band) => {
  switch (band) {
    case "CRITICAL": return "#ef4444";
    case "HIGH": return "#f97316";
    case "MEDIUM": return "#eab308";
    case "LOW": return "#10b981";
    default: return "#94a3b8";
  }
};
