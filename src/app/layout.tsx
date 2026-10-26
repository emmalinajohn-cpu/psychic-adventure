import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Pacific Watchmen | Pacific Security Intelligence", template: "%s | Pacific Watchmen" },
  description:
    "A restricted-access regional intelligence and analytical capability supporting evidence-based understanding of climate, maritime, cyber, economic and strategic security developments across the Pacific.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
