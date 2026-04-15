# GC Forms Identity Portal - Copilot Instructions

## Overview
This is a **Next.js 16 App Router** identity portal for GC Forms, integrating with **Zitadel** for authentication. It handles login, registration, password management, and MFA (TOTP, U2F, Email OTP). Supports OIDC authentication flows.

## Key Architecture

### Component Organization
- **Server Components**: Default in `app/` and `components/serverComponents/` - use `serverTranslation()` for i18n
- **Client Components**: Require `"use client"` directive, placed in `components/clientComponents/` - use `useTranslation()` hook
- **Path aliases** (see [tsconfig.json](../tsconfig.json)): `@lib/*`, `@components/*`, `@i18n`, `@root/*`

### Authentication Flow
1. `/login` route handles OIDC request initiation ([app/(api)/login/route.ts](../app/(api)/login/route.ts))
2. Session state managed via HTTP-only cookies ([lib/cookies.ts](../lib/cookies.ts))
3. Auth completion via server actions ([lib/server/auth-flow.ts](../lib/server/auth-flow.ts))
4. Zitadel API integration in [lib/zitadel.ts](../lib/zitadel.ts) (1500+ lines - search first, read specific functions)

### Server Actions Pattern
Use `"use server"` directive and return `{ error: string } | { redirect: string }`:
```typescript
// app/(auth)/password/actions.ts
export const submitPasswordForm = async (
  command: SubmitPasswordCommand
): Promise<{ error: string } | { redirect: string }> => {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);
  // ... validation and Zitadel API calls
};
```

## Conventions

### i18n
- Namespaced JSON in `i18n/locales/{en,fr}.json` - add keys to both files
- Server: `const { t } = await serverTranslation("namespace")`
- Client: `const { t } = useTranslation("namespace")` or `<I18n i18nKey="key" namespace="ns" />`

### Validation
Use Valibot schemas in [lib/validationSchemas.ts](../lib/validationSchemas.ts). Error messages are i18n keys:
```typescript
v.minLength(1, "requiredFirstname") // maps to validation.requiredFirstname
```

### Logging

Use `logMessage` from `@lib/logger` for consistent logging. Look at eslint config for restrictions on logMessage usage. For info and warn, only string literals or template literals are allowed to ensure structured logging. For example:


```typescript
import { logMessage } from "@lib/logger";
logMessage.info("message");  // .warn(), .error(), .debug()
```
`
## Commands
```bash
pnpm dev          # Start dev server on port 3002
pnpm build        # Production build
pnpm lint         # ESLint (no-console is error)
pnpm type-check   # TypeScript validation
```

## Environment
- `ZITADEL_API_URL`: Zitadel instance URL
- `NEXT_PUBLIC_BASE_PATH`: URL base path (default: `/ui/v2` in Docker)
- Organization ID: hardcoded in [constants/config.ts](../constants/config.ts)

## Important Files
- [lib/zitadel.ts](../lib/zitadel.ts) - All Zitadel API functions (search by function name)
- [lib/session.ts](../lib/session.ts) - Session validation and loading
- [lib/cookies.ts](../lib/cookies.ts) - Cookie management (server-only)
- [components/mfa/](../components/mfa/) - MFA component patterns
