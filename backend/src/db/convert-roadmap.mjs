// Usage: node scripts/convert-roadmap.mjs <in.json> <out.json>
// Debug helper: converts one Balsamiq roadmap export with the same code the seed uses.
import fs from 'node:fs';
import { convertLayout } from '../src/lib/roadmapLayout.js';

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error('Usage: node scripts/convert-roadmap.mjs <in.json> <out.json>');
  process.exit(1);
}
const layout = convertLayout(JSON.parse(fs.readFileSync(inFile, 'utf8')));
fs.writeFileSync(outFile, JSON.stringify(layout, null, 1));
console.log(`topics: ${layout.topics.length}, edges: ${layout.edges.length}`);
