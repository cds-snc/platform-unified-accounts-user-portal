import type { NextConfig } from "next";

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
];

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  output: process.env.NEXT_OUTPUT_STANDALONE ? "standalone" : undefined,
  poweredByHeader: false,
  sassOptions: {
    includePaths: ["styles"],
  },
  reactCompiler: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"],
          }
        : false,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.md": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
  ...(process.env.DEBUG && {
    logging: {
      fetches: {
        fullUrl: true,
      },
      serverFunctions: true,
      browserToTerminal: true,
    },
  }),
};

export default nextConfig;
