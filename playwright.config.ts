import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "phone-landscape",
      use: { ...devices["Pixel 7 landscape"] },
    },
  ],
  webServer: {
    // The real static export, independent of any `next dev` running in this folder. Never reused:
    // every run builds and serves the current code, and a server left on the port fails the run
    // loudly instead of silently testing a stale build.
    command: `npm run build && node e2e/serve-static.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
