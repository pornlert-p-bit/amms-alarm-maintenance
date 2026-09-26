import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // ให้ test ใช้ import แบบ "@/lib/..." ได้เหมือนในแอป
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
