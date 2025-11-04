/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@heroui/system",
    "@heroui/theme",
    "@heroui/dom-animation",
    "@heroui/react-utils",
    "@heroui/framer-utils",
    "framer-motion",
  ],
  async redirects() {
    return [
      {
        source: "/users",
        destination: "/settings/users",
        statusCode: 301,
      },
      {
        source: "/settings",
        destination: "/settings/app",
        statusCode: 301,
      },
    ];
  },
};

module.exports = nextConfig;
