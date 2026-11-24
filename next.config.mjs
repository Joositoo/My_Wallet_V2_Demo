/** @type {import('next').NextConfig} */
// En GitHub Pages el sitio vive en /<repo>; el workflow define NEXT_PUBLIC_BASE_PATH.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  basePath,
  reactCompiler: true,
  // Sitio 100 % estático: no hay servidor ni base de datos
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
