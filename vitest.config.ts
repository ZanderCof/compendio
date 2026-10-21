import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // Lo stesso alias di tsconfig: permette di testare anche file che importano "@/..."
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
  },
})
