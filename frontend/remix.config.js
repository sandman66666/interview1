/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  // Enable React Router v7 future flags
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_skipActionErrorRevalidation: true,
  },
  // Vite configuration
  serverModuleFormat: "esm",
  tailwind: true,
  postcss: true,
};