#!/usr/bin/env node
// Post-export fix for Vercel static deploys of the Expo web bundle.
//
// Vercel drops two kinds of paths when uploading a static deployment:
//   1. anything under a directory segment named `node_modules`, and
//   2. anything under a directory whose name starts with a dot (`.git`,
//      `.vercel`, ... and crucially `.pnpm`).
//
// In a pnpm monorepo, @expo/vector-icons fonts are emitted under BOTH:
//
//   dist/assets/__node_modules/.pnpm/@expo+vector-icons@.../node_modules/
//       @expo/vector-icons/build/vendor/.../Fonts/Ionicons.<hash>.ttf
//                          ^^^^^      ^^^^^^^^^^^^^ both stripped by Vercel
//
// `__node_modules` (double underscore) is fine — only the LEADING-DOT `.pnpm`
// and the inner `node_modules` segments get dropped. The result: every icon
// font 404s -> the SPA rewrite returns index.html -> the browser receives HTML
// for a .ttf -> "OTS parsing error: invalid sfntVersion" -> icons render blank.
//
// Fix: sanitize directory segments so no path component is `node_modules` or
// starts with a dot, both on disk (move the files) and inside the JS/CSS/HTML
// asset references. Filenames (last path segment) are never touched, so hashes
// and extensions are preserved. Idempotent.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const TEXT_EXTS = new Set(['.js', '.css', '.html', '.json', '.map']);
// Match an Expo asset token so we only rewrite path strings, never unrelated
// runtime strings. Tokens start at the renamed root and run to a delimiter.
const ASSET_TOKEN_RE = /__node_modules\/[^"'`)\s]*/g;

// Map a single DIRECTORY segment to a Vercel-safe name. Filenames are excluded
// by the callers (they only pass directory segments).
function safeDirSegment(seg) {
  if (seg === 'node_modules') return 'nm';
  if (seg.startsWith('.')) return `_${seg.slice(1)}`; // .pnpm -> _pnpm
  return seg;
}

// Rewrite every directory segment of a "/"-joined path, leaving the final
// segment (the filename) untouched.
function sanitizePath(p, sep = '/') {
  const parts = p.split(sep);
  const last = parts.length - 1;
  return parts.map((seg, i) => (i === last ? seg : safeDirSegment(seg))).join(sep);
}

function needsRewrite(relPath) {
  const dirs = relPath.split(path.sep).slice(0, -1);
  return dirs.some((seg) => seg === 'node_modules' || seg.startsWith('.'));
}

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

  // Phase 1 — move files out of node_modules / dot-directory segments.
  let moved = 0;
  for (const file of await walk(distDir)) {
    const rel = path.relative(distDir, file);
    if (!needsRewrite(rel)) continue;
    const dest = path.join(distDir, sanitizePath(rel, path.sep));
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
      const fixed = sanitizePath(token, '/');
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
    `[flatten-vercel-assets] moved ${moved} file(s) out of node_modules/dot-dirs; ` +
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
