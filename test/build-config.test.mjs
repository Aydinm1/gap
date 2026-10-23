import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));

test("install-script approval is limited to the reviewed locked resolver version", () => {
  const pkg = readJson("package.json");
  const lock = readJson("package-lock.json");
  const resolver = lock.packages["node_modules/unrs-resolver"];
  assert.deepEqual(pkg.allowScripts, { [`unrs-resolver@${resolver.version}`]: true });
  assert.equal(resolver.version, "1.12.2");
});

test("Vercel npm commands remove only the unsupported cache-dir environment aliases", () => {
  const config = readJson("vercel.json");
  const prefix = "env -u npm_config_cache_dir -u NPM_CONFIG_CACHE_DIR ";
  assert.equal(config.installCommand, `${prefix}npm ci`);
  assert.equal(config.buildCommand, `${prefix}npm run build`);

  const result = spawnSync("sh", ["-c", `${prefix}npm --version`], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache_dir: "/unused/lowercase-cache",
      NPM_CONFIG_CACHE_DIR: "/unused/uppercase-cache",
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^\d+\.\d+\.\d+/);
  assert.doesNotMatch(result.stderr, /Unknown env config/);
});
