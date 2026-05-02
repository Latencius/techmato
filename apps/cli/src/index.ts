import { parseArgs, USAGE } from "./args.js";
import { runBroadcast } from "./runBroadcast.js";

const parsed = parseArgs(process.argv.slice(2));

if (!parsed.ok) {
  console.error(parsed.message);
  console.error(USAGE);
  process.exitCode = 1;
} else {
  process.exitCode = await runBroadcast(parsed.value);
}
