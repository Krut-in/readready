import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow embedding in iframes (clickjacking protection)
  { key: "X-Frame-Options", value: "DENY" },
  // Enable XSS filter in older browsers
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Limit referrer info sent to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict access to sensitive browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      // Google Books API cover thumbnails (served over both http and https)
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "http",  hostname: "books.google.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
      // Open Library cover images
      { protocol: "https", hostname: "covers.openlibrary.org" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
