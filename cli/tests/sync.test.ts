import { describe, it, expect } from "vitest";
import { GENERATED_MARKER, renderTarget, TARGETS } from "../src/lib/sync/render.js";
import { planSync } from "../src/lib/sync/plan.js";
import type { ResolvedRule } from "../src/lib/types.js";

function makeRule(
  id: string,
  enforcement: "hard" | "soft" | "info",
  body = `# ${id}\n\nBody of ${id}.`
): ResolvedRule {
  return {
    frontmatter: {
      id,
      title: `Title ${id}`,
      category: "quality",
      enforcement,
      owner: "team",
      applies_to: ["pr"],
      last_reviewed: "2026-05-20",
    },
    body,
    filePath: `wow/${id}.md`,
    provenance: "local",
  };
}

describe("renderTarget", () => {
  const rules = [makeRule("b-soft", "soft"), makeRule("c-info", "info"), makeRule("a-hard", "hard")];

  it("starts with the generated marker", () => {
    const out = renderTarget(rules, "agents-md");
    expect(out.startsWith(GENERATED_MARKER)).toBe(true);
  });

  it("orders rules hard, soft, info, then by id", () => {
    const out = renderTarget(rules, "agents-md");
    const positions = ["a-hard", "b-soft", "c-info"].map((id) => out.indexOf(`(${id})`));
    expect(positions).toEqual([...positions].sort((x, y) => x - y));
    expect(positions.every((p) => p > 0)).toBe(true);
  });

  it("is deterministic regardless of input order", () => {
    expect(renderTarget([...rules].reverse(), "agents-md")).toBe(renderTarget(rules, "agents-md"));
  });

  it("states enforcement semantics for each level", () => {
    const out = renderTarget(rules, "agents-md");
    expect(out).toContain("MUST");
    expect(out).toContain("SHOULD");
  });

  it("strips the duplicate leading H1 from the body", () => {
    const out = renderTarget([makeRule("a-hard", "hard")], "agents-md");
    expect(out).not.toContain("# a-hard\n");
    expect(out).toContain("Body of a-hard.");
  });

  it("includes rationale when present", () => {
    const rule = makeRule("a-hard", "hard");
    rule.frontmatter.rationale = "Because audits.";
    expect(renderTarget([rule], "agents-md")).toContain("Because audits.");
  });

  it("renders an empty rule set without throwing", () => {
    expect(renderTarget([], "claude-md")).toContain(GENERATED_MARKER);
  });

  it("maps every target to a distinct output path", () => {
    const paths = Object.values(TARGETS).map((t) => t.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(TARGETS["copilot-instructions"].path).toBe(".github/copilot-instructions.md");
  });
});

describe("planSync", () => {
  const rules = [makeRule("a-hard", "hard")];
  const generated = renderTarget(rules, "agents-md");

  it("marks missing files as created", () => {
    const [entry] = planSync(rules, ["agents-md"], () => undefined);
    expect(entry.status).toBe("created");
    expect(entry.content).toBe(generated);
  });

  it("marks identical files as unchanged", () => {
    const [entry] = planSync(rules, ["agents-md"], () => generated);
    expect(entry.status).toBe("unchanged");
  });

  it("marks drifted generated files as updated", () => {
    const [entry] = planSync(rules, ["agents-md"], () => `${GENERATED_MARKER}\nstale`);
    expect(entry.status).toBe("updated");
  });

  it("blocks overwriting hand-written files without the marker", () => {
    const [entry] = planSync(rules, ["agents-md"], () => "# my handwritten file");
    expect(entry.status).toBe("blocked");
  });

  it("allows overwriting hand-written files with force", () => {
    const [entry] = planSync(rules, ["agents-md"], () => "# my handwritten file", { force: true });
    expect(entry.status).toBe("updated");
  });
});
