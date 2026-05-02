import { resolve } from "node:path";

export type CliOptions = {
  speaker: number;
  maxStories: number;
  voicevox: string;
  gapMs: number;
  outputRoot: string;
};

export type ParseArgsResult = { ok: true; value: CliOptions } | { ok: false; message: string };

export const USAGE = `Usage: pnpm cli [options]

Options:
  --speaker <number>      VOICEVOX speaker id (default: 3)
  --max-stories <number>  Number of stories to select (default: 4)
  --voicevox <url>        VOICEVOX base URL (default: VOICEVOX_BASE_URL or http://localhost:50021)
  --gap-ms <number>       Silence gap between cues in milliseconds (default: 300)
  --output-root <dir>     Output root directory (default: ./output)
`;

export function parseArgs(argv: string[]): ParseArgsResult {
  const options: CliOptions = {
    speaker: 3,
    maxStories: 4,
    voicevox: process.env.VOICEVOX_BASE_URL ?? "http://localhost:50021",
    gapMs: 300,
    outputRoot: resolve("output"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];

    if (flag === "--") {
      continue;
    }

    switch (flag) {
      case "--speaker": {
        const parsed = parseNumberFlag(flag, argv[index + 1]);
        if (!parsed.ok) {
          return parsed;
        }
        options.speaker = parsed.value;
        index += 1;
        break;
      }
      case "--max-stories": {
        const parsed = parseNumberFlag(flag, argv[index + 1]);
        if (!parsed.ok) {
          return parsed;
        }
        options.maxStories = parsed.value;
        index += 1;
        break;
      }
      case "--voicevox": {
        const value = argv[index + 1];
        if (!value) {
          return { ok: false, message: "--voicevox requires a value" };
        }
        options.voicevox = value;
        index += 1;
        break;
      }
      case "--gap-ms": {
        const parsed = parseNumberFlag(flag, argv[index + 1]);
        if (!parsed.ok) {
          return parsed;
        }
        options.gapMs = parsed.value;
        index += 1;
        break;
      }
      case "--output-root": {
        const value = argv[index + 1];
        if (!value) {
          return { ok: false, message: "--output-root requires a value" };
        }
        options.outputRoot = resolve(value);
        index += 1;
        break;
      }
      default:
        return { ok: false, message: `Unknown flag: ${flag}` };
    }
  }

  return { ok: true, value: options };
}

function parseNumberFlag(
  flag: string,
  value: string | undefined,
): { ok: true; value: number } | { ok: false; message: string } {
  if (!value) {
    return { ok: false, message: `${flag} requires a value` };
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return { ok: false, message: `${flag} must be a number` };
  }

  return { ok: true, value: parsed };
}
