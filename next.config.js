/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuração para API routes (Next.js 14)
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  // Excluir arquivos grandes do build
  outputFileTracingExcludes: {
    '*': [
      'uploads/**/*',
      'telegram_bots/**/*',
      'node_modules/@swc/core-linux-x64-gnu/**/*',
      'node_modules/@swc/core-linux-x64-musl/**/*',
      'node_modules/@esbuild/linux-x64/**/*',
    ],
  },
}

module.exports = nextConfig
