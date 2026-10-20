import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";
import { showCommand } from "./commands/show.js";

const program = new Command();

program
  .name("wow")
  .description("Ways of Working as Code — team agreements as code")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(validateCommand);
program.addCommand(showCommand);

program.parse();
