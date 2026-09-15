/** @type {import('next').NextConfig} */
module.exports = {
  // I JSON di contenuti/ vengono letti a runtime dalle route: vanno inclusi nel
  // bundle delle funzioni, altrimenti su Vercel la cartella non esiste.
  experimental: {
    outputFileTracingIncludes: {
      '/api/pubblica': ['./contenuti/**'],
      '/api/verifica': ['./contenuti/**'],
      '/api/cron': ['./contenuti/**'],
    },
  },
}
