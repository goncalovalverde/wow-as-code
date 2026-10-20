import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";
import { showCommand } from "./commands/show.js";
import { syncCommand } from "./commands/sync.js";
import { mcpCommand } from "./commands/mcp.js";
import { checkCommand } from "./commands/check.js";

const program = new Command();

program
  .name("wow")
  .description("Ways of Working as Code — team agreements as code")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(validateCommand);
program.addCommand(showCommand);
program.addCommand(syncCommand);
program.addCommand(mcpCommand);
program.addCommand(checkCommand);

program.parse();
