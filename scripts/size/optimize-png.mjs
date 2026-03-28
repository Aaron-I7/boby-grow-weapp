#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

function parseArgs(argv) {
  const args = {
    root: 'miniprogram/images/png',
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === '--root' && next) {
      args.root = next;
      i += 1;
    } else if (token === '--dry-run') {
      args.dryRun = true;
    }
  }
  return args;
}

function walkPngFiles(rootDir) {
  const out = [];
  if (!fs.existsSync(rootDir)) return out;
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
        out.push(full);
      }
    }
  }
  return out;
}

function relPath(repoRoot, target) {
  return path.relative(repoRoot, target).replace(/\\/g, '/');
}

async function optimizeOne(file, dryRun) {
  const input = fs.readFileSync(file);
  const output = await sharp(input)
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 10
    })
    .toBuffer();

  const before = input.length;
  const after = output.length;
  const saved = before - after;

  if (saved > 0 && !dryRun) {
    fs.writeFileSync(file, output);
  }

  return { before, after, saved, changed: saved > 0 };
}

async function main() {
  const repoRoot = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const root = path.isAbsolute(args.root) ? args.root : path.join(repoRoot, args.root);
  const files = walkPngFiles(root);

  let changedCount = 0;
  let totalBefore = 0;
  let totalAfter = 0;
  let totalSaved = 0;

  for (const file of files) {
    const result = await optimizeOne(file, args.dryRun);
    totalBefore += result.before;
    totalAfter += result.changed ? result.after : result.before;
    totalSaved += Math.max(result.saved, 0);
    if (result.changed) {
      changedCount += 1;
      console.log(`${relPath(repoRoot, file)}: -${result.saved} bytes`);
    }
  }

  console.log('== PNG Optimization Summary ==');
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files optimized: ${changedCount}`);
  console.log(`Total before: ${totalBefore} bytes`);
  console.log(`Total after: ${totalAfter} bytes`);
  console.log(`Total saved: ${totalSaved} bytes`);
  if (args.dryRun) {
    console.log('Dry run mode: no files were written.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

