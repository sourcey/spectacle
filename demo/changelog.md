---
title: Changelog
description: Recent updates and improvements to the Cheese Store API.
---

## v2.4.0 — March 2026

- Added `GET /cheeses/seasonal` endpoint for limited-edition seasonal varieties
- Webhook payloads now include `metadata` field for custom key-value pairs
- Improved rate limiting: 1000 requests/min for authenticated users (up from 500)
- Fixed incorrect `Content-Type` header on CSV export responses

## v2.3.1 — February 2026

- Fixed pagination bug where `next_cursor` returned null on exact page boundaries
- Improved search relevance for hyphenated cheese names (e.g. "Saint-Nectaire")
- Added `If-None-Match` support for conditional GET requests

## v2.3.0 — January 2026

- New `PATCH /orders/{id}` endpoint for partial order updates
- Added `fields` query parameter for sparse fieldsets on all list endpoints
- Subscription webhooks now retry with exponential backoff (max 5 attempts)
- Go SDK v1.2.0 released with context support on all methods

## v2.2.0 — December 2025

- Introduced bulk operations: `POST /cheeses/bulk` accepts up to 100 items
- Added `sort` and `order` parameters to all collection endpoints
- New `aging_profile` field on cheese resources with structured maturation data
- Python SDK now supports async/await via `aiohttp` transport

## v2.1.0 — November 2025

- OAuth 2.0 PKCE flow support for single-page applications
- New `/health` endpoint for uptime monitoring
- Added `created_at` and `updated_at` timestamps to all resources
- Fixed edge case where deleting a cheese in an active order returned 500
