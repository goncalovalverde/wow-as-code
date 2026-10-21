export type Performer = "human" | "agent" | "both";

export interface WorkflowGate {
  rules?: string[];
  approval?: "human" | "none";
}

export interface WorkflowPhase {
  id: string;
  name: string;
  performer: Performer;
  inputs?: string[];
  outputs?: string[];
  gate?: WorkflowGate;
}

export interface WorkflowFrontmatter {
  id: string;
  title: string;
  owner: string;
  description?: string;
  phases: WorkflowPhase[];
}

export interface Workflow {
  frontmatter: WorkflowFrontmatter;
  body: string;
  filePath: string;
}
