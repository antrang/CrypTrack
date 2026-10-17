import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const __dirname = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
      exclude: ["node_modules", ".next", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
