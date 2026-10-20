import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { filterRules } from "../src/lib/query.js";
import { createWowServer } from "../src/lib/mcp/server.js";
import type { ResolvedRule } from "../src/lib/types.js";

const makeRule = (
  id: string,
  enforcement: "hard" | "soft" | "info",
  appliesTo: string[],
  extra: Partial<ResolvedRule["frontmatter"]> = {}
): ResolvedRule => ({
  frontmatter: {
    id,
    title: `Title ${id}`,
    category: "quality",
    enforcement,
    owner: "@o",
    applies_to: appliesTo,
    last_reviewed: "2026-01-01",
    ...extra,
  },
  body: `# ${id}\n\nBody of ${id}.`,
  filePath: `${id}.md`,
  provenance: "company",
});

const rules = [
  makeRule("sec", "hard", ["pr", "commit"], { rationale: "Because." }),
  makeRule("review", "soft", ["pr"]),
  makeRule("onboard", "info", ["onboarding"], { category: "collaboration" }),
];

describe("filterRules", () => {
  it("returns everything when no filter is given", () => {
    expect(filterRules(rules, {})).toHaveLength(3);
  });

  it("filters by trigger", () => {
    expect(filterRules(rules, { trigger: "pr" }).map((r) => r.frontmatter.id)).toEqual(["sec", "review"]);
  });

  it("combines trigger, enforcement and category filters", () => {
    expect(filterRules(rules, { trigger: "pr", enforcement: "hard" })).toHaveLength(1);
    expect(filterRules(rules, { category: "collaboration" })[0].frontmatter.id).toBe("onboard");
  });

  it("filters by id", () => {
    expect(filterRules(rules, { id: "review" })).toHaveLength(1);
    expect(filterRules(rules, { id: "nope" })).toEqual([]);
  });

  it("does not mutate its input", () => {
    const copy = [...rules];
    filterRules(rules, { trigger: "pr" });
    expect(rules).toEqual(copy);
  });
});

async function connect(load: () => Promise<{ rules: ResolvedRule[]; warnings: string[] }>) {
  const server = createWowServer(load);
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

const textOf = (result: { content?: unknown }) =>
  (result.content as Array<{ type: string; text: string }>).map((c) => c.text).join("\n");

describe("wow MCP server", () => {
  const load = async () => ({ rules, warnings: [] as string[] });

  it("exposes the three tools", async () => {
    const client = await connect(load);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["get_context", "get_rule", "list_rules"]);
  });

  it("list_rules filters by trigger and returns summaries without bodies", async () => {
    const client = await connect(load);
    const result = await client.callTool({ name: "list_rules", arguments: { trigger: "commit" } });
    const parsed = JSON.parse(textOf(result));
    expect(parsed.map((r: { id: string }) => r.id)).toEqual(["sec"]);
    expect(textOf(result)).not.toContain("Body of sec");
  });

  it("get_rule returns the full rule", async () => {
    const client = await connect(load);
    const result = await client.callTool({ name: "get_rule", arguments: { id: "sec" } });
    expect(textOf(result)).toContain("Body of sec.");
    expect(textOf(result)).toContain("Because.");
  });

  it("get_rule reports an error for an unknown id", async () => {
    const client = await connect(load);
    const result = await client.callTool({ name: "get_rule", arguments: { id: "nope" } });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("sec");
  });

  it("get_context renders rules for a trigger, hard first", async () => {
    const client = await connect(load);
    const result = await client.callTool({ name: "get_context", arguments: { trigger: "pr" } });
    const text = textOf(result);
    expect(text.indexOf("(sec)")).toBeLessThan(text.indexOf("(review)"));
    expect(text).not.toContain("(onboard)");
    expect(text).not.toContain("DO NOT EDIT");
  });

  it("get_context says so when no rule matches", async () => {
    const client = await connect(load);
    const result = await client.callTool({ name: "get_context", arguments: { trigger: "deploy" } });
    expect(textOf(result)).toContain("No rules apply");
  });

  it("includes resolution warnings so agents know context may be incomplete", async () => {
    const client = await connect(async () => ({ rules, warnings: ["Cannot load source X"] }));
    const result = await client.callTool({ name: "get_context", arguments: { trigger: "pr" } });
    expect(textOf(result)).toContain("Cannot load source X");
  });

  it("returns an error result instead of throwing when loading fails", async () => {
    const client = await connect(async () => {
      throw new Error("config.yaml missing");
    });
    const result = await client.callTool({ name: "list_rules", arguments: {} });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("config.yaml missing");
  });
});
