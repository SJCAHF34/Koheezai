// Builds the Microsoft Teams app package (.zip) by substituting environment
// values into manifest.json and bundling it with the icon files.
//
// Usage:
//   AAD_APP_CLIENT_ID=... TEAMS_APP_ID=... APP_DOMAIN=... node teams/build-package.mjs
//
// Output: teams/dist/koheez-teams.zip

import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const REQUIRED = ["AAD_APP_CLIENT_ID", "TEAMS_APP_ID", "APP_DOMAIN"];
const missing = REQUIRED.filter((k) => !process.env[k] || !process.env[k].trim());
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const values = {
  AAD_APP_CLIENT_ID: process.env.AAD_APP_CLIENT_ID.trim(),
  TEAMS_APP_ID: process.env.TEAMS_APP_ID.trim(),
  APP_DOMAIN: process.env.APP_DOMAIN.trim(),
};

let manifest = readFileSync(resolve(__dirname, "manifest.json"), "utf-8");
for (const [key, val] of Object.entries(values)) {
  manifest = manifest.split(`{{${key}}}`).join(val);
}

// Sanity check: no placeholders left.
const leftover = manifest.match(/\{\{[^}]+\}\}/g);
if (leftover) {
  console.error(`Unsubstituted placeholders remain: ${leftover.join(", ")}`);
  process.exit(1);
}
// Validate JSON.
JSON.parse(manifest);

const distDir = resolve(__dirname, "dist");
if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
const builtManifest = resolve(distDir, "manifest.json");
writeFileSync(builtManifest, manifest);

let archiver;
try {
  archiver = require("archiver");
} catch {
  console.log("\nManifest written to:", builtManifest);
  console.log(
    "`archiver` is not installed, so the .zip was not created automatically.",
  );
  console.log(
    "Zip these three files together to create the package:\n" +
      `  - ${builtManifest}\n` +
      `  - ${resolve(__dirname, "color.png")}\n` +
      `  - ${resolve(__dirname, "outline.png")}`,
  );
  process.exit(0);
}

const zipPath = resolve(distDir, "koheez-teams.zip");
const output = createWriteStream(zipPath);
const archive = archiver("zip", { zlib: { level: 9 } });
output.on("close", () => {
  console.log(`Package created: ${zipPath} (${archive.pointer()} bytes)`);
});
archive.on("error", (err) => {
  throw err;
});
archive.pipe(output);
archive.append(manifest, { name: "manifest.json" });
archive.file(resolve(__dirname, "color.png"), { name: "color.png" });
archive.file(resolve(__dirname, "outline.png"), { name: "outline.png" });
archive.finalize();
