import type { ResolvedRule, WoWFrontmatter } from "./types.js";

export interface RuleFilter {
  trigger?: string;
  id?: string;
  enforcement?: WoWFrontmatter["enforcement"];
  category?: WoWFrontmatter["category"];
}

export function filterRules(rules: ResolvedRule[], filter: RuleFilter): ResolvedRule[] {
  return rules.filter(({ frontmatter }) => {
    if (filter.id && frontmatter.id !== filter.id) return false;
    if (filter.trigger && !frontmatter.applies_to.includes(filter.trigger)) return false;
    if (filter.enforcement && frontmatter.enforcement !== filter.enforcement) return false;
    if (filter.category && frontmatter.category !== filter.category) return false;
    return true;
  });
}
