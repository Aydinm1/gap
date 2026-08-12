import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const requiredDocs = [
  "AGENTS.md",
  "CHANGELOG.md",
  "todo.md",
  "docs/README.md",
  "docs/product-spec.md",
  "docs/design-system.md",
  "docs/architecture.md",
  "docs/data-model.md",
  "docs/operations.md",
  "docs/ideas.md",
  "docs/decisions/README.md",
];

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return markdownFiles(path);
    return extname(entry.name) === ".md" ? [path] : [];
  });
}

test("required project documentation exists", () => {
  for (const path of requiredDocs) {
    assert.equal(existsSync(join(root, path)), true, `Missing ${path}`);
  }
});

test("local Markdown links resolve", () => {
  const files = [
    join(root, "AGENTS.md"),
    join(root, "CHANGELOG.md"),
    join(root, "todo.md"),
    ...markdownFiles(join(root, "docs")),
  ];
  const failures = [];

  for (const file of files) {
    const content = readFileSync(file, "utf8");

    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const href = match[1].split("#", 1)[0];
      if (!href || /^[a-z][a-z\d+.-]*:/i.test(href)) continue;

      const target = resolve(dirname(file), decodeURIComponent(href));
      if (!existsSync(target)) failures.push(`${file}: ${href}`);
    }
  }

  assert.deepEqual(failures, []);
});

test("environment example documents only the public Phase 0 contract", () => {
  const content = readFileSync(join(root, ".env.example"), "utf8");
  const keys = [...content.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map(
    (match) => match[1],
  );

  assert.deepEqual(keys, [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SITE_URL",
  ]);
  assert.doesNotMatch(content, /service[_-]?role|secret/i);
});
