#!/usr/bin/env node
// Post-export fix for Vercel static deploys of the Expo web bundle.
//
// Vercel silently drops any file living under a directory segment named
// `node_modules` when uploading a static deployment. Expo renames the ROOT
// node_modules to `__node_modules` (safe), but @expo/vector-icons fonts are
// emitted under an INNER, un-renamed `node_modules` segment:
//
//   dist/assets/__node_modules/.pnpm/@expo+vector-icons@.../node_modules/
//       @expo/vector-icons/build/vendor/.../Fonts/Ionicons.<hash>.ttf
//                          ^^^^^^^^^^^^^ stripped by Vercel
//
// So every icon font 404s -> the SPA rewrite serves index.html -> the browser
// gets HTML for a .ttf -> "OTS parsing error: invalid sfntVersion" -> icons
// render as blank squares.
//
// Fix: rewrite the inner `/node_modules/` segment to `/nm/` both on disk (move
// the files) and inside the JS/CSS/HTML asset references. `__node_modules`
// (double underscore) is left untouched — the substring `/node_modules/` never
// matches `/__node_modules/`, so only the inner segment is rewritten.
//
// Idempotent: re-running on an already-flattened dist is a no-op.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const TEXT_EXTS = new Set(['.js', '.css', '.html', '.json', '.map']);
// Only rewrite `/node_modules/` that lives inside an Expo asset token, so we can
// never corrupt an unrelated runtime string that happens to contain the path.
const ASSET_TOKEN_RE = /__node_modules\/\.pnpm\/[^"'`)\s]*/g;

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function removeEmptyDirs(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) await removeEmptyDirs(path.join(dir, entry.name));
  }
  if ((await fs.readdir(dir)).length === 0) await fs.rmdir(dir);
}

async function main() {
  const distDir = path.resolve(process.argv[2] ?? 'dist');
  const files = await walk(distDir);

  // Phase 1 — move files out of inner `node_modules` segments.
  let moved = 0;
  for (const file of files) {
    const rel = path.relative(distDir, file);
    if (!rel.includes(`${path.sep}node_modules${path.sep}`)) continue;
    const newRel = rel.split(path.sep).map((seg) => (seg === 'node_modules' ? 'nm' : seg)).join(path.sep);
    const dest = path.join(distDir, newRel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.rename(file, dest);
    moved++;
  }

  // Phase 2 — patch references inside text bundles (scoped to asset tokens).
  let patchedFiles = 0;
  let patchedRefs = 0;
  for (const file of await walk(distDir)) {
    if (!TEXT_EXTS.has(path.extname(file))) continue;
    const content = await fs.readFile(file, 'utf8');
    let fileRefs = 0;
    const next = content.replace(ASSET_TOKEN_RE, (token) => {
      const fixed = token.replaceAll('/node_modules/', '/nm/');
      if (fixed !== token) fileRefs++;
      return fixed;
    });
    if (fileRefs > 0) {
      await fs.writeFile(file, next);
      patchedFiles++;
      patchedRefs += fileRefs;
    }
  }

  await removeEmptyDirs(distDir);

  console.log(
    `[flatten-vercel-assets] moved ${moved} file(s) out of node_modules; ` +
      `patched ${patchedRefs} ref(s) across ${patchedFiles} bundle(s).`,
  );
  if (moved === 0 && patchedRefs === 0) {
    console.log('[flatten-vercel-assets] nothing to do (already flat).');
  }
}

main().catch((err) => {
  console.error('[flatten-vercel-assets] FAILED:', err);
  process.exit(1);
});
