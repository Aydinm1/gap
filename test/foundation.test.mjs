import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("demo seeding is opt-in and local backups are ignored", () => {
  const config = readFileSync(join(root, "supabase/config.toml"), "utf8");
  const seedSection = config.split("[db.seed]")[1].split("[db.network_restrictions]")[0];
  assert.match(seedSection, /enabled = false/);
  const scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts;
  assert.match(scripts["db:seed:demo"], /supabase_db_gap.*supabase\/seed.sql/);
  assert.match(readFileSync(join(root, ".gitignore"), "utf8"), /^\/\.local-backups\/$/m);
});

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

test("environment example documents public configuration and empty private OAuth placeholders", () => {
  const content = readFileSync(join(root, ".env.example"), "utf8");
  const keys = [...content.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map(
    (match) => match[1],
  );

  assert.deepEqual(keys, [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SITE_URL",
    "OAUTH_CLIENT_ID",
    "OAUTH_CLIENT_SECRET",
    "MONDAY_API_TOKEN",
    "MONDAY_ACCOUNT_ID",
    "MONDAY_APPLICANTS_BOARD_ID",
    "MONDAY_MEMBERS_BOARD_ID",
    "SUPABASE_SECRET_KEY",
    "MONDAY_EMAIL_COLUMN_ID",
    "MONDAY_ENROLL_IN_GAP_COLUMN_ID",
    "MONDAY_COHORT_COLUMN_ID",
    "MONDAY_MEMBER_STATUS_COLUMN_ID",
    "MONDAY_REPORTING_BOARD_ID",
  ]);
  assert.match(content, /^OAUTH_CLIENT_ID=\s*$/m);
  assert.match(content, /^OAUTH_CLIENT_SECRET=\s*$/m);
  assert.doesNotMatch(content, /service[_-]?role/i);
  for (const key of keys.filter(key => key.startsWith("MONDAY_"))) {
    assert.match(content, new RegExp(`^${key}=[ \\t]*$`, "m"));
  }
});
