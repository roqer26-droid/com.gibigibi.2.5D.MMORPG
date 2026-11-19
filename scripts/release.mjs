// Kullanım: npm run release
// 1) Tek dosyalık oynanabilir derlemeyi alır, 2) releases/legendary-gems-v<sürüm>.html olarak yedekler.
// Sürüm numarasını önce package.json'da artır (npm version minor --no-git-tag-version).
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const target = `releases/legendary-gems-v${version}.html`;

if (existsSync(target)) {
  console.error(`HATA: ${target} zaten var. Önce sürümü artır: npm version minor --no-git-tag-version`);
  process.exit(1);
}
execSync("npm run build:single", { stdio: "inherit" });
mkdirSync("releases", { recursive: true });
copyFileSync("dist/index.html", target);
console.log(`\nYedeklendi: ${target}`);
