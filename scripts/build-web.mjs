import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(projectRoot, 'www');
const files = [
  'index.html', 'app.js', 'pictures.js', 'pictures.css', 'voice-studio.js', 'family.js', 'style.css', 'design.css', 'voice-studio.css', 'family.css', 'storybook.css', 'sw.js',
  'manifest.webmanifest', 'icon.png', 'icon-192.png', 'icon-512.png',
];

await mkdir(outputRoot, { recursive: true });
// Replacing SVG artwork with PNG must not leave stale generated SVG assets.
await rm(join(outputRoot, 'assets'), { recursive: true, force: true });
await rm(join(outputRoot, 'icon.svg'), { force: true });
for (const file of files) {
  await stat(join(projectRoot, file));
  await cp(join(projectRoot, file), join(outputRoot, file), { force: true });
}
await cp(join(projectRoot, 'assets'), join(outputRoot, 'assets'), { recursive: true, force: true });
console.log(`PWA / Android web bundle ready: ${outputRoot}`);
