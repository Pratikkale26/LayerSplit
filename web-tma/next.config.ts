import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // // ============================================================
  // // DEVELOPMENT ONLY CONFIG - Comment out for production
  // // ============================================================

  // // Allow ngrok origin for development tunneling
  // // DEVELOPMENT: Use your ngrok URL here
  // // PRODUCTION: Comment out this entire experimental block
  // experimental: {
  //   allowedDevOrigins: ["artistic-marcelene-parodiable.ngrok-free.dev"],
  // } as any,

  // devIndicators: {
  //   position: 'bottom-right',
  // },

  // // WebSocket config for ngrok HMR
  // // DEVELOPMENT: Use your ngrok URL here
  // // PRODUCTION: Comment out this entire webpack block
  // webpack: (config, { dev, isServer }) => {
  //   if (dev && !isServer) {
  //     config.devServer = {
  //       ...config.devServer,
  //       client: {
  //         webSocketURL: 'wss://artistic-marcelene-parodiable.ngrok-free.dev/_next/webpack-hmr',
  //       },
  //     };
  //   }
  //   return config;
  // },

  // ============================================================
  // API REWRITES - Works for both dev and prod
  // ============================================================
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // DEVELOPMENT: Uses localhost:3001 (default)
        // PRODUCTION: Set BACKEND_URL env var in Vercel/Render to your API URL
        // Example: BACKEND_URL=https://layersplit-api.onrender.com
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;