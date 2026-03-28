#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_THRESHOLDS = {
  mainPackageLimitMB: 1.0,
  totalPackageLimitMB: 1.2,
  functionPackageLimitMB: 1.0
};

const DEFAULT_FUNCTIONS = ['user', 'task', 'point', 'growth', 'mcp'];

function parseArgs(argv) {
  const args = {
    ...DEFAULT_THRESHOLDS,
    output: '',
    failOnThreshold: false,
    functions: [...DEFAULT_FUNCTIONS]
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === '--main-limit-mb' && next) {
      args.mainPackageLimitMB = Number(next);
      i += 1;
    } else if (token === '--total-limit-mb' && next) {
      args.totalPackageLimitMB = Number(next);
      i += 1;
    } else if (token === '--fn-limit-mb' && next) {
      args.functionPackageLimitMB = Number(next);
      i += 1;
    } else if (token === '--output' && next) {
      args.output = next;
      i += 1;
    } else if (token === '--functions' && next) {
      args.functions = next.split(',').map((v) => v.trim()).filter(Boolean);
      i += 1;
    } else if (token === '--fail-on-threshold') {
      args.failOnThreshold = true;
    }
  }

  return args;
}

function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out;
}

function sumFileBytes(files) {
  return files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
}

function bytesToMB(bytes) {
  return Number((bytes / (1024 * 1024)).toFixed(3));
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function loadAppConfig(miniprogramRoot) {
  const appJsonPath = path.join(miniprogramRoot, 'app.json');
  const raw = fs.readFileSync(appJsonPath, 'utf8');
  return JSON.parse(raw);
}

function calcMiniProgramSize(repoRoot, thresholds) {
  const miniprogramRoot = path.join(repoRoot, 'miniprogram');
  const files = walkFiles(miniprogramRoot);
  const totalBytes = sumFileBytes(files);

  const appConfig = loadAppConfig(miniprogramRoot);
  const subRoots = (appConfig.subpackages || [])
    .map((pkg) => String(pkg.root || '').trim())
    .filter(Boolean)
    .map((v) => toPosix(v.replace(/^\/+/, '').replace(/\/+$/, '')));

  const subpackageBytes = {};
  let mainPackageBytes = 0;

  for (const file of files) {
    const rel = toPosix(path.relative(miniprogramRoot, file));
    const size = fs.statSync(file).size;
    const matchedRoot = subRoots.find((root) => rel === root || rel.startsWith(`${root}/`));
    if (!matchedRoot) {
      mainPackageBytes += size;
    } else {
      subpackageBytes[matchedRoot] = (subpackageBytes[matchedRoot] || 0) + size;
    }
  }

  const mainPackageMB = bytesToMB(mainPackageBytes);
  const totalPackageMB = bytesToMB(totalBytes);

  return {
    miniprogramRoot: toPosix(path.relative(repoRoot, miniprogramRoot)),
    totalBytes,
    totalPackageMB,
    mainPackageBytes,
    mainPackageMB,
    subpackages: Object.fromEntries(
      Object.entries(subpackageBytes).map(([k, v]) => [k, { bytes: v, mb: bytesToMB(v) }])
    ),
    gate: {
      mainPackageLimitMB: thresholds.mainPackageLimitMB,
      totalPackageLimitMB: thresholds.totalPackageLimitMB,
      mainPackagePass: mainPackageMB <= thresholds.mainPackageLimitMB,
      totalPackagePass: totalPackageMB <= thresholds.totalPackageLimitMB
    }
  };
}

function calcCloudFunctionSizes(repoRoot, thresholds, fnNames) {
  const cloudRoot = path.join(repoRoot, 'cloudfunctions');
  const list = {};
  for (const name of fnNames) {
    const fnDir = path.join(cloudRoot, name);
    if (!fs.existsSync(fnDir)) {
      list[name] = {
        exists: false,
        totalBytes: 0,
        totalMB: 0,
        nodeModulesBytes: 0,
        nodeModulesMB: 0,
        codeBytes: 0,
        codeMB: 0,
        pass: true
      };
      continue;
    }

    const files = walkFiles(fnDir);
    const totalBytes = sumFileBytes(files);
    const nodeModulesFiles = walkFiles(path.join(fnDir, 'node_modules'));
    const nodeModulesBytes = sumFileBytes(nodeModulesFiles);
    const codeBytes = totalBytes - nodeModulesBytes;
    const totalMB = bytesToMB(totalBytes);

    list[name] = {
      exists: true,
      totalBytes,
      totalMB,
      nodeModulesBytes,
      nodeModulesMB: bytesToMB(nodeModulesBytes),
      codeBytes,
      codeMB: bytesToMB(codeBytes),
      pass: totalMB <= thresholds.functionPackageLimitMB
    };
  }

  return {
    cloudfunctionRoot: toPosix(path.relative(repoRoot, cloudRoot)),
    functionPackageLimitMB: thresholds.functionPackageLimitMB,
    functions: list
  };
}

function buildReport(repoRoot, args) {
  const miniprogram = calcMiniProgramSize(repoRoot, args);
  const cloudfunctions = calcCloudFunctionSizes(repoRoot, args, args.functions);
  const functionPass = Object.values(cloudfunctions.functions).every((v) => v.pass);
  const pass =
    miniprogram.gate.mainPackagePass &&
    miniprogram.gate.totalPackagePass &&
    functionPass;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: toPosix(repoRoot),
    thresholds: {
      mainPackageLimitMB: args.mainPackageLimitMB,
      totalPackageLimitMB: args.totalPackageLimitMB,
      functionPackageLimitMB: args.functionPackageLimitMB
    },
    miniprogram,
    cloudfunctions,
    pass
  };
}

function printSummary(report) {
  const mini = report.miniprogram;
  console.log('== Release Size Summary ==');
  console.log(
    `MiniProgram main/limit: ${mini.mainPackageMB}MB / ${mini.gate.mainPackageLimitMB}MB (${mini.gate.mainPackagePass ? 'PASS' : 'FAIL'})`
  );
  console.log(
    `MiniProgram total/limit: ${mini.totalPackageMB}MB / ${mini.gate.totalPackageLimitMB}MB (${mini.gate.totalPackagePass ? 'PASS' : 'FAIL'})`
  );
  console.log(`CloudFunction limit: ${report.cloudfunctions.functionPackageLimitMB}MB`);
  for (const [name, item] of Object.entries(report.cloudfunctions.functions)) {
    const state = item.pass ? 'PASS' : 'FAIL';
    const status = item.exists ? `${item.totalMB}MB` : 'missing';
    console.log(`- ${name}: ${status} (${state})`);
  }
  console.log(`Overall: ${report.pass ? 'PASS' : 'FAIL'}`);
}

function writeReport(report, outputPath, repoRoot) {
  const abs = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(repoRoot, outputPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Report written: ${toPosix(path.relative(repoRoot, abs))}`);
}

function main() {
  const repoRoot = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const report = buildReport(repoRoot, args);
  printSummary(report);
  if (args.output) {
    writeReport(report, args.output, repoRoot);
  }
  if (args.failOnThreshold && !report.pass) {
    process.exitCode = 2;
  }
}

main();

