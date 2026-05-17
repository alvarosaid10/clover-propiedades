import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://cloverpropiedades.cl",
  base: "./",
  output: "static",
  build: {
    format: "directory"
  }
});
