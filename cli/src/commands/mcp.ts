import { Command } from "commander";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolve } from "node:path";
import { resolveRules } from "../lib/load.js";
import { createWowServer } from "../lib/mcp/server.js";
import { createSourceProvider } from "../lib/sources.js";

const DEFAULT_TTL_SECONDS = 30;

export const mcpCommand = new Command("mcp")
  .description("Run an MCP server (stdio) that serves resolved wow/ rules to AI agents")
  .option("-d, --dir <path>", "wow directory path", "wow")
  .option("--ttl <seconds>", "seconds to cache resolved rules (0 = reload on every call)", String(DEFAULT_TTL_SECONDS))
  .action(async (options) => {
    const wowDir = resolve(process.cwd(), options.dir);
    const ttlMs = Number(options.ttl) * 1000;
    let cached: { at: number; value: ReturnType<typeof resolveRules> } | undefined;

    const load = () => {
      if (!cached || Date.now() - cached.at >= ttlMs) {
        const provider = createSourceProvider();
        const value = resolveRules(wowDir, provider).finally(() => provider.dispose?.());
        cached = { at: Date.now(), value };
        value.catch(() => {
          cached = undefined;
        });
      }
      return cached.value;
    };

    // stdout carries the protocol; diagnostics go to stderr only
    console.error(`wow mcp: serving ${wowDir}`);
    await createWowServer(load).connect(new StdioServerTransport());
  });
