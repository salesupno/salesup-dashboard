export type MeetingCategory = "new_customer" | "internal" | "existing_customer" | "partner" | "ignore"

export type MeetingAttendee = { email: string; name: string }

export type MeetingEvent = {
  id: string
  summary: string
  date: string
  attendeeEmails: string[]
  attendees?: MeetingAttendee[]
  calendarId?: string
}

export const isInternalEmail = (email: string) =>
  INTERNAL_DOMAINS.some((d) => email.endsWith(`@${d}`)) || email.endsWith("@resource.calendar.google.com")

// The people we actually met — external attendees only, named where Google knows them.
export const externalAttendees = (evt: MeetingEvent): MeetingAttendee[] => {
  const source = evt.attendees ?? evt.attendeeEmails.map((email) => ({ email, name: "" }))
  const seen = new Set<string>()
  const out: MeetingAttendee[] = []
  for (const a of source) {
    const email = String(a.email ?? "").toLowerCase().trim()
    if (!email || isInternalEmail(email) || seen.has(email)) continue
    seen.add(email)
    out.push({ email, name: (a.name ?? "").trim() })
  }
  return out
}

export type MeetingClassification = {
  category: MeetingCategory
  confidence: number
  reason: string
  domains: string[]
}

const INTERNAL_DOMAINS = ["salesup.no"]

const INTERNAL_TITLE_WORDS = [
  "standup",
  "intern",
  "internal",
  "sync",
  "retro",
  "planlegging",
  "1:1",
  "1-1",
  "team",
]

const ACQUISITION_TITLE_WORDS = [
  "kickoff",
  "demo",
  "intro",
  "intromote",
  "intromøte",
  "introduksjon",
  "first",
  "ny kunde",
  "lead",
  "oppstart",
  "salg",
  "tilbud",
  "kunde",
  "presentasjon",
  "presentere",
  "forslag",
  "pitch",
  "nettside",
]

const PARTNER_TITLE_WORDS = [
  "partner",
  "partnership",
  "samarbeid",
  "samarbeidspartner",
  "leverandør",
  "vendor",
  "supplier",
  "support",
  "drift",
  "service",
]

const IGNORE_TITLE_WORDS = ["out of office", "ooo", "ferie", "holiday", "blocked"]

// Customer keys collapse repeated letters so small spelling differences still
// group together. NEVER use this for keyword matching: it turns "ooo" into "o".
const canon = (s: string) =>
  s.toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/(.)\1+/g, "$1")

// Title matching keeps word boundaries and repeated letters intact.
const normTitle = (s: string) =>
  s.toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

// A keyword matches only at the start of a word, so "intro" still catches
// "intromøte" while "ooo" no longer catches every title containing an "o".
const hasKeyword = (title: string, words: string[]) => {
  const haystack = ` ${title} `
  return words.some((word) => {
    const needle = normTitle(word)
    return !!needle && haystack.includes(` ${needle}`)
  })
}

export const externalDomains = (evt: MeetingEvent) =>
  Array.from(new Set(
    evt.attendeeEmails
      .map((email) => String(email ?? "").toLowerCase().trim())
      .filter(Boolean)
      .map((email) => email.includes("@") ? email.split("@").pop() ?? "" : email)
      .filter((domain) => domain && !INTERNAL_DOMAINS.some((d) => domain.endsWith(d)) && !domain.endsWith("@resource.calendar.google.com"))
  ))

export const internalOnly = (evt: MeetingEvent) => {
  const attendees = evt.attendeeEmails.map((email) => String(email ?? "").toLowerCase().trim()).filter(Boolean)
  return attendees.length > 0 && attendees.every((email) => INTERNAL_DOMAINS.some((d) => email.endsWith(d)))
}

export const meetingCustomerKey = (evt: MeetingEvent) => {
  const domains = externalDomains(evt)
  if (domains.length) return `d:${domains[0]}`
  const title = canon(evt.summary)
  return `t:${title.slice(0, 42)}`
}

export const suggestMeetingClassification = (
  evt: MeetingEvent,
  knownCustomerDomains: Set<string>
): MeetingClassification => {
  const summary = evt.summary.toLowerCase()
  const title = normTitle(summary)
  const domains = externalDomains(evt)
  const hasKnownCustomerDomain = domains.some((d) => knownCustomerDomains.has(d))
  const hasInternalAttendees = internalOnly(evt)
  const hasAcquisitionSignal = hasKeyword(title, ACQUISITION_TITLE_WORDS)
  const hasPartnerSignal = hasKeyword(title, PARTNER_TITLE_WORDS)
  const hasInternalTitleSignal = hasKeyword(title, INTERNAL_TITLE_WORDS)
  const hasCrossTitle = summary.includes(" x ") || summary.includes(" × ")

  if (hasKeyword(title, IGNORE_TITLE_WORDS)) {
    return { category: "ignore", confidence: 95, reason: "tittel signaliserer at møtet ikke er salgsmøte", domains }
  }

  if (hasInternalAttendees && !domains.length) {
    return { category: "internal", confidence: 98, reason: "kun @salesup.no-deltakere", domains }
  }

  if (hasKnownCustomerDomain) {
    return { category: "existing_customer", confidence: 95, reason: "ekstern deltaker matcher kjent kunde fra Tripletex", domains }
  }

  // Unknown external domain + classic pitch/intro wording should strongly count as a new customer meeting.
  if (domains.length > 0 && hasAcquisitionSignal) {
    return { category: "new_customer", confidence: 93, reason: "ekstern deltaker + intro/presentasjon/tilbud-signal i tittelen", domains }
  }

  // Unknown external domain + company-to-company title format is usually a live prospect/customer dialogue.
  if (domains.length > 0 && hasCrossTitle && !hasPartnerSignal) {
    return { category: "new_customer", confidence: 83, reason: "ekstern deltaker + møtetittel på formatet 'kunde x SalesUp'", domains }
  }

  if (domains.some((d) => d.includes("gmail.com") || d.includes("outlook.com") || d.includes("hotmail.com"))) {
    return { category: "new_customer", confidence: 72, reason: "ekstern privat/ukjent deltakerdomene uten kjent kunde", domains }
  }

  if (hasPartnerSignal) {
    return { category: "partner", confidence: 80, reason: "tittel signaliserer partner/leverandør", domains }
  }

  if (domains.length > 0) {
    return { category: "new_customer", confidence: 74, reason: "ekstern deltaker uten kjent kunde-matching", domains }
  }

  if (hasInternalAttendees || hasInternalTitleSignal) {
    return { category: "internal", confidence: 85, reason: "internt møte uten eksterne deltakere", domains }
  }

  return { category: "ignore", confidence: 55, reason: "uklar møteklasse, bør vurderes manuelt", domains }
}

export const meetingCategoryLabel: Record<MeetingCategory, string> = {
  new_customer: "Nytt kundemøte",
  internal: "Internt",
  existing_customer: "Eksisterende kunde",
  partner: "Partner / leverandør",
  ignore: "Ignorer",
}

export const meetingCategoryTone: Record<MeetingCategory, string> = {
  new_customer: "#4E8A39",
  internal: "#666",
  existing_customer: "#9A6A00",
  partner: "#3A6491",
  ignore: "#999",
}
