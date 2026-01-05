/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/my-second-brain',
  assetPrefix: '/my-second-brain/',
  turbopack: {
    root: '../../',
  },
  async redirects() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/documentation/:path*',
          destination: 'http://localhost:3001/my-second-brain/documentation/:path*',
          permanent: false,
        },
      ];
    }
    return [];
  },
  // Exclude API routes from static export
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  /* config options here */
};

export default nextConfig;
