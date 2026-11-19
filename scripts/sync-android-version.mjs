// package.json sürümünü Android'e aktarır: 1.2.3 -> versionName "1.2.3", versionCode 10203
import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const [major, minor, patch] = version.split(".").map((n) => parseInt(n, 10) || 0);
const code = major * 10000 + minor * 100 + patch;

const file = "android/app/build.gradle";
let gradle = readFileSync(file, "utf8");
gradle = gradle
  .replace(/versionCode\s+\d+/, `versionCode ${code}`)
  .replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);
writeFileSync(file, gradle);
console.log(`Android sürümü: ${version} (code ${code})`);
