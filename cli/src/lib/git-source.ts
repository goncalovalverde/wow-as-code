import { execFile } from "node:child_process";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import {
  FilesystemSourceProvider,
  type LoadOptions,
  type LoadedSource,
  type SourceProvider,
} from "./resolver.js";

const execFileAsync = promisify(execFile);

const CLONE_TIMEOUT_MS = 60_000;
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const TRAVERSAL = /(^|\/)\.\.(\/|$)|%2e/i;
const TOKEN_HOSTS = new Set(["github.com"]);

export interface GitSourceOptions {
  allowFile?: boolean;
}

export interface ParsedGitSource {
  repoUrl: string;
  subPath: string;
  host: string;
}

export function isRemoteSource(source: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(source);
}

export function validateRef(ref: string): void {
  if (!SAFE_REF.test(ref) || ref.includes("..")) {
    throw new Error(`Invalid git ref: "${ref}"`);
  }
}

/** The repo ends at the first ".git" segment, otherwise after owner/repo; the rest is the wow/ subpath. */
export function parseGitSource(source: string, options: GitSourceOptions = {}): ParsedGitSource {
  if (source.startsWith("-")) throw new Error(`Invalid source: "${source}"`);
  if (TRAVERSAL.test(source)) throw new Error(`Path traversal is not allowed in source: "${source}"`);

  const url = new URL(source);
  const allowed = options.allowFile ? ["https:", "ssh:", "file:"] : ["https:", "ssh:"];
  if (!allowed.includes(url.protocol)) {
    throw new Error(`Unsupported source scheme "${url.protocol}" (allowed: ${allowed.join(" ")})`);
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const gitIndex = segments.findIndex((segment) => segment.endsWith(".git"));
  const repoLength = gitIndex >= 0 ? gitIndex + 1 : 2;
  if (segments.length < repoLength || (gitIndex < 0 && segments.length < 2)) {
    throw new Error(`Source must include owner and repository: "${source}"`);
  }

  const userInfo = url.username ? `${url.username}@` : "";
  const repoUrl = `${url.protocol}//${userInfo}${url.host}/${segments.slice(0, repoLength).join("/")}`;
  return { repoUrl, subPath: segments.slice(repoLength).join("/"), host: url.hostname };
}

function authEnvironment(host: string): Record<string, string> {
  const token = process.env.WOW_TOKEN ?? process.env.GH_TOKEN;
  if (!token || !TOKEN_HOSTS.has(host)) return {};
  const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
  return {
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.extraheader",
    GIT_CONFIG_VALUE_0: `Authorization: Basic ${basic}`,
  };
}

export class GitSourceProvider implements SourceProvider {
  private readonly filesystem = new FilesystemSourceProvider();
  private readonly clones = new Map<string, Promise<string>>();
  private cacheRoot?: string;

  constructor(private readonly options: GitSourceOptions = {}) {}

  async load(source: string, options: LoadOptions = {}): Promise<LoadedSource> {
    const { ref } = options;
    if (!ref) throw new Error(`Remote source requires a ref (tag or branch): ${source}`);
    validateRef(ref);

    const parsed = parseGitSource(source, this.options);
    const cloneDir = await this.clone(parsed, ref);
    const subDir = resolve(cloneDir, parsed.subPath);
    const loaded = await this.filesystem.load(subDir);
    await this.assertContained(cloneDir, [subDir, ...loaded.files.map((file) => file.filePath)]);

    return { ...loaded, id: `${parsed.repoUrl}/${parsed.subPath}@${ref}` };
  }

  async dispose(): Promise<void> {
    if (this.cacheRoot) await rm(this.cacheRoot, { recursive: true, force: true });
    this.cacheRoot = undefined;
    this.clones.clear();
  }

  private clone(parsed: ParsedGitSource, ref: string): Promise<string> {
    const key = `${parsed.repoUrl}@${ref}`;
    const existing = this.clones.get(key);
    if (existing) return existing;

    const pending = this.runClone(parsed, ref);
    this.clones.set(key, pending);
    return pending;
  }

  private async runClone(parsed: ParsedGitSource, ref: string): Promise<string> {
    this.cacheRoot ??= await mkdtemp(join(tmpdir(), "wow-src-"));
    const destination = await mkdtemp(join(this.cacheRoot, "clone-"));
    try {
      await execFileAsync(
        "git",
        ["clone", "--depth", "1", "--quiet", "--branch", ref, "--", parsed.repoUrl, destination],
        {
          timeout: CLONE_TIMEOUT_MS,
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0", ...authEnvironment(parsed.host) },
        }
      );
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr?.trim();
      const detail = stderr ? stderr.split("\n")[0] : error instanceof Error ? error.message.split("\n")[0] : String(error);
      throw new Error(`Failed to clone ${parsed.repoUrl}@${ref}: ${detail}`);
    }
    return destination;
  }

  /** Blocks symlinks or manifest paths that escape the cloned repository. */
  private async assertContained(cloneDir: string, paths: string[]): Promise<void> {
    const root = await realpath(cloneDir);
    for (const path of paths) {
      const real = await realpath(path);
      if (real !== root && !real.startsWith(root + sep)) {
        throw new Error(`Remote source path escapes its repository: ${path}`);
      }
    }
  }
}
