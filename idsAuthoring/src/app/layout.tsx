import type { Metadata, Viewport } from "next";
import { Montserrat, Raleway } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { IdsProvider } from "@/contexts/IdsContext";
import Header from "@/sections/Header";

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  variable: "--font-sans",
  display: "swap",
});
const raleway = Raleway({
  subsets: ["latin-ext"],
  variable: "--font-sans2",
  weight: ["100", "300", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "bSTr IDS Tool",
  description: "IDS authoring and checking tool",
};

export const viewport: Viewport = {
  themeColor: "rgb(var(--color-customBg))",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${raleway.variable}`} suppressHydrationWarning>
      <body className="bg-customBg text-textDark antialiased font-sans">
        <LanguageProvider>
          <IdsProvider>
            <Header />
            {children}
          </IdsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
