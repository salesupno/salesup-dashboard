// Period selection shared by the dashboard shell, the tabs and the API routes.
// A period is either a trailing window ("last 3 months") or one specific month
// ("August 2026"). Everything downstream works on the resulting month keys.

export type Period =
  | { kind: "last"; months: number }
  | { kind: "month"; key: string }

export const LAST_OPTIONS = [1, 3, 6, 12]

export const DEFAULT_PERIOD: Period = { kind: "last", months: 3 }

const MONTHS_NO_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"]
const MONTHS_NO_LONG = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
]

const isMonthKey = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v)

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`

export const monthKeyFromDate = (isoDate: string) => {
  // Tripletex sends "YYYY-MM-DD"; Google sends full ISO timestamps.
  if (/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return isoDate.slice(0, 7)
  return monthKey(new Date(isoDate))
}

const monthIndex = (key: string) => parseInt(key.slice(5, 7), 10) - 1

export const monthShortLabel = (key: string) => MONTHS_NO_SHORT[monthIndex(key)] ?? key
export const monthLongLabel = (key: string) => `${MONTHS_NO_LONG[monthIndex(key)] ?? key} ${key.slice(0, 4)}`

// The n month keys ending at (and including) `end`, oldest first.
export const monthKeysEndingAt = (end: string, n: number) => {
  const year = parseInt(end.slice(0, 4), 10)
  const month = monthIndex(end)
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) keys.push(monthKey(new Date(year, month - i, 1)))
  return keys
}

export const monthKeysBack = (n: number, from = new Date()) => monthKeysEndingAt(monthKey(from), n)

export const serializePeriod = (p: Period) => (p.kind === "last" ? `last:${p.months}` : `month:${p.key}`)

export const parsePeriod = (raw: string | null | undefined): Period => {
  if (!raw) return DEFAULT_PERIOD
  if (raw.startsWith("month:")) {
    const key = raw.slice("month:".length)
    return isMonthKey(key) ? { kind: "month", key } : DEFAULT_PERIOD
  }
  const months = parseInt(raw.replace("last:", ""), 10)
  return LAST_OPTIONS.includes(months) ? { kind: "last", months } : DEFAULT_PERIOD
}

// Months covered by the period, oldest first.
export const periodMonthKeys = (p: Period) =>
  p.kind === "last" ? monthKeysBack(p.months) : [p.key]

// Last month of the period — the anchor for trailing charts.
export const periodEndKey = (p: Period) => {
  const keys = periodMonthKeys(p)
  return keys[keys.length - 1]
}

// Trailing window used by the monthly charts: never shorter than 6 months, and
// always ending at the selected period so a single month still has context.
export const periodChartKeys = (p: Period, minMonths = 6) =>
  monthKeysEndingAt(periodEndKey(p), Math.max(minMonths, p.kind === "last" ? p.months : 1))

export const periodLabel = (p: Period) =>
  p.kind === "last" ? `Siste ${p.months} ${p.months === 1 ? "måned" : "måneder"}` : monthLongLabel(p.key)

// Query string for the API routes: `months=N` or `month=YYYY-MM`.
export const periodQuery = (p: Period) =>
  p.kind === "last" ? `months=${p.months}` : `month=${p.key}`

// Server-side counterpart: resolve `months` / `month` search params to month keys.
export const resolvePeriodParams = (searchParams: URLSearchParams, fallbackMonths = 3): Period => {
  const month = searchParams.get("month")
  if (month && isMonthKey(month)) return { kind: "month", key: month }
  const months = parseInt(searchParams.get("months") ?? String(fallbackMonths), 10)
  return { kind: "last", months: Math.min(12, Math.max(1, Number.isNaN(months) ? fallbackMonths : months)) }
}

// Individual months offered in the picker, newest first.
export const monthPickerOptions = (count = 12, from = new Date()) => monthKeysBack(count, from).reverse()
