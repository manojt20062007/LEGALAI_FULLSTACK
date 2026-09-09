import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { AuthProvider } from "@/components/auth/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "LM-Verify | Legal Metrology Packaged Commodities Compliance",
    template: "%s | LM-Verify",
  },
  description:
    "Automated compliance verification system for Packaged Commodities under Legal Metrology Rules, 2011. Scan product images, detect mandatory label declarations, and verify statutory standards.",
  keywords: [
    "Legal Metrology",
    "Packaged Commodities Rules 2011",
    "LMPC Compliance",
    "Label Verification",
    "Consumer Protection",
    "OCR Compliance",
  ],
  authors: [{ name: "LM-Verify Team" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col pb-16 md:pb-0">{children}</main>
          <Footer />
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}
