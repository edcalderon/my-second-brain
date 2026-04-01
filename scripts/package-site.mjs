import { cpSync, mkdirSync, rmSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const dashboardOut = path.join(repoRoot, "apps/dashboard/out");
const dashboardPublic = path.join(repoRoot, "apps/dashboard/public");
const docsBuild = path.join(repoRoot, "apps/docs/build");
const publishRoot = path.join(repoRoot, "apps/dashboard/site");
const secondBrainRoot = path.join(publishRoot, "my-second-brain");

function copyDir(source, destination) {
    if (!existsSync(source)) {
        throw new Error(`Missing required source directory: ${source}`);
    }

    cpSync(source, destination, { recursive: true });
}

function copyFile(source, destination) {
    if (!existsSync(source)) {
        throw new Error(`Missing required source file: ${source}`);
    }

    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(source, destination);
}

rmSync(publishRoot, { recursive: true, force: true });
mkdirSync(secondBrainRoot, { recursive: true });

copyDir(dashboardOut, secondBrainRoot);
copyFile(path.join(dashboardPublic, "index.html"), path.join(publishRoot, "index.html"));
copyFile(path.join(dashboardPublic, "index.html"), path.join(publishRoot, "404.html"));
copyFile(path.join(dashboardPublic, "CNAME"), path.join(publishRoot, "CNAME"));
copyDir(path.join(dashboardPublic, "a-quant"), path.join(publishRoot, "a-quant"));

if (existsSync(docsBuild)) {
    copyDir(docsBuild, path.join(secondBrainRoot, "documentation"));
} else {
    throw new Error(`Missing required docs build output: ${docsBuild}`);
}

console.log(`Published site assembled at ${publishRoot}`);
