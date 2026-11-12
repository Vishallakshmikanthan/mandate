import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mandate. — The Trust Layer for AI Agents That Spend Money",
  description: "Cryptographic financial firewall and AI-arbitrated escrow layer for autonomous agents using PayPal Orders v2.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-[#080b10] text-[#f4f4f5] antialiased selection:bg-white selection:text-black">
        {children}
      </body>
    </html>
  );
}
