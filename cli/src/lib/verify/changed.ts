import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._\/~^@{}-]*$/;

/** Files added, copied, modified or renamed between a git ref and the working tree, relative to root. */
export async function listChangedFiles(root: string, ref: string): Promise<string[]> {
  if (!REF_PATTERN.test(ref)) throw new Error(`Invalid git ref "${ref}"`);
  const { stdout } = await execFileAsync(
    "git",
    ["diff", "--name-only", "--relative", "--diff-filter=ACMR", ref, "--"],
    { cwd: root, timeout: 30_000 }
  );
  return stdout.split("\n").filter(Boolean);
}
