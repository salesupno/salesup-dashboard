/* SalesUp CEO Dashboard — mock data, REAL business model.
   All figures in NOK. June 2, 2026.
   Recurring streams: SEO/ADS retainere · Hosting · Mynk (AI SaaS) · + enkeltprosjekter.
   Wired to mimic Tripletex (økonomi) + Copper CRM (salg/kunder/leads). */
(function () {
  const s = (...n) => n;

  window.SU_DATA = {
    meta: {
      company: "SalesUp Norway AS",
      asOf: "2. juni 2026",
      connections: [
        { name: "Tripletex", status: "ok", detail: "Synket 09:12 — økonomi" },
        { name: "Copper CRM", status: "ok", detail: "Synket 09:12 — salg & kunder" },
      ],
    },

    /* ---- The 5 CEO questions (the 30-second spine) ---- */
    questions: [
      { q: "Vokser vi?", verdict: "Ja", status: "green", metric: "+8,4 % MRR", sub: "under skaleringstempo" },
      { q: "Tjener vi penger?", verdict: "Ja", status: "green", metric: "18,2 % EBITDA", sub: "+124k/mnd i drift" },
      { q: "Beholder vi kundene?", verdict: "Delvis", status: "yellow", metric: "101 % NRR", sub: "4 retainere i rødt" },
      { q: "Har vi nok leads?", verdict: "Nei", status: "red", metric: "2,1× coverage", sub: "treg lead-oppfølging" },
      { q: "Hva krever fokus?", verdict: "Skalering", status: "yellow", metric: "lead-kapasitet", sub: "kan vi ansette?" },
    ],

    /* ---- North Star KPIs ---- */
    northStar: [
      {
        id: "mrr", label: "MRR", unit: "kr/mnd",
        value: 337000, display: "337k",
        deltaPct: 8.4, deltaDir: "up", deltaLabel: "+8,4 % vs. forrige mnd",
        target: 600000, targetLabel: "Mål 600k (i år)", progress: 0.56, status: "yellow",
        spark: s(0.24, 0.26, 0.27, 0.29, 0.30, 0.31, 0.32, 0.33, 0.337),
      },
      {
        id: "rev", label: "Omsetning YTD", unit: "kr",
        value: 3400000, display: "3,40 mill",
        deltaPct: 21.0, deltaDir: "up", deltaLabel: "Run-rate ~8,2 mill",
        target: 20000000, targetLabel: "Mål 20 mill (skalering)", progress: 0.41, status: "yellow",
        spark: s(0.6, 1.2, 1.9, 2.6, 3.4),
      },
      {
        id: "ebitda", label: "EBITDA-margin", unit: "%",
        value: 18.2, display: "18,2 %",
        deltaPct: 0.6, deltaDir: "up", deltaLabel: "+124 000 kr/mnd i drift",
        target: 20, targetLabel: "Mål 20 %", progress: 0.91, status: "yellow",
        spark: s(15.9, 16.4, 17.1, 17.4, 17.8, 18.0, 18.2),
      },
      {
        id: "cash", label: "Kontantbeholdning", unit: "kr",
        value: 1900000, display: "1,90 mill",
        deltaPct: 6.7, deltaDir: "up", deltaLabel: "+0,12 mill siste mnd",
        target: null, targetLabel: "≈ 3,4 mnd buffer", progress: null, status: "green",
        spark: s(1.5, 1.6, 1.6, 1.7, 1.78, 1.82, 1.9),
      },
      {
        id: "customers", label: "Aktive kunder", unit: "",
        value: 66, display: "66",
        deltaPct: 6.5, deltaDir: "up", deltaLabel: "7 retainere · 45 hosting · 14 Mynk",
        target: null, targetLabel: "+4 siste 30 dager", progress: null, status: "green",
        spark: s(58, 59, 61, 62, 63, 64, 66),
      },
    ],

    /* ---- Revenue streams (product lines) ---- */
    streams: [
      {
        id: "retainer", name: "SEO / ADS retainere", icon: "target",
        count: 7, target: 20, unit: "", mrr: 287000, price: "25–60k/mnd", status: "yellow",
        spark: s(4, 4, 5, 5, 6, 6, 7),
        detail: { arpa: "41 000 kr / mnd", margin: "Margin ~52 %", note: "Kjernevekst — 13 unna mål. Begrenset av lead-closing, ikke etterspørsel." },
      },
      {
        id: "hosting", name: "Hosting", icon: "dot-grid",
        count: 45, target: null, unit: "", mrr: 23000, price: "200–1 000/mnd", status: "green",
        spark: s(40, 41, 42, 43, 44, 44, 45),
        detail: { arpa: "510 kr / mnd", margin: "Margin ~70 %", note: "Stabil base, lav oppfølging. Mersalg til retainer mulig." },
      },
      {
        id: "mynk", name: "Mynk · AI-plattform (SaaS)", icon: "spark",
        count: 14, target: 100, unit: "", mrr: 27000, price: "~1 900/mnd", status: "yellow",
        spark: s(6, 8, 9, 10, 11, 12, 14),
        detail: { arpa: "1 900 kr / mnd", margin: "Margin ~84 %", note: "Mest skalerbare strøm — vokser uten leveransekapasitet. +2,5 kunder/mnd." },
      },
      {
        id: "projects", name: "Enkeltprosjekter · utvikling", icon: "ebitda",
        count: 3, target: 6, unit: "/mnd", mrr: 0, projRev: 330000, price: "80–150k/prosj.", status: "red",
        spark: s(2, 3, 2, 4, 3, 3, 3),
        detail: { arpa: "~110 000 kr / prosjekt", margin: "Margin ~45 %", note: "Frontend/backend. 3 av 6 i snitt — begrenset av utviklerkapasitet." },
      },
    ],

    /* ---- Profitable-scaling simulator ---- */
    scale: {
      cash: 1900000,
      monthlyRevenue: 683000,   // run-rate 8,2 mill / 12
      monthlyCost: 559000,      // operating cost incl. lønn → +124k/mnd (18,2 % EBITDA)
      floor: 1000000,           // likviditetsgulv — ikke under dette
      moves: [
        {
          id: "sdr", icon: "phone", label: "Lead-håndterer", cost: 52000,
          recurring: true, perMonthMrr: 38000, ramp: 6,
          gain: "+~1 retainer / mnd", segment: "Salg",
          why: "Responstid på 9,4 t lekker kvalifiserte leads. En SDR følger opp varme leads og frigjør selger til closing.",
        },
        {
          id: "consultant", icon: "user", label: "Leveransekonsulent", cost: 58000,
          recurring: true, perMonthMrr: 18000, ramp: 5,
          gain: "Fjerner leveranseflaskehals", segment: "Leveranse",
          why: "Stabiliserer forsinkede prosjekter og beskytter retainere mot churn. Frigjør kapasitet til 0,5 retainer/mnd ekstra.",
        },
        {
          id: "dev", icon: "ebitda", label: "Utvikler (prosjekt)", cost: 62000,
          recurring: false, flat: 95000, ramp: 3,
          gain: "+2 enkeltprosjekter / mnd", segment: "Utvikling",
          why: "Dekker etterspørsel etter frontend/backend. Løfter fra 3 til 5–6 prosjekter/mnd.",
        },
      ],
    },

    /* ---- Liquidity ---- */
    liquidity: {
      cash: 1900000,
      netMonthly: 124000,
      inflow: 683000,
      outflow: 559000,
      bufferMonths: 3.4,
      outstanding: 412000,
      overdue: 142000,
      history: [
        { label: "Des", value: 1500000 }, { label: "Jan", value: 1600000 }, { label: "Feb", value: 1620000 },
        { label: "Mar", value: 1700000 }, { label: "Apr", value: 1780000 }, { label: "Mai", value: 1820000 },
        { label: "Jun", value: 1900000 },
      ],
      invoices: [
        { name: "Nordvik Eiendom", amount: 90000, status: "forfalt", due: "12 dager på overtid" },
        { name: "Aurora Media", amount: 52000, status: "forfalt", due: "14 dager på overtid" },
        { name: "Fjord Logistikk", amount: 88000, status: "utestående", due: "forfaller om 8 dager" },
        { name: "Kystmat AS", amount: 64000, status: "utestående", due: "forfaller om 19 dager" },
        { name: "Vestby Bygg", amount: 118000, status: "utestående", due: "forfaller om 24 dager" },
      ],
    },

    /* ---- Sales & leads ---- */
    sales: {
      items: [
        { label: "Pipeline-verdi", value: "4,20 mill", sub: "31 åpne muligheter", status: "yellow" },
        { label: "Pipeline coverage", value: "2,1×", sub: "mål 3,0× — for lav", status: "red" },
        { label: "Nye leads (30 d)", value: "41", sub: "+18 % vs. snitt", status: "green" },
        { label: "Lead-responstid", value: "9,4 t", sub: "mål < 2 t — flaskehals", status: "red" },
        { label: "Win Rate", value: "28 %", sub: "mål 35 %", status: "yellow" },
        { label: "Møter booket", value: "22", sub: "denne måneden", status: "green" },
      ],
      funnel: [
        { stage: "Leads", value: 41 },
        { stage: "Kvalifisert", value: 24 },
        { stage: "Tilbud", value: 14 },
        { stage: "Vunnet", value: 4 },
      ],
    },

    /* ---- Customers (value & profitability view) ---- */
    customers: [
      { id: "k1", name: "First Camp Sverige", type: "SEO/Ads", market: "SE", rev: 284, margin: 54, health: "green", status: "vekst", owner: "Ina H.", tenure: 22, lastContact: "3 dager siden", expand: 18,
        score: 88, results: 90, trust: 88, engagement: 85, goal: "Bli markedsleder på camping i Sverige.", nextStep: "Legg til Performance Ads før booking-sesongen.", note: "Største konto. Leverer sterke resultater — moden for utvidelse." },
      { id: "k2", name: "Sparmax", type: "SEO/Ads", market: "NO/SE", rev: 215, margin: 49, health: "green", status: "aktiv", owner: "Markus T.", tenure: 28, lastContact: "1 dag siden", expand: 12,
        score: 82, results: 84, trust: 82, engagement: 80, goal: "Doble organisk omsetning i Norden.", nextStep: "Oppgrader til SEO Pro + Revenue Agent.", note: "Stabil og fornøyd. Klar for neste pakkenivå." },
      { id: "k3", name: "Smart Varme", type: "SEO/Ads", market: "NO", rev: 169, margin: 51, health: "green", status: "aktiv", owner: "Sofie L.", tenure: 19, lastContact: "5 dager siden", expand: 9,
        score: 80, results: 85, trust: 78, engagement: 76, goal: "Flere kvalifiserte leads på varmepumper.", nextStep: "Øk annonsebudsjett — ROAS tåler mer.", note: "Sterk ROAS gir rom for å skalere annonser." },
      { id: "k4", name: "Ditt Uterom", type: "SEO/Ads", market: "NO", rev: 112, margin: 44, health: "yellow", status: "aktiv", owner: "Ina H.", tenure: 14, lastContact: "12 dager siden", expand: 0,
        score: 64, results: 60, trust: 66, engagement: 65, goal: "Vokse e-handel på hageprodukter.", nextStep: "Reforhandle til riktig pakkenivå ved fornyelse.", note: "Resultatene henger etter forventning — følg opp før mersalg." },
      { id: "k5", name: "Almanakkforlaget", type: "Hosting", market: "NO", rev: 94, margin: 68, health: "green", status: "aktiv", owner: "Markus T.", tenure: 41, lastContact: "8 dager siden", expand: 14,
        score: 79, results: 75, trust: 84, engagement: 78, goal: "Stabil drift + bedre synlighet på Google.", nextStep: "Oppsalg fra hosting til SEO-retainer.", note: "Høy tillit etter mange år. Naturlig oppsalg til SEO." },
      { id: "k6", name: "Kristiansand Dyrepark", type: "Utvikling", market: "NO", rev: 75, margin: 47, health: "green", status: "aktiv", owner: "Sofie L.", tenure: 11, lastContact: "2 dager siden", expand: 8,
        score: 78, results: 80, trust: 79, engagement: 74, goal: "Flere besøkende booket via nett.", nextStep: "Konverter prosjekt til løpende vedlikehold + SEO.", note: "Leveranse på skinner — bind til løpende avtale." },
      { id: "k7", name: "P. Lindberg", type: "SEO/Ads", market: "NO", rev: 60, margin: 50, health: "green", status: "aktiv", owner: "Ina H.", tenure: 17, lastContact: "6 dager siden", expand: 6,
        score: 77, results: 78, trust: 77, engagement: 75, goal: "Økt netthandel mot B2B.", nextStep: "Test Performance Ads på toppkategorier.", note: "" },
      { id: "k8", name: "Norweh USA", type: "SEO/Ads", market: "US", rev: 56, margin: 52, health: "green", status: "vekst", owner: "Markus T.", tenure: 8, lastContact: "1 dag siden", expand: 14,
        score: 81, results: 82, trust: 80, engagement: 82, goal: "Etablere merkevaren i USA.", nextStep: "Skaler annonser i takt med pipeline.", note: "Høyt momentum i nytt marked." },
      { id: "k9", name: "Norweh Inc.", type: "SEO/Ads", market: "CA", rev: 57, margin: 46, health: "yellow", status: "vekst", owner: "Markus T.", tenure: 8, lastContact: "9 dager siden", expand: 5,
        score: 66, results: 62, trust: 70, engagement: 66, goal: "Vekst i det kanadiske markedet.", nextStep: "Sikre tydelig verdi innen 30 dager, så utvid.", note: "Tidlig fase — resultater må dokumenteres raskt." },
      { id: "k10", name: "PBS Direct", type: "Utvikling", market: "US", rev: 56, margin: 45, health: "green", status: "vekst", owner: "Sofie L.", tenure: 6, lastContact: "4 dager siden", expand: 8,
        score: 76, results: 78, trust: 75, engagement: 74, goal: "Lansere ny e-handelsplattform.", nextStep: "Etterfølg prosjekt med drift + SEO.", note: "" },
      { id: "k11", name: "Skinnassistanse", type: "Hosting", market: "NO", rev: 43, margin: 66, health: "green", status: "aktiv", owner: "Ina H.", tenure: 33, lastContact: "14 dager siden", expand: 6,
        score: 80, results: 76, trust: 86, engagement: 78, goal: "Pålitelig drift uten styr.", nextStep: "Tilby SEO-startpakke med lav friksjon.", note: "Svært lojal. Lav friksjon = lett oppsalg." },
      { id: "k12", name: "Slikkepott", type: "SEO/Ads", market: "NO", rev: 38, margin: 41, health: "red", status: "aktiv", owner: "Sofie L.", tenure: 13, lastContact: "27 dager siden", expand: 0,
        score: 42, results: 38, trust: 44, engagement: 45, goal: "Flere salg fra Google.", nextStep: "Vinn tilbake tillit: vis resultater før mersalg.", note: "Fallende engasjement og svake resultater — churn-risiko." },
      { id: "k13", name: "Biocleaner Rens", type: "SEO/Ads", market: "NO", rev: 28, margin: 48, health: "green", status: "ny", owner: "Markus T.", tenure: 3, lastContact: "2 dager siden", expand: 4,
        score: 75, results: 72, trust: 78, engagement: 76, goal: "Rask vekst som nyetablert.", nextStep: "Onboarding-gevinst → utvid annonsekontoer.", note: "God start — sikre verdi innen 30 dager." },
      { id: "k14", name: "Kaffiståvå", type: "SEO/Ads", market: "NO", rev: 28, margin: 39, health: "yellow", status: "ny", owner: "Ina H.", tenure: 2, lastContact: "7 dager siden", expand: 0,
        score: 60, results: 56, trust: 64, engagement: 62, goal: "Bygge nettsynlighet fra null.", nextStep: "Juster pakke til riktig margin, dokumenter verdi.", note: "Lav margin fra start — vurder pakkejustering." },
      { id: "k15", name: "Eidos Eiendomsutvikling", type: "Utvikling", market: "NO", rev: 24, margin: 43, health: "green", status: "ny", owner: "Sofie L.", tenure: 2, lastContact: "3 dager siden", expand: 5,
        score: 74, results: 73, trust: 76, engagement: 73, goal: "Digital tilstedeværelse for nye prosjekter.", nextStep: "Legg til løpende SEO etter lansering.", note: "" },
      { id: "k16", name: "Mukta Magic", type: "Hosting", market: "NO", rev: 22, margin: 70, health: "green", status: "aktiv", owner: "Markus T.", tenure: 24, lastContact: "18 dager siden", expand: 4,
        score: 78, results: 72, trust: 85, engagement: 77, goal: "Enkel og trygg drift.", nextStep: "Oppsalg til SEO når trafikken øker.", note: "Høyest margin og høy tillit." },
      { id: "k17", name: "Flexibo", type: "SEO/Ads", market: "NO", rev: 20, margin: 38, health: "red", status: "utestående", owner: "Ina H.", tenure: 10, lastContact: "21 dager siden", expand: 0,
        score: 40, results: 36, trust: 42, engagement: 44, goal: "Lønnsom netthandel.", nextStep: "Avklar forfalt faktura + bevis verdi, ellers offboard.", note: "Forfalt faktura, lav margin og svake resultater." },
    ],

    /* ---- Customer health ---- */
    health: {
      items: [
        { label: "NRR", value: "101 %", sub: "Net Revenue Retention", status: "green" },
        { label: "Churn", value: "2,1 %", sub: "14 000 kr/mnd tapt", status: "yellow" },
        { label: "LTV", value: "410 000 kr", sub: "per retainer (snitt)", status: "green" },
        { label: "NPS", value: "54", sub: "promotører 62 %", status: "green" },
      ],
      mix: { green: 48, yellow: 13, red: 5 },
    },

    riskCustomers: [
      { name: "Nordvik Eiendom", mrr: 38000, status: "red", tenure: 14, owner: "Ina H.", reason: "Forsinket leveranse + 2 forfalte fakturaer", trend: -22, lastContact: "19 dager siden", service: "SEO/ADS retainer", type: "SEO/Ads" },
      { name: "Fjord Logistikk", mrr: 52000, status: "red", tenure: 31, owner: "Markus T.", reason: "Vurderer nedgradering — misfornøyd med rapportering", trend: -18, lastContact: "6 dager siden", service: "SEO/ADS retainer", type: "SEO/Ads" },
      { name: "Bjørke Interiør", mrr: 27000, status: "red", tenure: 9, owner: "Sofie L.", reason: "Lavt engasjement, ingen møter på 30 d", trend: -9, lastContact: "33 dager siden", service: "SEO/ADS retainer", type: "SEO/Ads" },
      { name: "Kystmat AS", mrr: 31000, status: "red", tenure: 22, owner: "Ina H.", reason: "Spesialprosjekt forsinket — lav fremdrift", trend: -12, lastContact: "11 dager siden", service: "Spesialprosjekt", type: "Utvikling" },
      { name: "Tindra Helse", mrr: 18000, status: "red", tenure: 7, owner: "Markus T.", reason: "Backend-prosjekt stoppet — beslutningstaker sluttet", trend: -5, lastContact: "8 dager siden", service: "Backend-prosjekt", type: "Utvikling" },
      { name: "Aurora Media", mrr: 44000, status: "yellow", tenure: 18, owner: "Sofie L.", reason: "Faktura forfalt 14 d (52 000 kr)", trend: -3, lastContact: "4 dager siden", service: "SEO/ADS retainer", type: "SEO/Ads" },
      { name: "Vestby Bygg", mrr: 29000, status: "yellow", tenure: 25, owner: "Ina H.", reason: "Bruker færre timer enn avtalt", trend: 1, lastContact: "9 dager siden", service: "SEO/ADS retainer", type: "SEO/Ads" },
      { name: "Lunde Regnskap", mrr: 520, status: "yellow", tenure: 12, owner: "Markus T.", reason: "Hosting — kontraktsfornyelse uavklart", trend: 0, lastContact: "5 dager siden", service: "Hosting", type: "Hosting" },
    ],

    /* ---- Goals (front-page målstyring) ---- */
    goals: [
      { label: "20 MNOK omsetning", short: "Omsetning", current: 8.2, target: 20, unit: "mill", progress: 0.41, eta: "2027", status: "yellow", pace: "Run-rate 8,2 mill" },
      { label: "20 SEO/ADS retainere", short: "SEO/ADS-retainere", current: 7, target: 20, unit: "", progress: 0.35, eta: "Q3 2027", status: "red", pace: "+0,8 / mnd" },
      { label: "100 Mynk-kunder", short: "Mynk-kunder (SaaS)", current: 14, target: 100, unit: "", progress: 0.14, eta: "2028", status: "yellow", pace: "+2,5 / mnd" },
      { label: "6 enkeltprosjekter / mnd", short: "Prosjekter / mnd", current: 3, target: 6, unit: "", progress: 0.5, eta: "Trenger +1 utvikler", status: "yellow", pace: "3 av 6 i snitt" },
    ],

    /* ---- Alerts ---- */
    alerts: [
      { sev: "red", icon: "clock", title: "Lead-responstid 9,4 t (mål < 2 t)", body: "Kvalifiserte leads lekker før closing. Største vekstbrems akkurat nå.", time: "I dag 08:40" },
      { sev: "red", icon: "alert", title: "Nordvik Eiendom → rød status", body: "Forsinket leveranse + 2 forfalte fakturaer. 38 000 kr MRR i fare.", time: "I dag 08:40", customer: "Nordvik Eiendom" },
      { sev: "yellow", icon: "pipeline", title: "Pipeline coverage under mål", body: "2,1× mot mål 3,0×. Trenger +1,1 mill ny pipeline for Q3.", time: "I går" },
      { sev: "yellow", icon: "invoice", title: "2 fakturaer forfalt", body: "Totalt 142 000 kr — Nordvik (90 000), Aurora (52 000).", time: "2 dager siden" },
      { sev: "yellow", icon: "spark", title: "Mynk vokser under tempo", body: "+2,5/mnd. For 100-målet i 2028 trengs ~3,5/mnd — vurder markedsføring.", time: "3 dager siden" },
    ],

    /* ---- AI throughput recommendations (Theory of Constraints) ---- */
    ai: {
      headline: "Veksten bremses av lead-oppfølging — ikke av etterspørsel.",
      summary:
        "41 nye leads siste 30 dager, men 9,4 t responstid og 28 % win rate betyr at kvalifiserte leads lekker før closing. Flaskehalsen er kapasitet til å følge opp og lukke. Du har +124k/mnd i drift og 1,9 mill i likviditet — rom til å ansette uten å overstige likviditeten.",
      bottleneck: { step: 1, name: "Lead-håndtering & closing" },
      recommendations: [
        {
          rank: 1, impact: "+168k MRR / 6 mnd", effort: "Middels",
          title: "Ansett en lead-håndterer (SDR) — payback ~4 mnd",
          body: "Responstid 9,4 t lekker leads. En SDR (52k/mnd) frigjør selger til closing og henter ~1 retainer/mnd ekstra. Likviditeten holder seg over bufferen. Simuler det i «Skaler lønnsomt».",
          tied: "Trinn 4 — løft kapasiteten i flaskehalsen",
        },
        {
          rank: 2, impact: "≈ 2× konvertering", effort: "Lav",
          title: "Kutt lead-responstid fra 9,4 t til under 2 t",
          body: "Automatiser førsterespons og lead-ruting i Copper. Historisk dobler < 2 t responstid sannsynligheten for møte. Gratis throughput før du ansetter.",
          tied: "Trinn 2 — utnytt flaskehalsen maksimalt",
        },
        {
          rank: 3, impact: "+86 mot Mynk-mål", effort: "Middels",
          title: "Gjør Mynk til selvbetjent vekstmotor",
          body: "Mynk (84 % margin) skalerer uten leveransekapasitet — 14 av 100 i dag. Lavere CAC enn retainere. Den mest lønnsomme veien til skala.",
          tied: "Trinn 3 — underordne alt til flaskehalsen",
        },
      ],
    },

    /* ---- Theory of Constraints: five focusing steps ---- */
    tocSteps: [
      { n: 1, title: "Identifiser flaskehalsen", sub: "Hvor stopper throughput?", state: "active", note: "Lead-håndtering & closing (9,4 t responstid)" },
      { n: 2, title: "Utnytt flaskehalsen maksimalt", sub: "Med det du allerede har", note: "Kutt responstid < 2 t, prioriter varme leads" },
      { n: 3, title: "Underordne alt annet", sub: "Resten følger flaskehalsens takt", note: "Mynk-vekst + Copper-automasjon avlaster" },
      { n: 4, title: "Løft kapasiteten", sub: "Invester når 1–3 er gjort", note: "Ansett SDR — se «Skaler lønnsomt»" },
      { n: 5, title: "Gjenta — unngå treghet", sub: "Finn neste flaskehals", note: "Neste: leveranse-/utviklerkapasitet" },
    ],
  };
})();
