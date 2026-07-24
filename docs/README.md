# Lumicoria Company Frontend Documentation

This directory contains the implementation and API documentation for the Lumicoria.com client portal.

## Documents

| Document | Purpose |
|---|---|
| [Client Portal Frontend Guide](./CLIENT_PORTAL_FRONTEND_GUIDE.md) | Architecture, setup, authentication, tenancy, frontend routes, API usage, errors, deployment, and extension workflow |
| [Generated Endpoint Reference](./generated/CLIENT_PORTAL_ENDPOINT_REFERENCE.md) | Every client-safe HTTP operation, including permissions, parameters, request bodies, response types, and generated TypeScript operation keys |
| [Generated Schema Reference](./generated/CLIENT_PORTAL_SCHEMA_REFERENCE.md) | Every client-safe component schema and its generated TypeScript type |

## Contract Status

The first frontend integration generated types for 135 client-safe operations. The current backend client contract exposes 147 operations and 138 component schemas. The committed generated TypeScript and documentation have been synchronized to the current contract.

## Regeneration

Start the backend on `http://127.0.0.1:8000`, then run:

```bash
npm run api:sync
```

This command updates:

- `src/api/generated/schema.ts`
- `docs/generated/CLIENT_PORTAL_ENDPOINT_REFERENCE.md`
- `docs/generated/CLIENT_PORTAL_SCHEMA_REFERENCE.md`

The frontend must only generate browser-facing types and documentation from:

```text
http://127.0.0.1:8000/openapi/client.json
```

Do not use the full or internal OpenAPI contracts for browser code.
