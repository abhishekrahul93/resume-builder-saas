import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "RevenuePulse - Revenue Growth Analytics Platform"
  },
  description: "SaaS revenue, churn, retention, funnel, CAC, LTV, data quality, anomaly detection, and AI insight reporting demo."
};

export default function RevenuePulseLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
