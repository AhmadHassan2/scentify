import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import { AppProvider } from "@/components/providers/app-provider";
import { AssistantWidget } from "@/components/chatbot/assistant-widget";
import { CompareTray } from "@/components/layout/compare-tray";
import { DemoBanner } from "@/components/layout/demo-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { TooltipProvider } from "@/components/ui/overlays";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif-display",
  display: "swap",
});
const sans = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Scentify — Find the fragrance that's unmistakably you", template: "%s · Scentify" },
  description:
    "Personalized fragrance discovery: a taste quiz, transparent match scores, weather-aware daily picks, budget finder and a fragrance assistant.",
};

export const viewport: Viewport = {
  themeColor: "#f4f0e8",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-ink">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-ivory focus:px-4 focus:py-2 focus:text-ink">
          Skip to content
        </a>
        <Toaster>
          <TooltipProvider>
            <AppProvider>
              <DemoBanner />
              <SiteHeader />
              <main id="main" className="min-h-[60vh]">
                {children}
              </main>
              <SiteFooter />
              <CompareTray />
              <AssistantWidget />
            </AppProvider>
          </TooltipProvider>
        </Toaster>
      </body>
    </html>
  );
}
