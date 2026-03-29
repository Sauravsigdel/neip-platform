#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");

function walkJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      out.push(full);
    }
  }
  return out;
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, "/");
}

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
}

function pass(msg) {
  console.log(`[PASS] ${msg}`);
}

async function main() {
  let hasError = false;

  const requiredFiles = [
    path.join(root, "src", "server.js"),
    path.join(root, "src", "routes", "authRoutes.js"),
    path.join(root, "src", "routes", "mapRoutes.js"),
    path.join(root, ".env.example"),
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      hasError = true;
      fail(`Missing required file: ${rel(file)}`);
    }
  }

  if (!hasError) {
    pass("Required files exist");
  }

  const jsFiles = walkJsFiles(srcDir);
  if (!jsFiles.length) {
    hasError = true;
    fail("No backend source files found under src/");
  }

  for (const file of jsFiles) {
    const check = spawnSync(process.execPath, ["--check", file], {
      cwd: root,
      encoding: "utf8",
    });
    if (check.status !== 0) {
      hasError = true;
      fail(`Syntax check failed: ${rel(file)}`);
      if (check.stderr) {
        console.error(check.stderr.trim());
      }
    }
  }

  if (!hasError) {
    pass(`Syntax check passed for ${jsFiles.length} files`);
  }

  const baseUrl = process.env.SMOKE_TEST_BASE_URL;
  if (baseUrl) {
    try {
      if (typeof fetch !== "function") {
        throw new Error("Fetch API unavailable in this Node runtime");
      }
      const url = `${baseUrl.replace(/\/$/, "")}/api/health`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        throw new Error(`Health check returned ${res.status}`);
      }
      pass(`Live health check OK: ${url}`);
    } catch (err) {
      hasError = true;
      fail(`Live health check failed: ${err.message}`);
    }
  } else {
    console.log(
      "[INFO] Live health check skipped (set SMOKE_TEST_BASE_URL to enable)",
    );
  }

  if (hasError) {
    console.error("\nSmoke test failed.");
    process.exit(1);
  }

  console.log("\nSmoke test passed.");
}

main().catch((err) => {
  console.error("[FAIL] Unexpected test error:", err.message);
  process.exit(1);
});
