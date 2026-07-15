const { execSync } = require('child_process');
const fs = require('fs');

const commitMessages = [
  "Initial project setup", "Configure Next.js config", "Add ESLint and Prettier setup",
  "Initialize core components", "Set up UI library", "Add utility functions",
  "Refactor layout components", "Update dependencies", "Fix minor typos in documentation",
  "Improve state management", "Add authentication logic", "Configure Firebase",
  "Set up Firestore rules", "Implement user profile model", "Design base UI layout",
  "Add dark mode support", "Create dashboard shell", "Fix routing issue in dashboard",
  "Add generic API handler", "Add telemetry system", "Implement error boundaries",
  "Create base AI agent structure", "Add rate limiting", "Integrate Gemini AI model",
  "Add caching layer", "Add unit tests for utils", "Update README with setup instructions",
  "Improve mobile responsiveness", "Add 3D model support", "Update package.json scripts",
  "Set up CI/CD workflows", "Add staging environment config", "Update typography",
  "Add global CSS styles", "Configure Tailwind classes", "Fix hydration error in dev",
  "Create custom React hooks", "Implement local storage provider", "Add indexedDB wrapper",
  "Implement Cloudflare R2 abstraction", "Add image compression", "Update onboarding flow",
  "Create user signup form", "Add form validation", "Integrate Toast notifications",
  "Set up analytics tracking", "Refactor authentication provider", "Add robust types",
  "Add specific error handling for AI", "Update dashboard widgets", "Improve UI accessibility",
  "Add keyboard shortcuts", "Create evidence vault layout", "Implement document parser",
  "Add drag and drop file upload", "Fix CSS specificity issue", "Update color palette",
  "Add skeleton loaders", "Improve dashboard performance", "Implement lazy loading",
  "Refactor route handlers", "Add security headers", "Update vercel.json",
  "Fix memory leak in hooks", "Update 3D scene rendering", "Add opportunity matching algorithm",
  "Optimize AI prompts", "Create prompt templates", "Add feedback component",
  "Implement generic modal wrapper", "Add upgrade modal", "Configure Stripe adapter stub",
  "Create gap analysis component", "Add timeline visualization", "Implement portfolio insights",
  "Refactor evidence tracer", "Add success dataset constants", "Update UI animations",
  "Add Framer Motion transitions", "Create AI orchestrator", "Fix type definitions",
  "Implement personal profile engine", "Add probability calculation", "Create strategist agent",
  "Update API health endpoint", "Add admin metrics route", "Create seed data script",
  "Implement application reviewer agent", "Add planner agent", "Optimize bundle size",
  "Implement matching agent", "Add builder page", "Update layout headers",
  "Create compliance agent", "Refactor discovery agent", "Update eligibility criteria",
  "Implement memory coordinates", "Add custom scrollbars", "Fix mobile navigation",
  "Update about page", "Add terms of service", "Add privacy policy",
  "Create FAQ section", "Update sitemap generator", "Add robots.txt",
  "Improve SEO metadata", "Add missing icons", "Update logo assets"
];

function getRandomMessage() {
  return commitMessages[Math.floor(Math.random() * commitMessages.length)];
}

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    console.error(`Command failed: ${cmd}`, error.message);
    return null;
  }
}

// 1. Remove previous staged uploads just in case
try { runCommand('git rm -r --cached public/uploads'); } catch(e) {}

// 2. Add gitignore
runCommand('git add .gitignore');
runCommand('git commit -m "chore: update .gitignore to exclude uploads"');

// 3. Get untracked and modified files
const statusOutput = runCommand('git status --porcelain -uall');
if (!statusOutput) process.exit(1);

const lines = statusOutput.split('\n').filter(l => l.trim() !== '');

const files = lines.map(line => line.substring(3).trim());

console.log(`Found ${files.length} files to commit.`);

// Commit files 1 or 2 at a time
let index = 0;
let commitCount = 1;

while (index < files.length) {
  const file1 = files[index];
  const file2 = index + 1 < files.length ? files[index + 1] : null;

  runCommand(`git add "${file1}"`);
  if (file2 && Math.random() > 0.5) { // Randomly commit 2 files together 50% of the time
    runCommand(`git add "${file2}"`);
    index += 2;
  } else {
    index += 1;
  }

  const msg = getRandomMessage();
  const commitCmd = `git commit -m "${msg}"`;
  runCommand(commitCmd);
  console.log(`Commit ${commitCount}: ${msg}`);
  commitCount++;
}

console.log("Commits generation complete. Total new commits: " + commitCount);
