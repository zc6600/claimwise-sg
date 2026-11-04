export function formatCurrency(value) {
  const num = Math.round(Number(value) || 0);
  const formatted = new Intl.NumberFormat("en-SG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(num));
  return num < 0 ? `-S$${formatted}` : `S$${formatted}`;
}

export function formatPercent(value) {
  return `${Number(value).toFixed(0)}%`;
}
