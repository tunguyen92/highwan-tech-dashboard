/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["mongoose", "bcryptjs", "mongodb-memory-server"],
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["warn", "error"] }
        : false,
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/stock",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
