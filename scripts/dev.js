import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const mode = process.argv[2] === "remote" ? "remote" : "local";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const xdgConfigHome = path.resolve(".wrangler/config");
const args = ["wrangler", "dev", "--show-interactive-dev-session=false"];

if (mode === "local") {
  args.push("--local", "--inspector-port", "9230");
  process.stdout.write(
    "提示：如果本地 Wrangler 不稳定，或你怀疑自己打开到了旧页面，可先运行 `npm run dev:ui` 做稳定的当前前端预览。\n",
  );
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
