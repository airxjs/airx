import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, '..', 'output');

// Files to minify (entry points that benefit from bundling + minification)
const minifyTargets = [
  {
    input: 'index.js',
    output: 'index.min.js',
    bundle: true,
    format: 'esm',
  },
  {
    input: 'index.umd.cjs',
    output: 'index.umd.min.cjs',
    bundle: false,
    format: 'cjs',
  },
];

async function minify() {
  console.log('🗜️  Minifying bundles...');

  for (const target of minifyTargets) {
    const inputPath = join(outputDir, target.input);
    const outputPath = join(outputDir, target.output);

    if (!existsSync(inputPath)) {
      console.log(`  ⚠ ${target.input} not found, skipping`);
      continue;
    }

    const beforeSize = existsSync(outputPath) 
      ? (await import('fs').then(fs => fs.statSync(outputPath).size))
      : 0;

    await esbuild.build({
      entryPoints: [inputPath],
      outfile: outputPath,
      minify: true,
      bundle: target.bundle,
      format: target.format,
      platform: target.format === 'cjs' ? 'node' : 'neutral',
      // Tree-shake aggressively
      treeShaking: true,
      // Do not include license comments that add size
      legalComments: 'none',
    });

    const afterSize = (await import('fs')).statSync(outputPath).size;
    const reduction = beforeSize > 0 
      ? ((1 - afterSize / beforeSize) * 100).toFixed(1)
      : 'NEW';

    console.log(`  ✓ ${target.output}: ${beforeSize > 0 ? `${(beforeSize/1024).toFixed(1)}KB → ` : ''}${(afterSize/1024).toFixed(1)}KB${beforeSize > 0 ? ` (${reduction}% smaller)` : ''}`);
  }

  // Recursively remove ALL source maps from output/
  const { readdirSync, statSync } = await import('fs');
  function removeMapsInDir(dir) {
    let count = 0;
    try {
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          count += removeMapsInDir(fullPath);
        } else if (entry.endsWith('.js.map') || entry.endsWith('.d.ts.map')) {
          rmSync(fullPath);
          count++;
        }
      }
    } catch (e) {
      // ignore permission errors
    }
    return count;
  }

  const mapsRemoved = removeMapsInDir(outputDir);
  if (mapsRemoved > 0) {
    console.log(`🗑️  Removed ${mapsRemoved} source map files from output/`);
  }
}

minify().catch(console.error);
