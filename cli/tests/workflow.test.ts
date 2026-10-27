import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { parseWorkflow } from "../src/lib/workflow/parse.js";
import { loadWorkflows } from "../src/lib/workflow/load.js";
import { validateWorkflows } from "../src/lib/workflow/validate.js";
import { renderWorkflows } from "../src/lib/workflow/render.js";
import { renderTarget } from "../src/lib/sync/render.js";
import { loadProject } from "../src/lib/project.js";
import { FilesystemSourceProvider } from "../src/lib/resolver.js";
import { createWowServer } from "../src/lib/mcp/server.js";
import type { Workflow } from "../src/lib/workflow/types.js";
import type { ResolvedRule } from "../src/lib/types.js";

const makeWorkflow = (overrides: Partial<Workflow["frontmatter"]> = {}): Workflow => ({
  frontmatter: {
    id: "spec-driven",
    title: "Spec-driven delivery",
    owner: "@team",
    phases: [
      { id: "specify", name: "Specify", performer: "both", outputs: ["spec.md"] },
      { id: "implement", name: "Implement", performer: "agent", inputs: ["spec.md"], outputs: ["pr"], gate: { rules: ["code-review"], approval: "human" } },
    ],
    ...overrides,
  },
  body: "Explains the flow.",
  filePath: "workflows/spec-driven.md",
});

const makeRule = (id: string, enforcement: "hard" | "soft" | "info", verify?: ResolvedRule["frontmatter"]["verify"]): ResolvedRule => ({
  frontmatter: { id, title: id, category: "quality", enforcement, owner: "@o", applies_to: ["pr"], last_reviewed: "2026-05-20", verify },
  body: `Body ${id}`,
  filePath: `${id}.md`,
  provenance: "local",
});

const rules = [makeRule("code-review", "soft")];

describe("parseWorkflow", () => {
  it("reads frontmatter and body", () => {
    const raw = "---\nid: w\ntitle: W\nowner: '@t'\nphases:\n  - {id: a, name: A, performer: human}\n---\n\nProse.\n";
    const workflow = parseWorkflow(raw, "w.md");
    expect(workflow.frontmatter.phases[0].performer).toBe("human");
    expect(workflow.body).toBe("Prose.");
  });
});

describe("validateWorkflows", () => {
  it("accepts a well-formed workflow", async () => {
    expect(await validateWorkflows([makeWorkflow()], rules)).toEqual([]);
  });

  it("reports schema errors", async () => {
    const bad = makeWorkflow({ phases: [{ id: "a", name: "A", performer: "robot" as never }] });
    const diagnostics = await validateWorkflows([bad], rules);
    expect(diagnostics.some((d) => d.level === "error")).toBe(true);
  });

  it("rejects duplicate phase ids", async () => {
    const dup = makeWorkflow({ phases: [{ id: "a", name: "A", performer: "human" }, { id: "a", name: "B", performer: "human" }] });
    const diagnostics = await validateWorkflows([dup], rules);
    expect(diagnostics.map((d) => d.message).join()).toContain('Duplicate phase id "a"');
  });

  it("rejects gates that reference unknown rules", async () => {
    const wf = makeWorkflow({ phases: [{ id: "a", name: "A", performer: "human", gate: { rules: ["nope"] } }] });
    const diagnostics = await validateWorkflows([wf], rules);
    expect(diagnostics.map((d) => d.message).join()).toContain('unknown rule "nope"');
  });

  it("requires human approval when an agent phase is gated by a hard rule without a deterministic or human verifier", async () => {
    const wf = makeWorkflow({ phases: [{ id: "a", name: "A", performer: "agent", gate: { rules: ["sec"], approval: "none" } }] });
    const diagnostics = await validateWorkflows([wf], [makeRule("sec", "hard")]);
    expect(diagnostics.some((d) => d.level === "error" && d.message.includes("approval"))).toBe(true);
  });

  it("allows an agent phase with a hard rule that has a deterministic verifier", async () => {
    const verify = { type: "deterministic", check: "file-exists", path: "X" } as const;
    const wf = makeWorkflow({ phases: [{ id: "a", name: "A", performer: "agent", gate: { rules: ["sec"], approval: "none" } }] });
    expect(await validateWorkflows([wf], [makeRule("sec", "hard", verify)])).toEqual([]);
  });

  it("warns when an input is never produced by an earlier phase", async () => {
    const wf = makeWorkflow({ phases: [{ id: "a", name: "A", performer: "human", inputs: ["ticket"] }] });
    const diagnostics = await validateWorkflows([wf], rules);
    expect(diagnostics).toEqual([expect.objectContaining({ level: "warning" })]);
  });
});

describe("renderWorkflows", () => {
  it("is empty without workflows", () => {
    expect(renderWorkflows([])).toBe("");
  });

  it("lists phases with performer, artifacts and gates", () => {
    const text = renderWorkflows([makeWorkflow()]);
    expect(text).toContain("## Workflow: Spec-driven delivery (spec-driven)");
    expect(text).toContain("1. **Specify** (specify) — performed by both; produces spec.md");
    expect(text).toContain("2. **Implement** (implement) — performed by agent; needs spec.md; produces pr; gate: rules code-review, human approval");
  });

  it("is appended to compiled agent files", () => {
    const out = renderTarget(rules, "agents-md", [makeWorkflow()]);
    expect(out).toContain("# Workflows");
    expect(out).toContain("Spec-driven delivery");
  });
});

describe("loadWorkflows", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "wow-wf-"));
    await mkdir(join(dir, "workflows"));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it("loads listed workflows and reports unreadable ones", async () => {
    await writeFile(join(dir, "workflows", "w.md"), "---\nid: w\ntitle: W\nowner: o\nphases:\n  - {id: a, name: A, performer: human}\n---\nBody");
    const config = { wow_version: "1.0", files: [], workflows: [{ id: "w", path: "workflows/w.md" }, { id: "gone", path: "workflows/gone.md" }] };
    const { workflows, diagnostics } = await loadWorkflows(dir, config);
    expect(workflows.map((w) => w.frontmatter.id)).toEqual(["w"]);
    expect(diagnostics).toEqual([expect.objectContaining({ level: "error", file: "workflows/gone.md" })]);
  });

  it("flags id mismatches between config and frontmatter", async () => {
    await writeFile(join(dir, "workflows", "w.md"), "---\nid: other\ntitle: W\nowner: o\nphases:\n  - {id: a, name: A, performer: human}\n---\n");
    const config = { wow_version: "1.0", files: [], workflows: [{ id: "w", path: "workflows/w.md" }] };
    const { diagnostics } = await loadWorkflows(dir, config);
    expect(diagnostics[0].message).toContain("ID mismatch");
  });

  it("returns nothing when no workflows are configured", async () => {
    expect(await loadWorkflows(dir, { wow_version: "1.0", files: [] })).toEqual({ workflows: [], diagnostics: [] });
  });

  it("rejects paths that escape the wow directory", async () => {
    const config = { wow_version: "1.0", files: [], workflows: [{ id: "x", path: "../x.md" }] };
    const { diagnostics } = await loadWorkflows(dir, config);
    expect(diagnostics[0].message).toContain("outside");
  });
});

describe("MCP workflow tools", () => {
  async function connect() {
    const server = createWowServer(async () => ({ rules, warnings: [] }), async () => [makeWorkflow()]);
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "t", version: "0" });
    await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
    return client;
  }
  const textOf = (result: unknown) => (result as { content: Array<{ text: string }> }).content[0].text;

  it("lists and fetches workflows", async () => {
    const client = await connect();
    const list = JSON.parse(textOf(await client.callTool({ name: "list_workflows", arguments: {} })));
    expect(list).toEqual([expect.objectContaining({ id: "spec-driven", phases: 2 })]);
    const one = textOf(await client.callTool({ name: "get_workflow", arguments: { id: "spec-driven" } }));
    expect(one).toContain("Implement");
  });

  it("returns an error for unknown workflows", async () => {
    const client = await connect();
    const result = await client.callTool({ name: "get_workflow", arguments: { id: "zzz" } });
    expect(result.isError).toBe(true);
  });
});

describe("loadProject", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "wow-proj-"));
    await mkdir(join(dir, "workflows"));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it("returns rules and workflows together", async () => {
    await writeFile(join(dir, "config.yaml"), "wow_version: '1.0'\nfiles:\n  - {id: r, path: r.md}\nworkflows:\n  - {id: w, path: workflows/w.md}\n");
    await writeFile(join(dir, "r.md"), "---\nid: r\ntitle: R\ncategory: quality\nenforcement: soft\nowner: o\napplies_to: [pr]\nlast_reviewed: 2026-05-20\n---\nBody");
    await writeFile(join(dir, "workflows", "w.md"), "---\nid: w\ntitle: W\nowner: o\nphases:\n  - {id: a, name: A, performer: human}\n---\n");
    const project = await loadProject(dir, new FilesystemSourceProvider());
    expect(project.rules.map((r) => r.frontmatter.id)).toEqual(["r"]);
    expect(project.workflows.map((w) => w.frontmatter.id)).toEqual(["w"]);
    expect(project.workflowDiagnostics).toEqual([]);
  });
});
