// Pure analysis over a fetched Tripletex invoice history. Kept separate from the
// routes so revenue, invoices and wins are computed the same way everywhere and
// can all be served from a single fetch.

import type { TripletexInvoice } from "./tripletex"
import { monthKeyFromDate } from "./period"
import {
  RECURRING_WINDOW_MONTHS,
  SALES_CATEGORY_ORDER,
  SalesCategory,
  classifySalesCategory,
  salesCategoryLabel,
} from "./salesCategories"

export type CustomerMeta = { name: string; domain: string }

export const firstInvoiceByCustomer = (invoices: TripletexInvoice[]) => {
  const first = new Map<number, string>()
  for (const inv of invoices) {
    if (inv.customerId == null || !inv.date) continue
    const current = first.get(inv.customerId)
    if (!current || inv.date < current) first.set(inv.customerId, inv.date)
  }
  return first
}

// Monthly totals per customer inside a window — the basis for both the recurring
// classification and MRR.
const monthlyByCustomer = (invoices: TripletexInvoice[], windowKeys: Set<string>) => {
  const perCustomer = new Map<number, Map<string, number>>()
  for (const inv of invoices) {
    if (inv.customerId == null || !inv.date) continue
    const key = monthKeyFromDate(inv.date)
    if (!windowKeys.has(key)) continue
    let months = perCustomer.get(inv.customerId)
    if (!months) { months = new Map(); perCustomer.set(inv.customerId, months) }
    months.set(key, (months.get(key) ?? 0) + inv.amount)
  }
  return perCustomer
}

export const buildRevenue = (
  invoices: TripletexInvoice[],
  periodKeys: string[],
  mrrKeys: string[]
) => {
  const periodSet = new Set(periodKeys)
  const periodTotal = invoices
    .filter((iv) => iv.date && periodSet.has(monthKeyFromDate(iv.date)))
    .reduce((s, iv) => s + iv.amount, 0)

  // MRR — a customer counts as recurring only when invoiced in EACH of the MRR
  // months; its contribution is the average of those monthly amounts.
  const perCustomer = monthlyByCustomer(invoices, new Set(mrrKeys))
  let mrr = 0
  for (const months of perCustomer.values()) {
    const billed = mrrKeys.filter((k) => (months.get(k) ?? 0) > 0).length
    if (billed === mrrKeys.length) {
      mrr += mrrKeys.reduce((s, k) => s + (months.get(k) ?? 0), 0) / mrrKeys.length
    }
  }

  return {
    omsMnd: Math.round(periodTotal / Math.max(1, periodKeys.length)),
    mrr: Math.round(mrr),
  }
}

export const buildWins = (
  invoices: TripletexInvoice[],
  customerIndex: Map<number, CustomerMeta>,
  keys: string[],
  monthLabel: (key: string) => string
) => {
  const allowed = new Set(keys)
  const byMonth = new Map<string, number>(keys.map((k) => [k, 0]))
  const newCustomers: Array<{ id: number; name: string; domain: string; month: string; firstInvoiceDate: string }> = []

  for (const [id, firstDate] of firstInvoiceByCustomer(invoices).entries()) {
    const key = monthKeyFromDate(firstDate)
    if (!allowed.has(key)) continue
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1)
    const meta = customerIndex.get(id)
    newCustomers.push({
      id,
      name: meta?.name || "Ukjent kunde",
      domain: meta?.domain ?? "",
      month: key,
      firstInvoiceDate: firstDate,
    })
  }

  newCustomers.sort((a, b) => b.firstInvoiceDate.localeCompare(a.firstInvoiceDate))

  return {
    monthly: keys.map((k) => ({ key: k, month: monthLabel(k), wins: byMonth.get(k) ?? 0 })),
    newCustomers,
  }
}

export const buildInvoiceSummary = (
  invoices: TripletexInvoice[],
  customerIndex: Map<number, CustomerMeta>,
  periodKeys: string[],
  recurringWindowKeys: string[]
) => {
  const first = firstInvoiceByCustomer(invoices)
  const perCustomer = monthlyByCustomer(invoices, new Set(recurringWindowKeys))

  const categoryOf = (id: number): SalesCategory => {
    const months = perCustomer.get(id)
    if (!months || months.size === 0) return "prosjekt"
    const total = Array.from(months.values()).reduce((s, v) => s + v, 0)
    return classifySalesCategory(months.size, total / months.size)
  }

  const periodSet = new Set(periodKeys)
  type Bucket = {
    id: number
    name: string
    category: SalesCategory
    count: number
    amount: number
    newCustomer: boolean
  }
  const buckets = new Map<number, Bucket>()
  let totalCount = 0
  let totalAmount = 0

  for (const inv of invoices) {
    if (!inv.date || !periodSet.has(monthKeyFromDate(inv.date))) continue
    totalCount += 1
    totalAmount += inv.amount
    const id = inv.customerId ?? -1
    let bucket = buckets.get(id)
    if (!bucket) {
      const firstDate = id >= 0 ? first.get(id) ?? inv.date : inv.date
      bucket = {
        id,
        name: (id >= 0 ? customerIndex.get(id)?.name : "") || "Ukjent kunde",
        category: id >= 0 ? categoryOf(id) : "prosjekt",
        count: 0,
        amount: 0,
        newCustomer: periodSet.has(monthKeyFromDate(firstDate)),
      }
      buckets.set(id, bucket)
    }
    bucket.count += 1
    bucket.amount += inv.amount
  }

  const customers = Array.from(buckets.values()).sort((a, b) => b.amount - a.amount)
  const newOnes = customers.filter((c) => c.newCustomer)

  return {
    total: { count: totalCount, amount: Math.round(totalAmount) },
    newCustomerCount: newOnes.length,
    newCustomerAmount: Math.round(newOnes.reduce((s, c) => s + c.amount, 0)),
    topCustomers: customers.slice(0, 6).map((c) => ({
      id: c.id,
      name: c.name,
      amount: Math.round(c.amount),
      count: c.count,
      category: c.category,
      newCustomer: c.newCustomer,
    })),
    categories: SALES_CATEGORY_ORDER.map((category) => {
      const members = customers.filter((c) => c.category === category)
      const newMembers = members.filter((c) => c.newCustomer)
      return {
        id: category,
        label: salesCategoryLabel[category],
        count: members.reduce((s, c) => s + c.count, 0),
        amount: Math.round(members.reduce((s, c) => s + c.amount, 0)),
        customers: members.length,
        newCustomers: newMembers.length,
        newAmount: Math.round(newMembers.reduce((s, c) => s + c.amount, 0)),
        top: members.slice(0, 6).map((c) => ({
          id: c.id,
          name: c.name,
          amount: Math.round(c.amount),
          count: c.count,
          newCustomer: c.newCustomer,
        })),
      }
    }),
  }
}

export { RECURRING_WINDOW_MONTHS }
