---
name: Bundled server DATA_DIR resolution
description: Why relative-to-__dirname data paths silently break once a Node server is bundled by esbuild into a single flat output file.
---

Do not compute filesystem paths (data dirs, config dirs, asset dirs) using
`path.join(__dirname, "../../something")` where `__dirname` is derived from
`import.meta.url` inside a server that gets bundled by esbuild (or similar
bundlers) into a single flat output file.

**Why:** In dev, source files live in nested folders (e.g. `src/lib/store.ts`),
so `__dirname` correctly resolves relative to that nested depth. But esbuild's
`bundle: true` concatenates every module into one flat file at the output
location (e.g. `dist/index.mjs`). Once bundled, `import.meta.url` for every
module — no matter how deeply nested the original source was — resolves to
that single flat file's location. Any `"../../"` relative path baked into the
source silently resolves to the wrong directory (typically one or more levels
too high), with no error — it just reads/writes an empty or stale directory
next to the intended one. This produced a real bug: a server thought it was
reading `artifacts/api-server/data/` but was actually reading/writing
`artifacts/data/` once running from the built bundle, causing data set by one
code path to "disappear" from another.

**How to apply:** For any path that must stay stable across dev and a bundled
production build, derive it from `process.cwd()` instead (assuming the
process is always launched with cwd set to the package root — true for
`pnpm --filter <pkg> run <script>` in this workspace), not from
`__dirname`/`import.meta.url`. If you see data that "should" exist but the
app claims it's missing (or two copies of similar data files exist in sibling
directories), suspect this class of bug first — check where the bundled
entrypoint actually lives and where its computed `__dirname` would land.
