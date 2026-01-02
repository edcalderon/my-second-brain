/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/my-second-brain',
  assetPrefix: '/my-second-brain/',
  async redirects() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/documentation/:path*',
          destination: 'http://localhost:3001/:path*',
          permanent: false,
        },
      ];
    }
    return [];
  },
  /* config options here */
};

export default nextConfig;
