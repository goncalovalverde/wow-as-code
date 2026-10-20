import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._\/~^@{}-]*$/;

async function git(root: string, args: string[]): Promise<string[]> {
  const { stdout } = await execFileAsync("git", args, { cwd: root, timeout: 30_000 });
  return stdout.split("\n").filter(Boolean);
}

/** Files added, copied, modified or renamed since the merge-base with a git ref (as a PR would show), plus untracked files, relative to root. */
export async function listChangedFiles(root: string, ref: string): Promise<string[]> {
  if (!REF_PATTERN.test(ref)) throw new Error(`Invalid git ref "${ref}"`);
  const [base] = await git(root, ["merge-base", ref, "HEAD"]);
  const [tracked, untracked] = await Promise.all([
    git(root, ["diff", "--name-only", "--relative", "--diff-filter=ACMR", base ?? ref, "--"]),
    git(root, ["ls-files", "--others", "--exclude-standard"]),
  ]);
  return [...new Set([...tracked, ...untracked])];
}
