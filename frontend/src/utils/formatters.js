export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'N/A';
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
};

export const formatPercent = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(0)}%`;
};
