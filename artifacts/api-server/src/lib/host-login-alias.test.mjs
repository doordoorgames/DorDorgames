import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

test("short host usernames resolve only through their unique login alias", async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("./store.ts", import.meta.url))],
    bundle: true, write: false, platform: "node", format: "esm",
    plugins: [{ name: "mock-database", setup(builder) {
      builder.onResolve({ filter: /^@workspace\/db$/ }, () => ({ path: "database", namespace: "test" }));
      builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
        contents: `export const queries=[]; export const pool={async query(sql,params){queries.push({sql,params});return {rows:sql.includes('login_alias') && params[0].toLowerCase()==='test99' ? [{id:'demo-host',permanent_test_access:true}] : []};}};`,
        loader: "js",
      }));
    } }],
  });
  const { store } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
  assert.equal((await store.hosts.getByIdentifier("Test99"))?.id, "demo-host");
  assert.equal((await store.hosts.getByIdentifier("test99"))?.permanentTestAccess, true);
  assert.equal(await store.hosts.getByIdentifier("Other99"), undefined);
});
