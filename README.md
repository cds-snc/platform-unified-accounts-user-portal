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
- `APP_HOSTS`
- `HCAPTCHA_SITE_KEY`
- `HCAPTCHA_SECRET`
- `FRESHDESK_API_URL`
- `FRESHDESK_API_KEY`
- `FRESHDESK_PRODUCT_ID`
- `FRESHDESK_GROUP_ID`
- `FRESHDESK_TAGS`
- `ZITADEL_SESSION_COOKIE_SECRET`
- `PASSWORD_RESET_SECRET`

`APP_HOSTS` is a comma-separated list of hostnames this deployment accepts (e.g. `auth.cdssandbox.xyz,localhost`). Matching is exact: subdomains are not included and scheme/port are ignored. Requests from any other host are rejected.

Each host should also have an entry in `SITES` ([constants/site-config.ts](constants/site-config.ts)), which sets the site's base URL and links. A host without an entry throws, except in development or PR review, where it falls back to the `dev` or `authStaging` site.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind + SCSS

## Local dev

If you're developing against our Staging environment, use the `make help` command to see how to connect to the VPN. You will need the [AWS VPN Client installed](https://docs.aws.amazon.com/vpn/latest/clientvpn-user/client-vpn-connect-macos-release-notes.html).