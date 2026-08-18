import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `turbopack.root` is pinned because the repo can be checked out inside a
 * directory that has its own lockfile; without it Turbopack walks up and
 * infers the wrong workspace root.
 */
const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
