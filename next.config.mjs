/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only packages on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        zlib: false,
        http: false,
        https: false,
        async_hooks: false,
        dns: false,
        util: false,
        url: false,
        querystring: false,
        'pg-native': false,
      };
      
      // Exclude server-only packages from client bundle
      config.externals = config.externals || [];
      config.externals.push({
        'pg': 'pg',
        'pg-native': 'pg-native',
        'firebase-admin': 'firebase-admin',
      });
    }
    return config;
  },
}

export default nextConfig
