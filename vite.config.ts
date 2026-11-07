// export default defineConfig({
//   tanstackStart: {
//     // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
//     // nitro/vite builds from this
//     server: { entry: "server" },
//   },
// });

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const djangoTarget = env["VITE_DJANGO_ORIGIN"] || "https://onehealth.kalro.org";
  return {
    plugins: [tailwindcss(), viteReact()],
    resolve: { tsconfigPaths: true },
    server: {
      proxy: {
        "/api": { target: djangoTarget, changeOrigin: true },
        "/media": { target: djangoTarget, changeOrigin: true },
      },
    },
  };
});
