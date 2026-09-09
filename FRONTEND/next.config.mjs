/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      }
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/:path*`, // Proxy to AWS Backend
      },
    ];
  },
};

export default nextConfig;
