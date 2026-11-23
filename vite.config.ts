import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { readFileSync } from "fs";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// `npm run build`        -> parçalı çıktı (phaser ayrı chunk, lazy ekranlar)
// `npm run build:single` -> tek dosyalık index.html (SINGLE_FILE=1)
const singleFile = process.env.SINGLE_FILE === "1";
// `npm run build:artifact` -> tek dosya, ancak kahraman bekleme/savaş sheet'leri index.html yanında ayrı dosya: yalnızca seçili kahramanınki
// yüklenir; Artifact önizlemesi tek dosya boyut sınırının altında kalır (SINGLE_FILE=1 SPLIT_SHEETS=1)
const splitSheets = singleFile && process.env.SPLIT_SHEETS === "1";
const SHEET_DIRS = /[\\/]art[\\/]heroes-(idle|combat)[\\/]/;

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8"));

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    ...(singleFile ? [viteSingleFile()] : []),
    ...(splitSheets
      ? [
          {
            name: "split-hero-sheets",
            enforce: "post",
            config(config) {
              config.build = config.build ?? {};
              config.build.assetsInlineLimit = (file: string) => !SHEET_DIRS.test(file);
              config.build.assetsDir = "";
            },
          } satisfies Plugin,
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: singleFile
        ? undefined
        : {
            manualChunks: (id: string) => {
              if (id.includes("node_modules/phaser")) return "phaser";
              if (id.includes("node_modules/react")) return "react";
              return undefined;
            },
          },
    },
  },
});
