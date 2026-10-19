import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { adminSavePlugin } from "./vite-plugins/adminSavePlugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), adminSavePlugin()],
  server: {
    port: 5175,
    watch: {
      ignored: [
        "**/src/data/models.json*",
        "**/src/data/finishPresets.json*",
        "**/src/data/partAliases.json*",
        "**/public/models/**",
      ],
    },
  },
});
