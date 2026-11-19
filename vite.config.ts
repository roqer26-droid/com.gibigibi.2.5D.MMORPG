import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// `npm run build`        -> parçalı çıktı (phaser ayrı chunk, lazy ekranlar)
// `npm run build:single` -> tek dosyalık index.html (SINGLE_FILE=1)
const singleFile = process.env.SINGLE_FILE === "1";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), ...(singleFile ? [viteSingleFile()] : [])],
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
