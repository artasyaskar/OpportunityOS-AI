# Deployment & Environment Guide (Stage 4)

OpportunityOS AI is optimized for deployment on Vercel. 

## Environment Separation

You must maintain separate environments to protect production data:

1. **Development (`.env.local`)**
   - Uses local `.env` variables.
   - Points to development/staging Firebase project.
   - `NEXT_PUBLIC_DEMO_MODE=true` is recommended to prevent burning real API credits during UI testing.
   - Never commit this file.

2. **Production (Vercel Environment Variables)**
   - Configured directly inside the Vercel Dashboard (Project Settings -> Environment Variables).
   - Points to your **Production** Firebase project.
   - `NEXT_PUBLIC_DEMO_MODE=false`.

## Required Secrets Management (Vercel)

Before your first deployment, ensure all of these exact variables from `.env.example` are added to your Vercel project:

**Core Infrastructure:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**Backend Security (Never expose to client):**
- `FIREBASE_CLIENT_EMAIL` (from service account JSON)
- `FIREBASE_PRIVATE_KEY` (from service account JSON - remember to keep the \n newlines intact)

**Cloudflare R2 (Evidence Engine Storage):**
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET` (e.g., `opportunityos-prod`)

**AI Providers:**
- `GEMINI_API_KEY` (Primary Agent logic)
- `GROQ_API_KEY` (Fallback / Fast Chat logic)

## CI/CD Workflow

A GitHub Actions pipeline is configured at `.github/workflows/ci.yml`.

On every push to `main` or Pull Request:
1. Runs `npm ci`
2. Runs TypeScript type checking (`npx tsc --noEmit`)
3. Runs ESLint
4. Executes a mock production build to ensure compilation success.

If any of these fail, the PR cannot be merged, protecting your production environment from broken code.

## How to Deploy

1. Connect your GitHub repository to Vercel.
2. Ensure Framework Preset is set to **Next.js**.
3. Vercel will automatically read the `vercel.json` file for security header configurations.
4. Add the required environment variables.
5. Click **Deploy**.
