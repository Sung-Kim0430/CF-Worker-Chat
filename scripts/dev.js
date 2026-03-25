import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const mode = process.argv[2] === "remote" ? "remote" : "local";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const xdgConfigHome = path.resolve(".wrangler/config");
const args = ["wrangler", "dev", "--show-interactive-dev-session=false"];

if (mode === "local") {
  args.push("--local", "--inspector-port", "9230");
} else {
  args.push("--remote", "--inspector-port", "9231");
}

const child = spawn(npxCommand, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    WRANGLER_SEND_METRICS: "false",
    XDG_CONFIG_HOME: xdgConfigHome,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
