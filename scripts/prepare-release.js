#!/usr/bin/env node

/**
 * This script helps prepare the UploadIt package for release
 * It performs the following tasks:
 * 1. Builds the package
 * 2. Runs a dry-run of npm pack to check what files would be included
 * 3. Checks for existing npm versions to avoid conflicts
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

// Helper for formatted console output
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper for running shell commands
function run(command) {
  try {
    return execSync(command, { stdio: "inherit" });
  } catch (error) {
    log(`Error running command: ${command}`, colors.red);
    log(error.message, colors.red);
    process.exit(1);
  }
}

// Main function
async function prepareRelease() {
  const rootDir = path.resolve(__dirname, "..");
  const packageJsonPath = path.join(rootDir, "package.json");

  // Read package.json
  log("Reading package.json...", colors.cyan);
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const { name, version } = packageJson;

  log(
    `\n${colors.bright}${colors.green}===== Preparing ${name}@${version} for release =====\n${colors.reset}`,
  );

  // Check if this version already exists on npm
  try {
    log("Checking if version already exists on npm...", colors.cyan);
    const npmViewOutput = execSync(`npm view ${name} versions --json`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (npmViewOutput) {
      const publishedVersions = JSON.parse(npmViewOutput);
      if (
        Array.isArray(publishedVersions) &&
        publishedVersions.includes(version)
      ) {
        log(
          `\n${colors.red}WARNING: Version ${version} already exists on npm!${colors.reset}`,
        );
        log(
          `Consider updating the version in package.json before publishing.`,
          colors.yellow,
        );
      } else {
        log(`Version ${version} is available for publishing.`, colors.green);
      }
    }
  } catch (error) {
    // Package might not exist yet, or network error
    log(
      `Package ${name} might not exist on npm yet or there was a network error.`,
      colors.yellow,
    );
  }

  // Build the package
  log("\nBuilding the package...", colors.cyan);
  run("npm run build");

  // Run npm pack --dry-run to see what would be included
  log("\nChecking what files would be included in the package...", colors.cyan);
  run("npm pack --dry-run");

  log(
    `\n${colors.bright}${colors.green}===== Release preparation complete =====\n${colors.reset}`,
  );
  log("Next steps:");
  log("1. Review the files that will be included in the package");
  log("2. Make any necessary changes to package.json or files list");
  log(
    `3. Run: ${colors.cyan}npm publish${colors.reset} to publish the package`,
  );
  log(
    `   For first-time publishing with public access: ${colors.cyan}npm publish --access public${colors.reset}`,
  );
}

// Run the script
prepareRelease().catch((error) => {
  log(`Error: ${error.message}`, colors.red);
  process.exit(1);
});
