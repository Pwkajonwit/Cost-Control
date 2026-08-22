process.env.SUPABASE_DISABLE_NODE_WARNING = "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"]
  }
};

export default nextConfig;
