/** @type {import('next').NextConfig} */
const baseConfig = {
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    serverComponentsExternalPackages: ['socket.io-client'],
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          maxAsyncRequests: 30,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              maxSize: 244000,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              enforce: true,
              maxSize: 244000,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
            },
            tanstack: {
              test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
              name: 'tanstack',
              chunks: 'all',
            },
          },
        },
        usedExports: true,
        sideEffects: false,
      };
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      lodash: 'lodash-es',
    };
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules/,
      type: 'javascript/auto',
      resolve: { fullySpecified: false },
    });
    return config;
  },
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    remotePatterns: [{ protocol: 'https', hostname: 'dd.dexscreener.com' }],
  },
  swcMinify: true,
};

const nextConfig =
  process.env.NODE_ENV === 'production'
    ? {
        ...baseConfig,
        reactStrictMode: false,
        trailingSlash: false,
        experimental: {
          ...baseConfig.experimental,
          memoryBasedWorkersCount: true,
        },
      }
    : baseConfig;

export default nextConfig;
