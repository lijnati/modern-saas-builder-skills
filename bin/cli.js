#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SKILL_MD_PATH = path.join(ROOT_DIR, 'SKILL.md');
const REFERENCES_DIR = path.join(ROOT_DIR, 'references');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates');
const PKG_JSON_PATH = path.join(ROOT_DIR, 'package.json');

const pkg = JSON.parse(fs.readFileSync(PKG_JSON_PATH, 'utf8'));

const args = process.argv.slice(2);
const command = args[0] || 'help';

function printHelp() {
  console.log(`
\x1b[1m\x1b[36mModern SaaS Builder CLI\x1b[0m v${pkg.version}
Founder-minded senior product engineer & SaaS architect skill for AI agents.

\x1b[1mUsage:\x1b[0m
  npx modern-saas <command> [options]

\x1b[1mCommands:\x1b[0m
  \x1b[32minit [target]\x1b[0m       Install skill into your agent workspace/environment.
                     Targets: antigravity | claude | cursor | windsurf | agents | all
                     (Default: auto-detect or interactive prompt)

  \x1b[32mdoctor\x1b[0m             Run repository & skill integrity health checks.

  \x1b[32mexport\x1b[0m             Compile multi-file skill into single-file agent rules.
                     Options: --format <agents-md|cursor|rules> --output <path>

  \x1b[32mtemplates\x1b[0m          List available SaaS starter templates.

  \x1b[32mscaffold <name>\x1b[0m    Scaffold a production SaaS template into your project.
                     Example: npx modern-saas scaffold docker ./deploy

  \x1b[32mversion, -v\x1b[0m        Show current version.
  \x1b[32mhelp, -h\x1b[0m           Show this help message.

\x1b[1mExamples:\x1b[0m
  $ npx modern-saas init cursor
  $ npx modern-saas export --format agents-md --output ./AGENTS.md
  $ npx modern-saas scaffold stripe ./src/app/api/webhook
`);
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function runDoctor() {
  console.log('\x1b[1m\x1b[34m[+] Running Modern SaaS Builder Health Checks...\x1b[0m\n');
  let hasErrors = false;

  // 1. Check SKILL.md
  if (fs.existsSync(SKILL_MD_PATH)) {
    const content = fs.readFileSync(SKILL_MD_PATH, 'utf8');
    if (content.startsWith('---') && content.includes('name: modern-saas-builder')) {
      console.log(' \x1b[32m✓\x1b[0m SKILL.md exists and contains valid YAML frontmatter');
    } else {
      console.log(' \x1b[31m✗\x1b[0m SKILL.md is missing valid YAML frontmatter');
      hasErrors = true;
    }
  } else {
    console.log(' \x1b[31m✗\x1b[0m SKILL.md not found at root');
    hasErrors = true;
  }

  // 2. Check References
  if (fs.existsSync(REFERENCES_DIR)) {
    const refs = fs.readdirSync(REFERENCES_DIR).filter(f => f.endsWith('.md'));
    console.log(` \x1b[32m✓\x1b[0m References directory found with ${refs.length} playbooks`);
  } else {
    console.log(' \x1b[31m✗\x1b[0m References directory is missing');
    hasErrors = true;
  }

  // 3. Check Templates
  if (fs.existsSync(TEMPLATES_DIR)) {
    const templates = fs.readdirSync(TEMPLATES_DIR);
    console.log(` \x1b[32m✓\x1b[0m Templates directory found with ${templates.length} starter modules`);
  } else {
    console.log(' \x1b[33m!\x1b[0m Templates directory is missing or empty');
  }

  // 4. Scripts
  const scriptsDir = path.join(ROOT_DIR, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const scripts = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.sh'));
    console.log(` \x1b[32m✓\x1b[0m Verification shell scripts found (${scripts.join(', ')})`);
  }

  console.log('\n\x1b[1mStatus:\x1b[0m ' + (hasErrors ? '\x1b[31mIssues detected\x1b[0m' : '\x1b[32mAll core checks passed!\x1b[0m'));
  process.exit(hasErrors ? 1 : 0);
}

function runInit(target) {
  const cwd = process.cwd();
  const validTargets = ['antigravity', 'claude', 'cursor', 'windsurf', 'agents', 'all'];
  const selectedTarget = target ? target.toLowerCase() : 'all';

  if (!validTargets.includes(selectedTarget)) {
    console.error(`\x1b[31mUnknown target: ${target}\x1b[0m. Valid targets are: ${validTargets.join(', ')}`);
    process.exit(1);
  }

  console.log(`\x1b[1m\x1b[36mInstalling Modern SaaS Builder into [${selectedTarget}]...\x1b[0m\n`);

  if (selectedTarget === 'antigravity' || selectedTarget === 'all') {
    const dest = path.join(cwd, '.agents', 'skills', 'modern-saas-builder');
    copyDirRecursive(ROOT_DIR, dest);
    console.log(` \x1b[32m✓\x1b[0m Installed Antigravity / Agent skill to \x1b[34m.agents/skills/modern-saas-builder\x1b[0m`);
  }

  if (selectedTarget === 'claude' || selectedTarget === 'all') {
    const claudeDir = path.join(cwd, '.claude', 'skills', 'modern-saas-builder');
    copyDirRecursive(ROOT_DIR, claudeDir);
    console.log(` \x1b[32m✓\x1b[0m Installed Claude Code skill to \x1b[34m.claude/skills/modern-saas-builder\x1b[0m`);
  }

  if (selectedTarget === 'cursor' || selectedTarget === 'all') {
    const cursorRulesDir = path.join(cwd, '.cursor', 'rules');
    if (!fs.existsSync(cursorRulesDir)) fs.mkdirSync(cursorRulesDir, { recursive: true });
    
    // Generate compiled .cursor/rules/modern-saas-builder.mdc
    const mdcContent = `---
description: Founder-minded senior product engineer and SaaS architect rules.
globs: *
---

${fs.readFileSync(SKILL_MD_PATH, 'utf8')}
`;
    fs.writeFileSync(path.join(cursorRulesDir, 'modern-saas-builder.mdc'), mdcContent);
    console.log(` \x1b[32m✓\x1b[0m Created Cursor rule at \x1b[34m.cursor/rules/modern-saas-builder.mdc\x1b[0m`);
  }

  if (selectedTarget === 'windsurf' || selectedTarget === 'all') {
    const windsurfFile = path.join(cwd, '.windsurfrules');
    fs.writeFileSync(windsurfFile, fs.readFileSync(SKILL_MD_PATH, 'utf8'));
    console.log(` \x1b[32m✓\x1b[0m Created Windsurf rules at \x1b[34m.windsurfrules\x1b[0m`);
  }

  if (selectedTarget === 'agents' || selectedTarget === 'all') {
    const agentsFile = path.join(cwd, 'AGENTS.md');
    fs.writeFileSync(agentsFile, fs.readFileSync(SKILL_MD_PATH, 'utf8'));
    console.log(` \x1b[32m✓\x1b[0m Created unified \x1b[34mAGENTS.md\x1b[0m in current workspace root`);
  }

  console.log('\n\x1b[32mInstallation complete! Your AI agents are now empowered with the Modern SaaS Builder skill.\x1b[0m\n');
}

function runExport(options) {
  const formatIndex = options.indexOf('--format');
  const outputIndex = options.indexOf('--output');

  const format = formatIndex !== -1 ? options[formatIndex + 1] : 'agents-md';
  const outputPath = outputIndex !== -1 ? options[outputIndex + 1] : 'AGENTS.md';

  const skillContent = fs.readFileSync(SKILL_MD_PATH, 'utf8');
  let compiledOutput = `${skillContent}\n\n---\n\n# Architectural Reference Catalog\n\n`;

  if (fs.existsSync(REFERENCES_DIR)) {
    const refs = fs.readdirSync(REFERENCES_DIR).filter(f => f.endsWith('.md'));
    for (const ref of refs) {
      const refBody = fs.readFileSync(path.join(REFERENCES_DIR, ref), 'utf8');
      compiledOutput += `\n\n## Reference: ${ref}\n\n${refBody}\n\n---\n`;
    }
  }

  const targetPath = path.resolve(process.cwd(), outputPath);
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(targetPath, compiledOutput, 'utf8');
  console.log(`\x1b[32m✓\x1b[0m Successfully compiled skill + references to \x1b[34m${outputPath}\x1b[0m (${(Buffer.byteLength(compiledOutput) / 1024).toFixed(1)} KB)`);
}

function runTemplates() {
  console.log('\x1b[1m\x1b[36mAvailable SaaS Starter Templates:\x1b[0m\n');
  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.log('No templates directory found.');
    return;
  }

  const categories = fs.readdirSync(TEMPLATES_DIR);
  for (const cat of categories) {
    const catPath = path.join(TEMPLATES_DIR, cat);
    if (fs.statSync(catPath).isDirectory()) {
      console.log(` \x1b[1m\x1b[33m${cat}/\x1b[0m`);
      const files = fs.readdirSync(catPath);
      for (const f of files) {
        console.log(`   - ${cat}/${f}`);
      }
    } else {
      console.log(` - ${cat}`);
    }
  }
  console.log('\nUse \x1b[32mnpx modern-saas scaffold <category/file> <destination>\x1b[0m to scaffold.');
}

function runScaffold(templateName, destArg) {
  if (!templateName) {
    console.error('\x1b[31mError: Please specify a template name.\x1b[0m Example: npx modern-saas scaffold docker ./deploy');
    process.exit(1);
  }

  const sourcePath = path.join(TEMPLATES_DIR, templateName);
  if (!fs.existsSync(sourcePath)) {
    console.error(`\x1b[31mError: Template '${templateName}' not found in templates directory.\x1b[0m`);
    runTemplates();
    process.exit(1);
  }

  const destination = path.resolve(process.cwd(), destArg || '.');
  const stat = fs.statSync(sourcePath);

  if (stat.isDirectory()) {
    copyDirRecursive(sourcePath, destination);
    console.log(`\x1b[32m✓\x1b[0m Scaffolded template directory \x1b[33m${templateName}\x1b[0m to \x1b[34m${destination}\x1b[0m`);
  } else {
    const targetFilePath = fs.existsSync(destination) && fs.statSync(destination).isDirectory()
      ? path.join(destination, path.basename(sourcePath))
      : destination;
    const targetDir = path.dirname(targetFilePath);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(sourcePath, targetFilePath);
    console.log(`\x1b[32m✓\x1b[0m Scaffolded \x1b[33m${templateName}\x1b[0m to \x1b[34m${targetFilePath}\x1b[0m`);
  }
}

// Router
switch (command) {
  case 'init':
    runInit(args[1]);
    break;
  case 'doctor':
  case 'check':
    runDoctor();
    break;
  case 'export':
  case 'compile':
    runExport(args.slice(1));
    break;
  case 'templates':
  case 'list-templates':
    runTemplates();
    break;
  case 'scaffold':
    runScaffold(args[1], args[2]);
    break;
  case '-v':
  case '--version':
  case 'version':
    console.log(`v${pkg.version}`);
    break;
  case '-h':
  case '--help':
  case 'help':
  default:
    printHelp();
    break;
}
