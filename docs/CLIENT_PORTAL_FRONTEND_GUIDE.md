# Lumicoria Client Portal Frontend Guide

## 1. Purpose

The Lumicoria client portal is the authenticated application area of Lumicoria.com. It gives each client a tenant-isolated workspace for monitoring delivery, reviewing milestones, completing onboarding, downloading deliverables, recording decisions, and managing authorized portal users.

The portal lives under:

```text
/portal/*
```

The public marketing website remains outside that route tree.

The portal is invitation-only. It does not expose public self-registration or a browser screen that provisions a new client organization. Lumicoria administrators provision the organization, portal, client account, engagement, and initial invitation through the backend or an internal administration surface.

## 2. Contract Status

The first frontend integration generated TypeScript from 135 client-safe FastAPI operations. The current authoritative client contract contains:

| Contract area | Count |
|---|---:|
| Client-safe operations | 147 |
| Component schemas | 138 |
| Portal authentication | 10 |
| Portal administration | 22 |
| Organizations | 3 |
| Client contacts and stakeholders | 10 |
| Engagements and team | 8 |
| Delivery actions | 18 |
| Delivery resources | 20 |
| Deliverable actions | 6 |
| Deliverable files | 3 |
| Deliverable and review resources | 25 |
| Notifications | 4 |
| Voice configuration | 12 |
| Audit | 2 |
| Tenant operations | 2 |
| Public health | 1 |
| Client OpenAPI | 1 |

The generated TypeScript and reference documentation are synchronized to all 147 current client-safe operations.

Browser code must use only:

```text
{PORTAL_API_ORIGIN}/openapi/client.json
```

Never generate the customer portal bundle from `/openapi.json` or `/openapi/internal.json`. Those contracts expose internal and system-only operations.

## 3. Frontend Architecture

```text
src/
  api/
    client.ts
    generated/schema.ts
    resources.ts
    types.ts
  auth/
    AuthProvider.tsx
    RequirePortalSession.tsx
    firebase.ts
  portal/
    PortalApp.tsx
    PortalLayout.tsx
    hooks.ts
    query.ts
    portal.css
    components/
      PortalState.tsx
    pages/
      AuditPage.tsx
      DashboardPage.tsx
      DeliverablesPage.tsx
      InvitationPage.tsx
      LoginPage.tsx
      MilestonesPage.tsx
      NotificationsPage.tsx
      OnboardingPage.tsx
      OrganizationPickerPage.tsx
      ReviewsPage.tsx
      SettingsPage.tsx
      StatusReportsPage.tsx
      TeamPage.tsx
scripts/
  generate-api-docs.mjs
docs/
  CLIENT_PORTAL_FRONTEND_GUIDE.md
  generated/
    CLIENT_PORTAL_ENDPOINT_REFERENCE.md
    CLIENT_PORTAL_SCHEMA_REFERENCE.md
```

The portal application is lazy-loaded from `src/App.tsx`. Portal pages are also lazy-loaded so Firebase, React Query, and authenticated route code do not inflate the initial marketing-page bundle.

## 4. Runtime Dependencies

| Package | Purpose |
|---|---|
| `react-router-dom` | Authenticated portal routing |
| `@tanstack/react-query` | Tenant-aware server-state caching |
| `firebase` | User identity authentication |
| `openapi-fetch` | Generated-contract HTTP client |
| `openapi-typescript` | OpenAPI-to-TypeScript generation |

## 5. Environment Configuration

Copy the example environment:

```bash
cp .env.example .env.local
```

Configure:

```env
VITE_PORTAL_API_ORIGIN=http://127.0.0.1:8000
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_TENANT_ID=
```

The Firebase frontend values must belong to the same Firebase project and tenant configured by the backend.

Production intentionally has no localhost API fallback. `VITE_PORTAL_API_ORIGIN` must be configured in Vercel.

The backend must allow the exact frontend origin through `PORTAL_CORS_ORIGINS` and permit credentialed requests.

## 6. Local Development

Start the backend from the backend repository:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start this frontend:

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173/portal/login
```

Useful backend URLs:

| Resource | URL |
|---|---|
| Liveness | `http://127.0.0.1:8000/health/live` |
| Client-safe contract | `http://127.0.0.1:8000/openapi/client.json` |
| Development Swagger | `http://127.0.0.1:8000/docs` |

## 7. Contract Generation

The generated schema is committed so production builds do not require a running backend.

Generate TypeScript only:

```bash
npm run api:types
```

Generate endpoint and schema documentation only:

```bash
npm run api:docs
```

Synchronize everything:

```bash
npm run api:sync
```

The documentation generator also accepts a local contract file:

```bash
node scripts/generate-api-docs.mjs /absolute/path/to/client-openapi.json
```

Or an alternate contract URL:

```bash
PORTAL_OPENAPI_SOURCE=https://api.example.com/openapi/client.json npm run api:docs
```

Generated files must not be edited manually.

## 8. Using Generated Types

The complete contract is exported from:

```ts
import type {
  components,
  operations,
  paths,
} from '../api/generated/schema'
```

Use a component schema:

```ts
type PortalSession = components['schemas']['PortalSessionResponse']
type RequestContext = components['schemas']['RequestContextResponse']
```

Use an operation:

```ts
type CreateSessionOperation = operations['create_portal_session']
type ListEngagementsOperation = operations['list_engagements']
```

Use a path:

```ts
type EngagementCollectionPath =
  paths['/api/v1/client-portal/engagements']
```

Frequently used aliases live in `src/api/types.ts`. Add aliases there when a schema is used throughout multiple screens. Keep feature-specific response types near the page when they are only used once.

## 9. API Clients

### 9.1 `portalFetch`

`portalFetch` is the application request wrapper used by the current portal pages.

It:

- prefixes portal-relative paths with `/api/v1/client-portal`;
- permits direct `/health/*` and `/openapi/*` paths;
- sends `credentials: "include"`;
- sends `Accept: application/json`;
- sends JSON content type only when a body exists;
- adds `X-Organization-ID`;
- adds a temporary Firebase bearer token during identity exchange;
- adds `Idempotency-Key`;
- adds `If-Match`;
- parses structured problem responses;
- returns both typed data and the original `Response`.

Example:

```ts
import { portalFetch } from '../api/client'
import type { EngagementDashboard } from '../api/types'

export async function loadDashboard(
  organizationId: string,
  engagementId: string,
) {
  return portalFetch<EngagementDashboard>(
    `/engagements/${engagementId}/dashboard`,
    { organizationId },
  )
}
```

### 9.2 `contractClient`

`contractClient` is the generated `openapi-fetch` client. Use it for new resources when end-to-end request typing is more valuable than the smaller `portalFetch` wrapper.

```ts
import { contractClient } from '../api/client'

export async function listEngagements(organizationId: string) {
  const result = await contractClient.GET(
    '/api/v1/client-portal/engagements',
    {
      params: {
        header: {
          'X-Organization-ID': organizationId,
        },
        query: {
          page_size: 100,
        },
      },
    },
  )

  if (result.error) {
    throw result.error
  }

  return result.data
}
```

New code must not create an unrelated `fetch` wrapper with different session, error, or tenant behavior.

## 10. Request Rules

Every authenticated portal request must follow these rules:

1. Send `credentials: "include"` so the HTTP-only portal session cookie is included.
2. Send the selected `X-Organization-ID` for tenant-scoped resources.
3. Send `Accept: application/json`.
4. Send `Content-Type: application/json` only when a JSON body exists.
5. Preserve `ETag`, `Location`, `Retry-After`, and `X-Request-ID`.
6. Parse `application/problem+json`.
7. Never store the portal session credential in local storage.
8. Never send both `X-Organization-ID` and `X-Portal-Host` for different tenants.
9. Never use an organization or engagement identifier from an untrusted link until `/auth/context` confirms access.

The frontend may store the selected organization and engagement identifiers locally. It must revalidate them against the restored backend context on every application start.

## 11. Authentication Lifecycle

### 11.1 Standard Login

1. Firebase authenticates the email and password.
2. The frontend requests a fresh Firebase ID token.
3. `GET /auth/context` is called with the Firebase bearer token.
4. If the user has multiple destinations, `/portal/organizations` displays the organization picker.
5. `POST /auth/session` exchanges the Firebase token for the first-party portal session.
6. The backend sets an HTTP-only cookie.
7. The frontend loads `/auth/context` and `/auth/permissions` using the cookie.
8. The selected organization and first permitted engagement become active.

After session exchange, the Firebase ID token is not stored as the portal session.

### 11.2 Session Restoration

On application load:

1. Call `GET /auth/session`.
2. Read the locally selected organization, falling back to the session organization.
3. Call `/auth/context` and `/auth/permissions`.
4. Validate the locally selected engagement against `engagement_ids`.
5. Enter the authenticated portal or return to `/portal/login`.

### 11.3 Organization Switching

1. Call `POST /auth/context/switch`.
2. Reload context and permissions.
3. Revalidate the selected engagement.
4. Invalidate all React Query keys beginning with `portal`.

This prevents data from one tenant remaining visible after a tenant switch.

### 11.4 Logout

1. Call `DELETE /auth/session`.
2. Sign out from Firebase.
3. Clear React Query.
4. Clear in-memory session, context, permissions, destinations, and selected engagement.
5. Return to login.

### 11.5 Invitation Acceptance

1. Read the token from `/portal/invitations/:token`.
2. Call `GET /public/invitations/{invitation_token}`.
3. Display the organization, role, masked email, and expiry.
4. Sign in with the invited Firebase account.
5. Obtain a fresh Firebase bearer token.
6. Call `POST /public/invitations/{invitation_token}/accept`.
7. Create the first-party portal session for the returned organization.
8. Continue into `/portal`.

The verified Firebase email must match the invited email. The current invitation screen signs in an existing Firebase user; it does not create a Firebase account.

### 11.6 Password Reset

`POST /auth/password/reset-link` is deliberately non-enumerating. The UI must show the same confirmation regardless of whether the email exists.

## 12. Client Provisioning and First Login

The customer portal cannot provision meaningful client state from an empty database.

An internal administrator must prepare:

1. A Firebase identity with a verified client email.
2. An organization.
3. An active portal and portal host.
4. A client account.
5. An engagement.
6. A membership or invitation.
7. Engagement grants for the membership.
8. Optional milestones, onboarding items, status reports, deliverables, and notifications.

The client then:

1. Opens the invitation URL.
2. Signs in with the invited email.
3. Accepts the invitation.
4. Receives the first-party portal session.
5. Uses `/portal/login` for future visits.

Client creation belongs in a separate internal administration UI or backend workflow. It must not be added to the unauthenticated public portal.

## 13. Tenant Context and Permissions

`/auth/context` supplies:

- active `organization_id`;
- permitted `engagement_ids`;
- effective `scopes`;
- assurance level;
- actor classification;
- available portal destinations.

`/auth/permissions` supplies the effective permission map used for navigation and actions.

The portal hides unavailable features, but frontend visibility is not authorization. The backend remains authoritative.

Common scope gates:

| Capability | Scope |
|---|---|
| Portal shell | `portal.read` |
| Portal settings | `portal.manage` |
| Members and invitations | `portal.members.manage` |
| Engagement pages | `engagements.read` |
| Engagement health | `engagements.health.read` |
| Milestones | `milestones.read` |
| Milestone editing | `milestones.manage` |
| Milestone acceptance | `milestones.accept` |
| Onboarding | `onboarding.read` |
| Complete onboarding item | `onboarding.items.complete` |
| Status reports | `status_reports.read` |
| Acknowledge status | `status_reports.acknowledge` |
| Deliverables | `deliverables.read` |
| Upload deliverables | `deliverables.upload` |
| Review deliverables | `deliverables.review` |
| Record acceptance | `deliverables.approve` |
| Notifications | `notifications.read` |
| Audit | `security.audit.read` |
| Voice-agent reading | `voice.agents.read` |
| Voice-agent management | `voice.agents.manage` |
| Voice skill packs | `voice.skill_packs.read` |
| Voice compliance reading | `voice.compliance.read` |
| Voice compliance management | `voice.compliance.manage` |

Cross-tenant resources intentionally return concealed `404` responses.

## 14. React Query Conventions

Portal queries use:

```ts
['portal', organizationId, featureName, resourceId]
```

`usePortalQuery`:

- inserts the organization into the key;
- supplies `X-Organization-ID`;
- disables the query until context exists;
- prevents accidental cross-tenant cache reuse.

After mutations:

- invalidate only the affected feature where possible;
- invalidate the entire `['portal']` tree after switching organizations or logging out;
- retain idempotency keys while retrying the same mutation;
- preserve ETags beside cached resources when guarded edits are introduced.

## 15. Frontend Route and Endpoint Map

### 15.1 Public and Authentication Routes

| Frontend route | Endpoint use |
|---|---|
| `/portal/login` | `GET /health/live`, `GET/POST/DELETE /auth/session`, `GET /auth/context`, `GET /auth/permissions`, `POST /auth/password/reset-link` |
| `/portal/organizations` | `POST /auth/session`, `POST /auth/context/switch` |
| `/portal/invitations/:token` | `GET/POST /public/invitations/{invitation_token}`, `POST /auth/session` |

### 15.2 Authenticated Portal Routes

| Frontend route | Current endpoint use |
|---|---|
| `/portal` | Engagement list, dashboard, timeline, next actions, pending approvals, onboarding progress, optional health, latest status |
| `/portal/milestones` | Milestone collection |
| `/portal/onboarding` | Onboarding progress, checklist collection, checklist-item collection, complete checklist item |
| `/portal/status-reports` | Status-report collection, acknowledge status report |
| `/portal/deliverables` | Deliverable collection, signed download authorization |
| `/portal/reviews` | Review-cycle collection |
| `/portal/notifications` | Notification collection, unread count, mark read, mark all read |
| `/portal/team` | Engagement team-member collection |
| `/portal/settings` | Organization profile and membership collection |
| `/portal/audit` | Organization audit-event collection |

The endpoint reference documents every additional supported operation that has not yet received a dedicated screen.

## 16. Mutation Safety

### 16.1 Idempotency

When the contract declares `Idempotency-Key`, generate one UUID per user intent:

```ts
import { createIdempotencyKey } from '../api/client'

const idempotencyKey = createIdempotencyKey()
```

Reuse the same value while retrying that exact action. Generate a new value only when the user starts a new action. Reusing a key with different input returns `409`.

### 16.2 Optimistic Concurrency

For resources that return an `ETag`:

1. Store the response ETag beside the cached resource.
2. Send it through `If-Match` for guarded updates.
3. On `412`, refetch and show a reconciliation prompt.
4. On `428`, refetch because the required ETag was omitted.

Do not synthesize an ETag from a resource version.

### 16.3 Long-Running Operations

A `202 Accepted` response may include an operation resource and `Location`.

1. Poll the provided location.
2. Honour `Retry-After`.
3. Use bounded backoff.
4. Stop on `succeeded`, `failed`, or `cancelled`.
5. Surface `safe_error`, never an internal exception.
6. Offer cancellation only when `cancellable` is true.

## 17. Upload and Download Workflow

### 17.1 Upload

1. Read the file into an `ArrayBuffer`.
2. Compute a lowercase SHA-256 hex digest with `crypto.subtle.digest`.
3. Create an upload intent.
4. Upload directly to the returned storage URL.
5. Send every returned required header exactly.
6. Do not send the portal cookie or Firebase token to storage.
7. Complete the upload using the intent identifier and provider ETag.
8. Poll the returned operation when completion returns `202`.
9. Show the artifact as downloadable only after scanning succeeds.

Real upload tests require S3-compatible storage and scanner configuration.

### 17.2 Download

The deliverables page requests a short-lived download authorization from:

```text
GET /engagements/{engagement_id}/deliverables/{deliverable_id}/download
```

Open only the returned signed URL. Do not proxy storage credentials through browser state.

## 18. Voice-Agent Configuration

The client contract includes 12 voice configuration operations:

1. List skill packs.
2. Read a skill pack.
3. List agents.
4. Create an agent draft.
5. Read an agent.
6. Update an agent.
7. Archive an agent.
8. List agent versions.
9. Create an immutable agent version.
10. Read an agent version.
11. Read the compliance profile.
12. Update the compliance profile.

Recommended frontend flow:

1. Select one of the approved skill packs.
2. Create the draft with an idempotency key.
3. Cache its ETag.
4. Send `If-Match` for edit or archive.
5. Create immutable configuration versions rather than rewriting evidence.
6. Load compliance policy before exposing recording controls.
7. Require recent authentication before sensitive policy changes when backend policy enforces it.

The generated endpoint reference contains the exact paths, request schemas, permissions, and response schemas.

## 19. Error Handling

`PortalApiError` exposes:

```ts
type ProblemDetails = {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  code: string
  request_id: string
  errors: Array<Record<string, unknown>>
}
```

Handle errors by status and `code`, not by matching human-readable message text.

| HTTP | Frontend behavior |
|---:|---|
| `400` | Correct malformed context or input |
| `401` | Restore identity or return to login |
| `403` | Show permission, verification, or assurance requirement |
| `404` | Show unavailable without revealing cross-tenant existence |
| `409` | Refetch and explain state or idempotency conflict |
| `412` | Refetch stale data before retrying |
| `413` | Reject the oversized upload |
| `422` | Map structured errors to fields and domain feedback |
| `428` | Refetch to obtain the required ETag |
| `429` | Back off using `Retry-After` |
| `503` | Show degraded dependency state and allow a safe retry |

Always retain `request_id` in support-facing error details.

## 20. Adding a New Endpoint to the Frontend

1. Start the current backend.
2. Run `npm run api:sync`.
3. Review changes to generated operations and schemas.
4. Confirm the operation exists in the client-safe contract.
5. Identify required permissions and mutation controls.
6. Add or reuse a schema alias in `src/api/types.ts`.
7. Add a resource function or a typed `contractClient` call.
8. Use `usePortalQuery` for tenant-scoped reads.
9. Include the organization in every query key.
10. Add idempotency and ETag behavior when declared.
11. Invalidate the smallest affected query set after mutation.
12. Add loading, empty, error, and permission states.
13. Run typecheck, build, and the relevant browser flow.
14. Commit the generated contract and documentation with the feature.

## 21. Contract Drift and CI

CI should start the backend contract target and run:

```bash
npm ci
npm run api:sync
git diff --exit-code -- \
  src/api/generated/schema.ts \
  docs/generated/CLIENT_PORTAL_ENDPOINT_REFERENCE.md \
  docs/generated/CLIENT_PORTAL_SCHEMA_REFERENCE.md
npm run typecheck
npm run build
```

A generated diff means the backend contract changed and the frontend contract update has not been reviewed.

The CI contract target must expose `/openapi/client.json`. It must not expose the full internal contract to the browser generator.

## 22. Minimum Test Matrix

Automate:

- valid login and session restoration;
- expired or invalid session;
- multiple-organization selection and switching;
- invitation acceptance with matching verified email;
- invitation email mismatch;
- client role with hidden management actions;
- user without an engagement grant;
- dashboard loading with partial permissions;
- step-up session creation and expiry;
- idempotent retry and double-click protection;
- stale ETag handling;
- upload intent, direct upload, completion, scanning, and download;
- notification read and read-all replay;
- long-running operation success, failure, and cancellation;
- problem response rendering with request ID;
- logout clearing all tenant caches;
- marketing routes remaining functional outside `/portal/*`.

## 23. Deployment

Vercel must define:

```env
VITE_PORTAL_API_ORIGIN=https://your-portal-api.example.com
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
VITE_FIREBASE_TENANT_ID=your-firebase-tenant-id
```

The backend must:

- allow the deployed Lumicoria.com origin;
- use secure HTTP-only session cookies;
- use a cookie domain and SameSite policy compatible with the selected API topology;
- share the same Firebase project and tenant;
- expose the client-safe OpenAPI document;
- configure storage and scanning for real deliverable transfers.

Portal pages set `noindex, nofollow`, and `/portal` is disallowed in `robots.txt`.

## 24. Reference Documents

- `docs/generated/CLIENT_PORTAL_ENDPOINT_REFERENCE.md`
- `docs/generated/CLIENT_PORTAL_SCHEMA_REFERENCE.md`
- `src/api/generated/schema.ts`
- `src/api/client.ts`
- `src/api/resources.ts`
- `src/auth/AuthProvider.tsx`
- `src/portal/PortalApp.tsx`
