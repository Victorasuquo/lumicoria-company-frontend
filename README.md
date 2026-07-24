# Lumicoria Company Frontend

The React and Vite frontend for [Lumicoria.com](https://lumicoria.com), the enterprise delivery and applied research arm of Lumicoria Inc.

The homepage uses React 19, TypeScript, Motion, Phosphor Icons, and a custom responsive glass-and-editorial design system.

The client portal is available under `/portal` and uses Firebase Authentication, HTTP-only backend sessions, organization-scoped access, and the generated client-safe FastAPI contract.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Run the portal API on `http://127.0.0.1:8000`, or set `VITE_PORTAL_API_ORIGIN` to its URL. Add the matching Firebase web app values from the backend's Firebase project before testing sign-in.

Regenerate the typed API contract while the backend is running:

```bash
npm run api:types
```

## Validation

```bash
npm run typecheck
npm run build
npm run preview
```

## Deployment

The repository is configured for Vercel with `vercel.json`. Connect the GitHub repository to a Vercel project and deploy the `main` branch. Vercel should detect Vite, run `npm run build`, and publish `dist/`.

Configure `VITE_PORTAL_API_ORIGIN` and all `VITE_FIREBASE_*` values in Vercel. The portal intentionally has no production API fallback when `VITE_PORTAL_API_ORIGIN` is missing.

## Content sources

Positioning, offer ranges, delivery phases, governance claims, and platform facts are derived from:

- `k8s/PRD docs/LUMICORIA_INC_MASTER_PRD.md`
- `k8s/PRD docs/LUMICORIA_COM_AGENCY_PRD.md`
- Root `DESIGN.md`
