import { join } from "node:path";
import { parseWoWFile } from "./parser.js";
import type { ConfigFileEntry, WoWConfig, WoWFile } from "./types.js";

export interface ManifestResult {
  entry: ConfigFileEntry;
  file?: WoWFile;
  error?: Error;
}

/** Parses every manifest entry; failures are returned per entry instead of thrown. */
export async function parseManifestEntries(
  wowDir: string,
  config: WoWConfig
): Promise<ManifestResult[]> {
  return Promise.all(
    config.files.map(async (entry): Promise<ManifestResult> => {
      try {
        return { entry, file: await parseWoWFile(join(wowDir, entry.path)) };
      } catch (error) {
        return { entry, error: error instanceof Error ? error : new Error(String(error)) };
      }
    })
  );
}
