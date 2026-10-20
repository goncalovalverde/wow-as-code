import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import type { WoWConfig } from "./types.js";

export async function loadConfig(configPath: string): Promise<WoWConfig> {
  const raw = await readFile(configPath, "utf-8");
  return parseConfig(raw);
}

export function parseConfig(raw: string): WoWConfig {
  const data = parseYaml(raw);

  if (!data || typeof data !== "object") {
    throw new Error("config.yaml must be a valid YAML object");
  }

  if (!data.wow_version) {
    throw new Error("config.yaml must specify wow_version");
  }

  if (!Array.isArray(data.files)) {
    throw new Error("config.yaml must have a files array");
  }

  return data as WoWConfig;
}
