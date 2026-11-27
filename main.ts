// FridayList hand-in: copies app/ and screenshots/ from this repository into
// the output directory and writes dossier.json there with buildDossier from
// the kit's vendored library. Node standard library only; no network.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 16 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

mkdirSync(outDir, { recursive: true });
for (const dir of ["app", "screenshots"]) {
  rmSync(join(outDir, dir), { recursive: true, force: true });
  cpSync(join(repoRoot, dir), join(outDir, dir), { recursive: true });
}

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, "dossier.json"), dossier);
console.log("Wrote dossier.json (" + dossier.length + " bytes) to " + outDir);
