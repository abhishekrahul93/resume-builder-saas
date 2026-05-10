import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Contract Review for Indian SMEs",
  description: "Review vendor agreements, NDAs, payment clauses, MSME exposure, DPDP gaps, GST issues, and negotiation risks before signing."
};

export default function ContractLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
