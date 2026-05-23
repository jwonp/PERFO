import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "perfo.amaneta.me", pathname: "/api/**" },
      { protocol: "http", hostname: "localhost", pathname: "/api/**" },
    ],
  },
  experimental: {
    authInterrupts: true,
  },
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(withNextIntl(nextConfig));
