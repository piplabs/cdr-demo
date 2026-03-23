import webpack from "next/dist/compiled/webpack/webpack.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    // The Emscripten-generated WASM glue code dynamically imports node:module,
    // node:fs, etc. only in Node.js environments. Tell webpack to ignore these
    // in client bundles so the static analysis doesn't fail.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        module: false,
        fs: false,
        path: false,
        url: false,
        crypto: false,
      };
      config.plugins.push(
        new webpack.webpack.IgnorePlugin({
          resourceRegExp: /^node:/,
        }),
      );
    }

    return config;
  },
};

export default nextConfig;
