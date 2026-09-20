export function convertCurrency(
  amount: string,
  rate: string,
  from: "KRW" | "MNT",
): number | null {
  if (!amount.trim() || !rate.trim()) return null;
  const value = Number(amount),
    exchange = Number(rate);
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isFinite(exchange) ||
    exchange <= 0
  )
    return null;
  const result = from === "KRW" ? value * exchange : value / exchange;
  return Number.isFinite(result) ? result : null;
}
