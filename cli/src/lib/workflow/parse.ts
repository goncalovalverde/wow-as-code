import matter from "gray-matter";
import type { Workflow, WorkflowFrontmatter } from "./types.js";

export function parseWorkflow(raw: string, filePath: string): Workflow {
  const { data, content } = matter(raw);
  return { frontmatter: data as WorkflowFrontmatter, body: content.trim(), filePath };
}
