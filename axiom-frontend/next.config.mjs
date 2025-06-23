/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Enable modern bundling
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    
    // Optimize server components
    serverComponentsExternalPackages: ['socket.io-client'],
  },

  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Enable webpack optimization
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
              maxSize: 244000, // 244KB max chunk size
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              enforce: true,
              maxSize: 244000,
            },
            // Separate large libraries
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
        // Improve tree shaking
        usedExports: true,
        sideEffects: false,
      };
    }

    // Optimize bundle size and tree shaking
    config.resolve.alias = {
      ...config.resolve.alias,
      // Tree-shake lodash
      'lodash': 'lodash-es',
    };

    // Improve tree shaking for ES modules
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.rawpixel.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
      },
    ],
  },

  // Enable SWC minification for better performance
  swcMinify: true,

  // Optimize production builds
  ...(process.env.NODE_ENV === 'production' && {
    // Disable development features in production
    reactStrictMode: false,
    
    // Enable static optimization
    trailingSlash: false,
    
    // Reduce memory usage
    experimental: {
      ...nextConfig.experimental,
      memoryBasedWorkersCount: true,
    },
  }),


};

export default nextConfig;
