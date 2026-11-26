import assert from "node:assert/strict";
import test from "node:test";
import { hasActiveSession } from "./session-time.ts";
import { build } from "esbuild";

test("permanent access never spends purchased time; ordinary expired hosts remain blocked", async () => {
  const result = await build({
    entryPoints: [new URL("./host-access.ts", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")],
    bundle: true, write: false, platform: "node", format: "esm",
    plugins: [{ name: "reject-credit-spend", setup(builder) {
      builder.onLoad({ filter: /[\\/]store\.ts$/ }, () => ({
        contents: 'export const store = { hosts: { activatePaidSession() { throw new Error("Unexpected credit deduction"); } } };',
        loader: "js",
      }));
    } }],
  });
  const { ensureHostSession } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
  const permanent = { permanentTestAccess: true, remainingMinutes: 0, activeSessionEndsAt: null };
  assert.equal(await ensureHostSession(permanent), permanent);
  assert.equal(await ensureHostSession({ ...permanent, permanentTestAccess: false }), null);
});

test("permanent test access works without credit or an expiry, even in the far future", () => {
  assert.equal(hasActiveSession({ permanentTestAccess: true, activeSessionEndsAt: null }, Date.parse("2100-01-01")), true);
  assert.equal(hasActiveSession({ permanentTestAccess: true, activeSessionEndsAt: "2000-01-01" }), true);
});

test("ordinary hosts still need an unexpired session", () => {
  const now = Date.parse("2026-11-26T12:00:00Z");
  assert.equal(hasActiveSession({ permanentTestAccess: false, activeSessionEndsAt: null }, now), false);
  assert.equal(hasActiveSession({ activeSessionEndsAt: "2026-11-26T12:00:00Z" }, now), false);
  assert.equal(hasActiveSession({ activeSessionEndsAt: "2026-11-26T12:00:01Z" }, now), true);
});
