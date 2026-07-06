import { defineConfig } from "vitest/config";

/**
 * The source uses explicit ".js" import specifiers (the NodeNext/Bundler
 * convention that points at the sibling ".ts" at build time). This tiny
 * resolver lets Vitest load them by stripping the extension so Vite's default
 * resolution finds the ".ts" file.
 */
export default defineConfig({
  plugins: [
    {
      name: "js-specifier-to-ts",
      enforce: "pre",
      async resolveId(source, importer) {
        if (importer && source.startsWith(".") && source.endsWith(".js")) {
          const resolved = await this.resolve(source.slice(0, -3), importer, {
            skipSelf: true,
          });
          if (resolved) return resolved;
        }
        return null;
      },
    },
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
