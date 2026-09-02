import { NextResponse } from "next/server"
import { createTripletexSession, fetchAllInvoices, fetchCustomerIndex } from "@/lib/tripletex"
import {
  RECURRING_WINDOW_MONTHS,
  SALES_CATEGORY_ORDER,
  SalesCategory,
  classifySalesCategory,
  salesCategoryLabel,
} from "@/lib/salesCategories"
import {
  monthKeyFromDate,
  monthKeysEndingAt,
  periodEndKey,
  periodMonthKeys,
  resolvePeriodParams,
} from "@/lib/period"

export const dynamic = "force-dynamic"

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

// Last day of the month a "YYYY-MM" key points at.
const endOfMonth = (key: string) =>
  new Date(parseInt(key.slice(0, 4), 10), parseInt(key.slice(5, 7), 10), 0)

type CustomerBucket = {
  id: number
  name: string
  domain: string
  category: SalesCategory
  count: number
  amount: number
  newCustomer: boolean
  firstInvoiceDate: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = resolvePeriodParams(searchParams, 3)
  const periodKeys = periodMonthKeys(period)

  try {
    const authHeader = await createTripletexSession()
    const now = new Date()

    // Never look past today, even if a future month is somehow selected.
    const periodEnd = new Date(Math.min(endOfMonth(periodEndKey(period)).getTime(), now.getTime()))

    // Full history is needed to know which invoices are a customer's first.
    const [invoices, customerIndex] = await Promise.all([
      fetchAllInvoices(authHeader, ymd(new Date(2010, 0, 1)), ymd(periodEnd)),
      fetchCustomerIndex(authHeader),
    ])

    const firstInvoiceByCustomer = new Map<number, string>()
    for (const inv of invoices) {
      if (inv.customerId == null || !inv.date) continue
      const current = firstInvoiceByCustomer.get(inv.customerId)
      if (!current || inv.date < current) firstInvoiceByCustomer.set(inv.customerId, inv.date)
    }

    // Recurring detection runs on a trailing window ending with the period, so
    // "August" is judged on how the customer was billed up to and including August.
    const windowKeys = new Set(monthKeysEndingAt(periodEndKey(period), RECURRING_WINDOW_MONTHS))
    const windowByCustomer = new Map<number, Map<string, number>>()
    for (const inv of invoices) {
      if (inv.customerId == null || !inv.date) continue
      const key = monthKeyFromDate(inv.date)
      if (!windowKeys.has(key)) continue
      let months = windowByCustomer.get(inv.customerId)
      if (!months) { months = new Map(); windowByCustomer.set(inv.customerId, months) }
      months.set(key, (months.get(key) ?? 0) + inv.amount)
    }

    const categoryOf = (customerId: number): SalesCategory => {
      const months = windowByCustomer.get(customerId)
      if (!months || months.size === 0) return "prosjekt"
      const total = Array.from(months.values()).reduce((s, v) => s + v, 0)
      return classifySalesCategory(months.size, total / months.size)
    }

    const periodSet = new Set(periodKeys)
    const buckets = new Map<number, CustomerBucket>()
    let totalCount = 0
    let totalAmount = 0

    for (const inv of invoices) {
      if (!inv.date || !periodSet.has(monthKeyFromDate(inv.date))) continue
      totalCount += 1
      totalAmount += inv.amount
      const id = inv.customerId ?? -1
      const meta = id >= 0 ? customerIndex.get(id) : undefined
      const firstDate = id >= 0 ? firstInvoiceByCustomer.get(id) ?? inv.date : inv.date
      let bucket = buckets.get(id)
      if (!bucket) {
        bucket = {
          id,
          name: meta?.name || "Ukjent kunde",
          domain: meta?.domain ?? "",
          category: id >= 0 ? categoryOf(id) : "prosjekt",
          count: 0,
          amount: 0,
          newCustomer: periodSet.has(monthKeyFromDate(firstDate)),
          firstInvoiceDate: firstDate,
        }
        buckets.set(id, bucket)
      }
      bucket.count += 1
      bucket.amount += inv.amount
    }

    const customers = Array.from(buckets.values()).sort((a, b) => b.amount - a.amount)

    const categories = SALES_CATEGORY_ORDER.map((category) => {
      const members = customers.filter((c) => c.category === category)
      return {
        id: category,
        label: salesCategoryLabel[category],
        count: members.reduce((s, c) => s + c.count, 0),
        amount: Math.round(members.reduce((s, c) => s + c.amount, 0)),
        customers: members.length,
        newCustomers: members.filter((c) => c.newCustomer).length,
        newAmount: Math.round(members.filter((c) => c.newCustomer).reduce((s, c) => s + c.amount, 0)),
        top: members.slice(0, 6).map((c) => ({
          id: c.id,
          name: c.name,
          amount: Math.round(c.amount),
          count: c.count,
          newCustomer: c.newCustomer,
        })),
      }
    })

    return NextResponse.json({
      periodKeys,
      total: { count: totalCount, amount: Math.round(totalAmount) },
      topCustomers: customers.slice(0, 6).map((c) => ({
        id: c.id,
        name: c.name,
        amount: Math.round(c.amount),
        count: c.count,
        category: c.category,
        newCustomer: c.newCustomer,
      })),
      newCustomerCount: customers.filter((c) => c.newCustomer).length,
      newCustomerAmount: Math.round(customers.filter((c) => c.newCustomer).reduce((s, c) => s + c.amount, 0)),
      categories,
      source: "tripletex",
    })
  } catch (err) {
    console.error("Tripletex invoices error:", err)
    return NextResponse.json({
      periodKeys,
      total: { count: 0, amount: 0 },
      newCustomerCount: 0,
      newCustomerAmount: 0,
      topCustomers: [],
      categories: [],
      source: "mock",
    })
  }
}
