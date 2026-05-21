import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://clover-propiedades.cl",
  output: "static",
  build: {
    format: "directory"
  }
});
