# Platform Unified Accounts User Portal

Next.js 16 App Router app for CDS Platform identity flows (login, password, MFA, verification), integrated with Zitadel.

## Quick start

Install dependencies:

```bash
pnpm install
```

Run locally (port 3002):

```bash
pnpm dev
```

Open: [http://localhost:3002](http://localhost:3002)

## Useful commands

```bash
pnpm dev         # start dev server
pnpm build       # production build
pnpm start       # run production server
pnpm lint        # run ESLint
pnpm lint:fix    # auto-fix lint issues
pnpm type-check  # TypeScript checks
pnpm test        # run tests
```

## Required environment variables

- `ZITADEL_API_URL`
- `NEXT_PUBLIC_BASE_PATH`

## Optional environment variables

- `NEXT_PUBLIC_ENABLE_EMAIL_OTP`

Set `NEXT_PUBLIC_ENABLE_EMAIL_OTP=true` to enable the email OTP flow. It defaults to `false` when unset.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind + SCSS
