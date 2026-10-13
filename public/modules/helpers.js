export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function normalizeKey(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatMoney(value) {
  const amount = toNumber(value, 0);
  const hasDecimals = amount % 1 !== 0;

  return `RD$${amount.toLocaleString("es-DO", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0
  })}`;
}

export function calculateListPrice(price, discount) {
  const safePrice = toNumber(price, 0);
  const safeDiscount = toNumber(discount, 0);

  if (safeDiscount <= 0 || safeDiscount >= 100) {
    return safePrice;
  }

  return Math.round(safePrice / (1 - safeDiscount / 100));
}
