export type TrendDirection = "up" | "down" | "flat";
export type Status = "good" | "watch" | "risk";
export type MetricCategory = "Revenue" | "Customer" | "Funnel" | "Efficiency";

export type MonthlyRevenueMetric = {
  month: string;
  mrr: number;
  arr: number;
  activeCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  expansionRevenue: number;
  contractionRevenue: number;
  marketingSpend: number;
  leads: number;
  trials: number;
  activated: number;
  paidConversions: number;
  campaignRevenue: number;
};

export type KpiCard = {
  label: string;
  value: string;
  rawValue: number;
  previousValue: number;
  change: number;
  direction: TrendDirection;
  status: Status;
  category: MetricCategory;
  target: string;
  definition: string;
};

export type FunnelStep = {
  label: string;
  value: number;
  conversionFromPrevious: number | null;
  health: Status;
};

export type SegmentPerformance = {
  segment: string;
  customers: number;
  mrr: number;
  churnRate: number;
  netRevenueRetention: number;
  activationRate: number;
  note: string;
};

export type ChannelPerformance = {
  channel: string;
  spend: number;
  leads: number;
  trials: number;
  customers: number;
  cac: number;
  roi: number;
  status: Status;
};

export type Anomaly = {
  metric: string;
  severity: Status;
  detectedChange: string;
  likelyCause: string;
  businessImpact: string;
  recommendedAction: string;
};

export type DataQualityCheck = {
  check: string;
  status: Status;
  result: string;
  owner: string;
  impact: string;
};

export type MetricDefinition = {
  name: string;
  owner: string;
  definition: string;
  sql: string;
};

export type InsightReport = {
  title: string;
  generatedAt: string;
  executiveSummary: string;
  findings: string[];
  decisions: string[];
  risks: string[];
  source: "grounded-demo-engine" | "openai";
};

export type RevenuePulseSnapshot = {
  generatedAt: string;
  companyContext: {
    company: string;
    market: string;
    model: string;
    audience: string;
  };
  monthlyMetrics: MonthlyRevenueMetric[];
  kpis: KpiCard[];
  funnel: FunnelStep[];
  segments: SegmentPerformance[];
  channels: ChannelPerformance[];
  anomalies: Anomaly[];
  dataQuality: DataQualityCheck[];
  metricDefinitions: MetricDefinition[];
  insightReport: InsightReport;
};

const monthlyMetrics: MonthlyRevenueMetric[] = [
  { month: "Jun 2025", mrr: 86500, arr: 1038000, activeCustomers: 562, newCustomers: 48, churnedCustomers: 24, expansionRevenue: 9200, contractionRevenue: 3100, marketingSpend: 18400, leads: 3840, trials: 438, activated: 281, paidConversions: 82, campaignRevenue: 53600 },
  { month: "Jul 2025", mrr: 90200, arr: 1082400, activeCustomers: 584, newCustomers: 53, churnedCustomers: 31, expansionRevenue: 8600, contractionRevenue: 2800, marketingSpend: 19100, leads: 4120, trials: 456, activated: 300, paidConversions: 88, campaignRevenue: 57200 },
  { month: "Aug 2025", mrr: 93600, arr: 1123200, activeCustomers: 612, newCustomers: 57, churnedCustomers: 29, expansionRevenue: 9900, contractionRevenue: 3400, marketingSpend: 20600, leads: 4380, trials: 489, activated: 318, paidConversions: 94, campaignRevenue: 61100 },
  { month: "Sep 2025", mrr: 98100, arr: 1177200, activeCustomers: 641, newCustomers: 61, churnedCustomers: 32, expansionRevenue: 11200, contractionRevenue: 3600, marketingSpend: 21800, leads: 4590, trials: 515, activated: 334, paidConversions: 99, campaignRevenue: 64800 },
  { month: "Oct 2025", mrr: 103400, arr: 1240800, activeCustomers: 681, newCustomers: 72, churnedCustomers: 32, expansionRevenue: 12800, contractionRevenue: 3900, marketingSpend: 23500, leads: 5120, trials: 591, activated: 389, paidConversions: 118, campaignRevenue: 73100 },
  { month: "Nov 2025", mrr: 108900, arr: 1306800, activeCustomers: 717, newCustomers: 69, churnedCustomers: 33, expansionRevenue: 13700, contractionRevenue: 4100, marketingSpend: 24400, leads: 5320, trials: 612, activated: 406, paidConversions: 122, campaignRevenue: 76400 },
  { month: "Dec 2025", mrr: 115600, arr: 1387200, activeCustomers: 756, newCustomers: 76, churnedCustomers: 37, expansionRevenue: 15800, contractionRevenue: 4300, marketingSpend: 27100, leads: 5680, trials: 661, activated: 445, paidConversions: 137, campaignRevenue: 83200 },
  { month: "Jan 2026", mrr: 121200, arr: 1454400, activeCustomers: 794, newCustomers: 75, churnedCustomers: 37, expansionRevenue: 14900, contractionRevenue: 4500, marketingSpend: 28600, leads: 5890, trials: 683, activated: 461, paidConversions: 143, campaignRevenue: 86900 },
  { month: "Feb 2026", mrr: 126800, arr: 1521600, activeCustomers: 831, newCustomers: 74, churnedCustomers: 37, expansionRevenue: 16700, contractionRevenue: 4800, marketingSpend: 29700, leads: 6030, trials: 711, activated: 482, paidConversions: 151, campaignRevenue: 90500 },
  { month: "Mar 2026", mrr: 133700, arr: 1604400, activeCustomers: 874, newCustomers: 82, churnedCustomers: 39, expansionRevenue: 17200, contractionRevenue: 4900, marketingSpend: 31400, leads: 6470, trials: 762, activated: 523, paidConversions: 164, campaignRevenue: 98100 },
  { month: "Apr 2026", mrr: 140900, arr: 1690800, activeCustomers: 919, newCustomers: 84, churnedCustomers: 39, expansionRevenue: 18800, contractionRevenue: 5100, marketingSpend: 33200, leads: 6810, trials: 814, activated: 563, paidConversions: 176, campaignRevenue: 104800 },
  { month: "May 2026", mrr: 134700, arr: 1616400, activeCustomers: 907, newCustomers: 58, churnedCustomers: 70, expansionRevenue: 12100, contractionRevenue: 8100, marketingSpend: 36100, leads: 6940, trials: 802, activated: 471, paidConversions: 119, campaignRevenue: 78200 }
];

const generatedAt = "2026-06-06T08:30:00.000Z";

const segments: SegmentPerformance[] = [
  { segment: "Seed SaaS", customers: 356, mrr: 38200, churnRate: 0.089, netRevenueRetention: 0.91, activationRate: 0.57, note: "High acquisition volume, but onboarding completion fell after pricing-page changes." },
  { segment: "Scale-up SaaS", customers: 241, mrr: 51400, churnRate: 0.041, netRevenueRetention: 1.08, activationRate: 0.74, note: "Best expansion motion and strongest retained revenue quality." },
  { segment: "Marketplaces", customers: 188, mrr: 28900, churnRate: 0.067, netRevenueRetention: 0.98, activationRate: 0.63, note: "Healthy usage, but campaign ROI weakened on paid social." },
  { segment: "Fintech Teams", customers: 123, mrr: 16200, churnRate: 0.052, netRevenueRetention: 1.03, activationRate: 0.69, note: "Stable retention and higher support touch required during onboarding." }
];

const channels: ChannelPerformance[] = [
  { channel: "Organic", spend: 2600, leads: 1480, trials: 189, customers: 38, cac: 68, roi: 7.8, status: "good" },
  { channel: "Partner", spend: 5400, leads: 940, trials: 151, customers: 35, cac: 154, roi: 5.4, status: "good" },
  { channel: "Paid Search", spend: 14200, leads: 2380, trials: 241, customers: 31, cac: 458, roi: 2.1, status: "risk" },
  { channel: "Paid Social", spend: 11900, leads: 2120, trials: 193, customers: 26, cac: 458, roi: 1.8, status: "risk" },
  { channel: "Outbound", spend: 2000, leads: 620, trials: 29, customers: 7, cac: 286, roi: 2.9, status: "watch" }
];

const metricDefinitions: MetricDefinition[] = [
  {
    name: "MRR",
    owner: "Finance Analytics",
    definition: "Monthly recurring revenue from active paid subscriptions, net of discounts and cancellations effective in the month.",
    sql: "sum(case when subscription_status = 'active' then monthly_price_eur - discount_eur else 0 end)"
  },
  {
    name: "Gross Churn Rate",
    owner: "Customer Analytics",
    definition: "Customers churned in the month divided by active customers at the start of the month.",
    sql: "churned_customers / nullif(active_customers_start, 0)"
  },
  {
    name: "Activation Rate",
    owner: "Product Analytics",
    definition: "Trials completing the core onboarding event within seven days divided by all trials started.",
    sql: "activated_trials_d7 / nullif(trials_started, 0)"
  },
  {
    name: "CAC",
    owner: "Growth Analytics",
    definition: "Monthly paid acquisition spend divided by new paid customers attributed to that channel.",
    sql: "marketing_spend_eur / nullif(new_paid_customers, 0)"
  },
  {
    name: "Campaign ROI",
    owner: "Marketing Analytics",
    definition: "Attributed campaign revenue divided by campaign spend for the same monthly cohort.",
    sql: "attributed_revenue_eur / nullif(marketing_spend_eur, 0)"
  }
];

function percentChange(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

function direction(change: number): TrendDirection {
  if (Math.abs(change) < 0.5) return "flat";
  return change > 0 ? "up" : "down";
}

function formatCurrency(value: number, options: { compact?: boolean } = {}) {
  return new Intl.NumberFormat("en-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    notation: options.compact ? "compact" : "standard"
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function makeKpi(label: string, current: number, previous: number, category: MetricCategory, target: string, definition: string, format: "currency" | "number" | "percent" = "number", inverted = false): KpiCard {
  const change = percentChange(current, previous);
  const trend = direction(change);
  const badMove = inverted ? change > 5 : change < -5;
  const watchMove = inverted ? change > 1.5 : change < -1.5;
  const value = format === "currency" ? formatCurrency(current, { compact: true }) : format === "percent" ? formatPercent(current) : new Intl.NumberFormat("en-DE").format(Math.round(current));

  return {
    label,
    value,
    rawValue: current,
    previousValue: previous,
    change,
    direction: trend,
    status: badMove ? "risk" : watchMove ? "watch" : "good",
    category,
    target,
    definition
  };
}

function buildKpis(current: MonthlyRevenueMetric, previous: MonthlyRevenueMetric): KpiCard[] {
  const churnRate = (current.churnedCustomers / (previous.activeCustomers || current.activeCustomers)) * 100;
  const previousChurnRate = (previous.churnedCustomers / monthlyMetrics[monthlyMetrics.length - 3].activeCustomers) * 100;
  const activationRate = (current.activated / current.trials) * 100;
  const previousActivationRate = (previous.activated / previous.trials) * 100;
  const conversionRate = (current.paidConversions / current.trials) * 100;
  const previousConversionRate = (previous.paidConversions / previous.trials) * 100;
  const cac = current.marketingSpend / current.paidConversions;
  const previousCac = previous.marketingSpend / previous.paidConversions;
  const ltv = (current.mrr / current.activeCustomers) / (churnRate / 100);
  const previousLtv = (previous.mrr / previous.activeCustomers) / (previousChurnRate / 100);
  const campaignRoi = current.campaignRevenue / current.marketingSpend;
  const previousCampaignRoi = previous.campaignRevenue / previous.marketingSpend;

  return [
    makeKpi("MRR", current.mrr, previous.mrr, "Revenue", "Target: +4% monthly", "Monthly recurring revenue from active paid subscriptions.", "currency"),
    makeKpi("ARR", current.arr, previous.arr, "Revenue", "Target: EUR 1.75M", "MRR multiplied by 12 for annualized run-rate visibility.", "currency"),
    makeKpi("Gross churn", churnRate, previousChurnRate, "Customer", "Target: below 5.0%", "Churned customers divided by active customers at the start of the month.", "percent", true),
    makeKpi("Activation", activationRate, previousActivationRate, "Funnel", "Target: 68%+", "Trials completing the core onboarding event within seven days.", "percent"),
    makeKpi("Trial to paid", conversionRate, previousConversionRate, "Funnel", "Target: 20%+", "Paid conversions divided by trials started in the month.", "percent"),
    makeKpi("CAC", cac, previousCac, "Efficiency", "Target: below EUR 320", "Marketing spend divided by new paid customers.", "currency", true),
    makeKpi("LTV", ltv, previousLtv, "Efficiency", "Target: EUR 2.7K+", "Average customer MRR divided by monthly gross churn rate.", "currency"),
    makeKpi("Campaign ROI", campaignRoi, previousCampaignRoi, "Efficiency", "Target: 3.0x+", "Attributed campaign revenue divided by campaign spend.", "number")
  ];
}

function buildFunnel(current: MonthlyRevenueMetric): FunnelStep[] {
  return [
    { label: "Leads", value: current.leads, conversionFromPrevious: null, health: "good" },
    { label: "Trials", value: current.trials, conversionFromPrevious: (current.trials / current.leads) * 100, health: "good" },
    { label: "Activated", value: current.activated, conversionFromPrevious: (current.activated / current.trials) * 100, health: "watch" },
    { label: "Paid", value: current.paidConversions, conversionFromPrevious: (current.paidConversions / current.activated) * 100, health: "risk" }
  ];
}

function buildAnomalies(current: MonthlyRevenueMetric, previous: MonthlyRevenueMetric): Anomaly[] {
  const mrrDelta = current.mrr - previous.mrr;
  const churnDelta = current.churnedCustomers - previous.churnedCustomers;
  const activationChange = percentChange(current.activated / current.trials, previous.activated / previous.trials);
  const cacChange = percentChange(current.marketingSpend / current.paidConversions, previous.marketingSpend / previous.paidConversions);

  return [
    {
      metric: "MRR",
      severity: "risk",
      detectedChange: `${formatCurrency(mrrDelta)} month over month (${formatPercent(percentChange(current.mrr, previous.mrr))})`,
      likelyCause: "New paid conversions fell while churned customers increased, so the movement is a real revenue risk rather than a dashboard-only issue.",
      businessImpact: `${formatCurrency(Math.abs(mrrDelta) * 12)} annualized run-rate at risk if May performance repeats.`,
      recommendedAction: "Prioritize churn recovery for Seed SaaS accounts and inspect paid search onboarding journeys before increasing spend."
    },
    {
      metric: "Gross churn",
      severity: "risk",
      detectedChange: `${churnDelta} more churned customers than the previous month`,
      likelyCause: "Churn is concentrated in Seed SaaS customers with weak activation and lower support engagement.",
      businessImpact: "Retention deterioration is reducing LTV and making paid acquisition less efficient.",
      recommendedAction: "Trigger a customer-success save motion for accounts with low core-feature usage in the first 14 days."
    },
    {
      metric: "Activation rate",
      severity: "watch",
      detectedChange: `${formatPercent(activationChange)} relative movement versus April`,
      likelyCause: "The activation drop follows a pricing-page and onboarding-copy change in paid acquisition cohorts.",
      businessImpact: "Lower activation is leaking trial volume before the paid conversion stage.",
      recommendedAction: "Run a funnel cut by acquisition source, device, and onboarding step to locate the exact drop-off point."
    },
    {
      metric: "CAC",
      severity: "risk",
      detectedChange: `${formatPercent(cacChange)} relative CAC increase`,
      likelyCause: "Paid search and paid social spend increased while paid conversions dropped.",
      businessImpact: "Marketing efficiency is below target and risks turning growth spend into negative unit economics.",
      recommendedAction: "Pause the two weakest ad sets, shift budget to partner and organic channels, and reforecast CAC payback."
    }
  ];
}

function buildDataQualityChecks(): DataQualityCheck[] {
  return [
    {
      check: "Warehouse freshness",
      status: "good",
      result: "Latest revenue model loaded 18 minutes ago.",
      owner: "Analytics Engineering",
      impact: "Stakeholders can trust today-facing KPI values."
    },
    {
      check: "Subscription ID uniqueness",
      status: "good",
      result: "0 duplicate active subscription IDs in the May mart.",
      owner: "Data Platform",
      impact: "MRR and ARR are not inflated by duplicate subscriptions."
    },
    {
      check: "Campaign attribution completeness",
      status: "watch",
      result: "2.3% of paid conversions have missing campaign source.",
      owner: "Growth Analytics",
      impact: "Channel ROI is directionally useful, but channel-level budget decisions need caution."
    },
    {
      check: "Trial event reconciliation",
      status: "risk",
      result: "Mobile activation events are 8.1% lower than backend onboarding completions.",
      owner: "Product Analytics",
      impact: "Activation anomaly may be partly tracking-related and needs event reconciliation before final attribution."
    },
    {
      check: "Finance reconciliation",
      status: "good",
      result: "Revenue mart is within 0.6% of finance export.",
      owner: "Finance Analytics",
      impact: "Revenue movement is materially real even with minor attribution gaps."
    }
  ];
}

function buildInsightReport(current: MonthlyRevenueMetric, previous: MonthlyRevenueMetric): InsightReport {
  const mrrChange = percentChange(current.mrr, previous.mrr);
  const churnRate = (current.churnedCustomers / previous.activeCustomers) * 100;
  const paidDrop = percentChange(current.paidConversions, previous.paidConversions);

  return {
    title: "May Revenue Growth Incident Report",
    generatedAt,
    executiveSummary: `RevenuePulse flags May as a growth-risk month: MRR moved ${formatPercent(mrrChange)} month over month, churn rose to ${formatPercent(churnRate)}, and paid conversions moved ${formatPercent(paidDrop)} versus April. The movement is mostly a real business issue, with one tracking caveat around mobile activation events.`,
    findings: [
      "MRR declined while marketing spend increased, which points to weaker acquisition efficiency rather than a planned seasonal dip.",
      "Seed SaaS accounts are the highest-risk customer segment because churn and low activation are concentrated there.",
      "Paid search and paid social have the weakest CAC and ROI profile this month.",
      "Data quality checks show revenue is trustworthy, but mobile activation tracking needs reconciliation before product teams overreact to that specific funnel step."
    ],
    decisions: [
      "Pause low-ROI paid campaigns for one week and reallocate test budget to partner and organic channels.",
      "Launch a customer-success save list for Seed SaaS accounts with low feature usage.",
      "Ask Product Analytics to reconcile mobile activation events with backend onboarding completion logs.",
      "Review pricing-page and onboarding-copy changes before approving June growth spend."
    ],
    risks: [
      "If May repeats, annualized run-rate exposure is material.",
      "Campaign ROI may be understated for unattributed conversions, so spend decisions should use both strict and blended CAC views.",
      "Activation tracking gaps can mislead product prioritization if treated as fully clean."
    ],
    source: "grounded-demo-engine"
  };
}

export function getRevenuePulseSnapshot(): RevenuePulseSnapshot {
  const current = monthlyMetrics[monthlyMetrics.length - 1];
  const previous = monthlyMetrics[monthlyMetrics.length - 2];

  return {
    generatedAt,
    companyContext: {
      company: "Berlin B2B SaaS and marketplace growth case",
      market: "Germany and EU",
      model: "Subscription-led B2B SaaS with paid acquisition and partner channels",
      audience: "Data Analyst, BI Analyst, Business Analyst, Growth Analyst, and Analytics Engineer hiring managers"
    },
    monthlyMetrics,
    kpis: buildKpis(current, previous),
    funnel: buildFunnel(current),
    segments,
    channels,
    anomalies: buildAnomalies(current, previous),
    dataQuality: buildDataQualityChecks(),
    metricDefinitions,
    insightReport: buildInsightReport(current, previous)
  };
}
