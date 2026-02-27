import fs from 'fs';
import path from 'path';

let edwardVersion = "unknown";
let aQuantVersion = "unknown";

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
  console.warn("Could not read A-Quant version from package.json");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_EDWARD_VERSION: edwardVersion,
    NEXT_PUBLIC_A_QUANT_VERSION: aQuantVersion,
  },
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
