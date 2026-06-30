/**
 * Validates that no file in artifacts/ imports directly from the generated
 * internals of @workspace/api-client-react (i.e. from paths containing
 * /src/generated/ or /generated/api). All consumers must import from the
 * package root barrel instead.
 *
 * Run via: pnpm --filter @workspace/scripts run check-deep-imports
 * Or at the root:  pnpm run validate:imports
 */

import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DEEP_IMPORT_PATTERN =
  /from\s+['"]@workspace\/api-client-react\/.*generated/;

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "../../");

const rawOutput = execSync(
  'grep -rn --include="*.ts" --include="*.tsx" ' +
    '"@workspace/api-client-react/" ' +
    `"${workspaceRoot}/artifacts/" "${workspaceRoot}/lib/"`,
  { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
).trim();

if (!rawOutput) {
  console.log("check-deep-imports: no @workspace/api-client-react imports found — OK");
  process.exit(0);
}

const violations: string[] = [];

for (const line of rawOutput.split("\n")) {
  if (DEEP_IMPORT_PATTERN.test(line)) {
    violations.push(line);
  }
}

if (violations.length === 0) {
  console.log(
    "check-deep-imports: all @workspace/api-client-react imports use the barrel — OK"
  );
} else {
  console.error(
    "check-deep-imports: deep imports into generated internals detected.\n" +
      "Import from '@workspace/api-client-react' instead:\n"
  );
  for (const v of violations) {
    console.error("  " + v);
  }
  process.exit(1);
}
