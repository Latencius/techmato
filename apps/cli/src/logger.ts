export type Logger = {
  step(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
};

export function createLogger({ totalSteps }: { totalSteps: number }): Logger {
  let currentStep = 0;

  return {
    step(message) {
      currentStep += 1;
      console.log(`${prefix()} [step ${currentStep}/${totalSteps}] ${message}`);
    },
    info(message) {
      console.log(`${prefix()} [info] ${message}`);
    },
    warn(message) {
      console.warn(`${prefix()} [warn] ${message}`);
    },
    error(message) {
      console.error(`${prefix()} [error] ${message}`);
    },
  };
}

function prefix(): string {
  const now = new Date();

  return `[${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}]`;
}
