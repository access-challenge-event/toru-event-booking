import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 3000,
    hmr: {
      host: "localhost",
      port: 3000
    }
  }
});
