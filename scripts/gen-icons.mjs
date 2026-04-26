import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const srcSvg = resolve(projectRoot, 'public/camera-icon.svg');

const targets = [
  { size: 192, file: 'public/icon-192.png' },
  { size: 512, file: 'public/icon-512.png' },
  // apple-touch-icon は 192 を流用
  { size: 192, file: 'public/apple-touch-icon.png' },
];

const svg = await readFile(srcSvg, 'utf8');

for (const { size, file } of targets) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png = resvg.render().asPng();
  await writeFile(resolve(projectRoot, file), png);
  console.log(`generated: ${file} (${size}x${size})`);
}
