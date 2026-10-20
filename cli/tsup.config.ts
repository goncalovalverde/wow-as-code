import { defineConfig } from "tsup";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  dts: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  onSuccess: async () => {
    copyFileSync(
      resolve("../spec/schema.json"),
      resolve("dist/schema.json")
    );
  },
});
