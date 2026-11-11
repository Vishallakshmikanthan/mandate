import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MANDATE: The Trust Layer for AI Agents That Spend Money",
  description: "Cryptographic financial firewall and AI-arbitrated escrow layer for autonomous agents using PayPal Orders v2.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070a12] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
