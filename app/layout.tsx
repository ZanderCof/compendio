import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ThemeProvider } from "@/components/theme/themeProvider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const nodesto = localFont({
  variable: "--font-sans",
  src: [
    { path: "./fonts/NodestoCapsCondensed-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/NodestoCapsCondensed-Italic.otf", weight: "400", style: "italic" },
    { path: "./fonts/NodestoCapsCondensed-Bold.otf", weight: "700", style: "normal" },
    { path: "./fonts/NodestoCapsCondensed-BoldItalic.otf", weight: "700", style: "italic" },
  ],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Compendio",
  description: "Schede dei personaggi e lanci di dadi per il tuo gruppo di D&D",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      // next-themes aggiunge la classe del tema prima che React parta: la differenza è voluta
      suppressHydrationWarning
      className={`${nodesto.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <Navbar />
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer />
          <Toaster position="top-center" offset={72} mobileOffset={64} />
        </ThemeProvider>
      </body>
    </html>
  );
}
