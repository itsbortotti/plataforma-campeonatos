import type { Metadata, Viewport } from "next";
import { Bebas_Neue, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BrandProvider } from "@/components/BrandProvider";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { apiGet } from "@/lib/api-server";
import { DEFAULT_BRAND, type SystemBrand } from "@/lib/brand";
import { SITE_URL } from "@/lib/seo";

/**
 * O layout continua dinâmico para o build Docker não depender da API no ar.
 * Leituras públicas anônimas usam revalidate/tags em `api.ts`; súmula e admin não.
 */
export const dynamic = "force-dynamic";

const display = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

async function loadBrand(): Promise<SystemBrand> {
  try {
    const settings = await apiGet<SystemBrand>("/api/settings");
    return { ...DEFAULT_BRAND, ...settings };
  } catch {
    return DEFAULT_BRAND;
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#15244F",
};

export async function generateMetadata(): Promise<Metadata> {
  const brand = await loadBrand();
  const title = `${brand.siteName} — ${brand.tagline}`;
  const description = brand.description ?? brand.tagline;
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s · ${brand.siteName}`,
    },
    description,
    applicationName: brand.siteName,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: "/",
      siteName: brand.siteName,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: brand.siteName,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brand = await loadBrand();

  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${sans.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#15244F" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <BrandProvider value={brand}>
            {children}
            <Toaster position="bottom-right" />
            <ServiceWorkerRegister />
            <PWAInstallPrompt />
          </BrandProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
