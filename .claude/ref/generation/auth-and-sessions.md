# Auth & Session Management

**Version:** 1.0
**Status:** ACTIVE
**Authority:** Extends Consumer-Pro KB Section 06 (Security & Privacy)
**Scope:** Ecosystem Tools only (Richi Hub, Ventura, Media, future Open Services)

---

## Scope

This guide applies **only to Ecosystem Tools** — projects that share the
Supabase project `mhhmihzgwqtjyrktpdxw` and operate under `*.richi.solutions`.

**Independent Products** (MovieMind, Memobot, Hookr) use their own Supabase
projects and their own auth. This guide does not apply to them.

See `ecosystem-vs-products.md` for the full taxonomy.

---

## Architecture

Ecosystem Tools use **cookie-based session storage** to enable cross-subdomain
authentication. Login on any `*.richi.solutions` service authenticates the user
on all others.

```
User logs in on richi.solutions
  -> Supabase SDK stores session via cookieStorage
  -> Cookie set with domain=.richi.solutions
  -> All *.richi.solutions subdomains read the same cookie
  -> useAuth() on any subdomain picks up the session
  -> User is authenticated everywhere
```

## Cookie Storage Adapter

The adapter is distributed via the orchestrator `sync/` mechanism to
`src/lib/cookie-storage.ts` in every repo. Ecosystem Tools import it;
Independent Products ignore it.

### Integration (Ecosystem Tools Only)

```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import { cookieStorage } from '@/lib/cookie-storage';

export const supabase = createClient(url, key, {
  auth: {
    storage: cookieStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

### How It Works

- Implements Supabase's `SupportedStorage` interface (`getItem`, `setItem`, `removeItem`)
- Writes cookies with `domain=.richi.solutions` in production
- `SameSite=Lax` and `Secure` flag in production
- **Chunking**: sessions larger than 3.5KB are split across multiple cookies
  (`key.0`, `key.1`, ...) to stay under the 4KB browser limit

### Adding a New Open Service

1. Ensure the service uses the shared Supabase project (`mhhmihzgwqtjyrktpdxw`)
2. Import `cookieStorage` from `@/lib/cookie-storage` (auto-distributed via sync)
3. Set `auth.storage: cookieStorage` in the Supabase client config
4. Login buttons redirect to `https://richi.solutions/<lang>/auth?redirect=<url>&product=<name>`
5. Add the service domain to `ALLOWED_REDIRECT_DOMAINS` in Richi Hub `Auth.tsx`
6. Done -- no callback pages, no token passing needed

### Login Flow

```
1. User on ventura.richi.solutions clicks "Anmelden"
2. Redirect to richi.solutions/de/auth?redirect=<current-url>&product=Ventura
3. User authenticates on richi.solutions
4. Supabase stores session as cookie (domain=.richi.solutions)
5. Auth.tsx redirects back to ventura.richi.solutions
6. Cookie is already available on the subdomain
7. useAuth() reads session -- user is authenticated
```

### Logout

`supabase.auth.signOut()` calls `cookieStorage.removeItem()` which deletes
the cookie for `domain=.richi.solutions`. All subdomains lose the session
on next page load.

```typescript
signOut().catch(() => {}).finally(() => {
  window.location.reload();
});
```

### Security

| Property | Value |
|----------|-------|
| `SameSite` | `Lax` |
| `Secure` | `true` in production |
| `HttpOnly` | `false` (SPA requires JS access) |
| `domain` | `.richi.solutions` |
| Token lifetime | Controlled by Supabase (access ~1h, refresh ~60d) |

### Limitations

- Not `HttpOnly` (same tradeoff as localStorage in any SPA)
- Logout not instantly visible in already-open tabs on other subdomains
- `domain=.localhost` does not work -- local dev is single-origin only

### Independent Products: No Changes

Independent Products (MovieMind, Memobot, Hookr) continue using
`storage: localStorage` with their own Supabase projects. The
`cookie-storage.ts` file distributed via sync can be ignored.
