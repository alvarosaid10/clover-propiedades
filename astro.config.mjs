import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://cloverpropiedades.cl",
  output: "static",
  build: {
    format: "directory"
  }
});
