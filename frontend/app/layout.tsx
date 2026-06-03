import type { Metadata, Viewport } from "next";
import ThemeScript from "@/components/providers/ThemeScript";
import { getSiteUrl, siteName } from "@/lib/site";
import type { RootLayoutProps } from "./layout.types";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  applicationName: siteName,
  description: "Premium ticketing flows, booking pages, and operational tooling by PERFO.",
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description: "Premium ticketing flows, booking pages, and operational tooling by PERFO.",
    images: [
      {
        url: "/logo_perfo.png",
        alt: `${siteName} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: "Premium ticketing flows, booking pages, and operational tooling by PERFO.",
    images: ["/logo_perfo.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteName,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#103783" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1729" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const RootLayout = ({
  children,
}: Readonly<RootLayoutProps>) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
