import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/i18n/client";
import { getServerLocale } from "@/i18n/server";
import { HubmailQueryProvider } from "@/lib/query-client";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HubMail",
  description: "Webmail and control plane for HubMail",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className={`${geistSans.className} min-h-screen font-sans antialiased`}>
        <LocaleProvider initialLocale={locale}>
          <ThemeProvider>
            <HubmailQueryProvider>{children}</HubmailQueryProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
