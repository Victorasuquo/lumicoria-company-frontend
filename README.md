# Lumicoria Company Frontend

The React and Vite frontend for [Lumicoria.com](https://lumicoria.com), the enterprise delivery and applied research arm of Lumicoria Inc.

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run typecheck
npm run build
npm run preview
```

## Deployment

The repository is configured for Vercel with `vercel.json`. Connect the GitHub repository to a Vercel project and deploy the `main` branch. Vercel should detect Vite, run `npm run build`, and publish `dist/`.

## Content sources

Positioning, offer ranges, delivery phases, governance claims, and platform facts are derived from:

- `k8s/PRD docs/LUMICORIA_INC_MASTER_PRD.md`
- `k8s/PRD docs/LUMICORIA_COM_AGENCY_PRD.md`
- Root `DESIGN.md`
