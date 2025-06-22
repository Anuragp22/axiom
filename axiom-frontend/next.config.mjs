/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.rawpixel.com',
      },
    ],
  },
};

export default nextConfig;
