import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/program", destination: "/", permanent: true },
      { source: "/program/:path+", destination: "/:path+", permanent: true },
    ];
  },
};

export default nextConfig;
