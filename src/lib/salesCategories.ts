// The three business lines the 2026 goals are set on. Invoices are bucketed into
// these so the Salg card answers "did the revenue come from what we said we'd grow?"

export type SalesCategory = "retainer" | "mynk" | "prosjekt"

export const SALES_CATEGORY_ORDER: SalesCategory[] = ["retainer", "prosjekt", "mynk"]

export const salesCategoryLabel: Record<SalesCategory, string> = {
  retainer: "Retainer · SEO/Ads",
  prosjekt: "Prosjekt / engangs",
  mynk: "Mynk",
}

export const salesCategoryTone: Record<SalesCategory, string> = {
  retainer: "#4E8A39",
  prosjekt: "#2E5E22",
  mynk: "#A9D77D",
}

// A customer counts as recurring once it has been invoiced in at least this many
// distinct months inside the trailing window.
export const RECURRING_MIN_MONTHS = 3
export const RECURRING_WINDOW_MONTHS = 6

// Mynk is the high-volume, low-ticket product (~2k/mnd). Anything recurring above
// this monthly average is a real SEO/Ads retainer.
export const MYNK_MAX_MONTHLY = 5000

export const classifySalesCategory = (
  monthsBilledInWindow: number,
  avgMonthlyAmount: number
): SalesCategory => {
  if (monthsBilledInWindow < RECURRING_MIN_MONTHS) return "prosjekt"
  return avgMonthlyAmount < MYNK_MAX_MONTHLY ? "mynk" : "retainer"
}
