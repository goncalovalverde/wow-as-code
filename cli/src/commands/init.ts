import { Command } from "commander";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify as yamlStringify } from "yaml";

const TEMPLATE_CODE_REVIEW = `---
id: code-review
title: Code Review Standards
category: quality
enforcement: soft
owner: team-lead
applies_to:
  - pr
last_reviewed: "${new Date().toISOString().split("T")[0]}"
tags:
  - review
---

# Code Review Standards

## Rules

- Every PR requires at least one approval before merge.
- Reviewers should provide actionable feedback within 24 hours.
- Authors must address all comments before merging.
`;

const TEMPLATE_CONFIG = {
  wow_version: "1.0",
  files: [{ path: "code-review.md", id: "code-review" }],
};

export const initCommand = new Command("init")
  .description("Scaffold a wow/ directory with starter files")
  .option("-d, --dir <path>", "target directory", "wow")
  .action(async (options) => {
    const targetDir = join(process.cwd(), options.dir);

    await mkdir(targetDir, { recursive: true });
    await writeFile(
      join(targetDir, "code-review.md"),
      TEMPLATE_CODE_REVIEW.trimStart()
    );
    await writeFile(
      join(targetDir, "config.yaml"),
      yamlStringify(TEMPLATE_CONFIG)
    );

    console.log(`✓ Created ${options.dir}/ with starter files:`);
    console.log(`  - ${options.dir}/config.yaml`);
    console.log(`  - ${options.dir}/code-review.md`);
    console.log(`\nEdit these files to match your team's agreements.`);
  });
