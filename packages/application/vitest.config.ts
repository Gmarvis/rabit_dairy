import { defineConfig } from "vitest/config";

// See packages/domain/vitest.config.ts — resolves ".js" specifiers to ".ts".
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
  test: { include: ["src/**/*.test.ts"] },
});
