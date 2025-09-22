/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self';",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;", 
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.supabase.co https://demotiles.maplibre.org;",
      "connect-src 'self' https://tile.openstreetmap.org https://*.supabase.co https://*.supabase.in https://demotiles.maplibre.org data: blob:;",
      "worker-src 'self' blob:;",
      "font-src 'self' data: https://demotiles.maplibre.org;",
      "frame-ancestors 'self';",
    ].join(" "),
  },
];

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

module.exports = nextConfig;