/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly ensure turbo is not being used for the build
  experimental: {
    turbo: {
      // If you had any turbo settings here, remove them
    },
  },
  // This helps Netlify handle the build output correctly
  distDir: '.next', 
};

module.exports = nextConfig;