const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file === 'route.ts') {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('checkRateLimit')) {
        content = "import { checkRateLimit } from '@/lib/rateLimiter';\n" + content;
        content = content.replace(/export async function POST\(req: NextRequest\) \{/, 
`export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimit.headers }
    );
  }`);
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('./src/app/api/agents');
