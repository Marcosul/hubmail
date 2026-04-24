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

const metadataCopy = {
  "pt-BR": "Webmail e plano de controle para HubMail",
  "en-US": "Webmail and control plane for HubMail",
  "es-ES": "Webmail y plano de control para HubMail",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();

  return {
    title: "HubMail",
    description: metadataCopy[locale],
  };
}

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
