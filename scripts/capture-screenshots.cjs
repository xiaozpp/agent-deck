const { _electron: electron } = require("playwright-core");
const fs = require("node:fs");
const path = require("node:path");

const shots = [
  { name: "desktop.png", width: 1180, height: 760 },
  { name: "compact.png", width: 980, height: 700 },
  { name: "usage.png", width: 1180, height: 820, navigate: "大模型用量" },
];

async function capture() {
  const outDir = path.resolve(__dirname, "..", "qa");
  fs.mkdirSync(outDir, { recursive: true });
  const appRoot = path.resolve(__dirname, "..");
  const electronPath = require(path.join(appRoot, "node_modules", "electron"));

  for (const shot of shots) {
    const electronApp = await electron.launch({
      executablePath: electronPath,
      args: [appRoot],
      cwd: appRoot,
      env: {
        ...process.env,
        TOOL_MASTER_LOAD_DIST: "1",
        TOOL_MASTER_QA_WIDTH: String(shot.width),
        TOOL_MASTER_QA_HEIGHT: String(shot.height),
      },
    });
    const page = await electronApp.firstWindow();
    await page.waitForSelector(".app-shell", { timeout: 10000 });
    if (shot.navigate) {
      await page.getByRole("button", { name: shot.navigate }).first().click();
      await page.waitForSelector(shot.waitFor || ".stats-panel", { timeout: 10000 });
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: path.join(outDir, shot.name) });
    await electronApp.close();
  }
}

capture().catch((error) => {
  console.error(error);
  process.exit(1);
});
