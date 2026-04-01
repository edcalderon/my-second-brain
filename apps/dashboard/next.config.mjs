import fs from 'fs';
import path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';
const dashboardBasePath = isDevelopment ? '' : '/my-second-brain';
const dashboardAssetPrefix = dashboardBasePath ? `${dashboardBasePath}/` : undefined;

let edwardVersion = process.env.NEXT_PUBLIC_EDWARD_VERSION || "unknown";
let aQuantVersion = process.env.NEXT_PUBLIC_A_QUANT_VERSION || "unknown";

try {
  const edwardPkgPath = path.resolve(process.cwd(), '../../package.json');
  edwardVersion = JSON.parse(fs.readFileSync(edwardPkgPath, 'utf-8')).version;
} catch (e) {
  console.warn("Could not read Edward version from package.json");
}

try {
  const aQuantPkgPath = path.resolve(process.cwd(), '../../../a-quant/package.json');
  aQuantVersion = JSON.parse(fs.readFileSync(aQuantPkgPath, 'utf-8')).version;
} catch (e) {
  // A-Quant is a separate repo — not available in CI. Use env var fallback.
  aQuantVersion = process.env.NEXT_PUBLIC_A_QUANT_VERSION || aQuantVersion;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_EDWARD_VERSION: edwardVersion,
    NEXT_PUBLIC_A_QUANT_VERSION: aQuantVersion,
    NEXT_PUBLIC_DASHBOARD_BASE_PATH: dashboardBasePath,
    NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN || (isDevelopment ? "http://localhost:3000" : "https://edcalderon.io"),
  },
  output: 'export',
  trailingSlash: true,
  basePath: dashboardBasePath || undefined,
  assetPrefix: dashboardAssetPrefix,
  turbopack: {
    root: '../../',
  },
  async redirects() {
    if (isDevelopment) {
      return [
        {
          source: '/my-second-brain',
          destination: '/',
          permanent: false,
        },
        {
          source: '/my-second-brain/:path*',
          destination: '/:path*',
          permanent: false,
        },
        {
          source: '/documentation/:path*',
          destination: 'http://localhost:3001/my-second-brain/documentation/:path*',
          permanent: false,
        },
      ];
    }
    return [];
  },
  async rewrites() {
    return [];
  },
  // Exclude API routes from static export
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  /* config options here */
};

export default nextConfig;
