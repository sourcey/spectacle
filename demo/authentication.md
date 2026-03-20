---
title: Authentication
description: How to authenticate with the Cheese Store API. We take security as seriously as we take cheese aging.
---

The Cheese Store API supports two authentication methods. Choose the one that fits your use case, or use both if you enjoy over-engineering things as much as we do.

## API Keys

The simplest way to authenticate. Include your API key in the `Authorization` header:

```bash
curl 'https://cheesy.sourcey.com/v2/cheeses' \
  -H 'Authorization: Bearer sk_live_your_key_here'
```

API keys come in two flavours:

| Key type | Prefix | Access | Use case |
|----------|--------|--------|----------|
| Live | `sk_live_` | Full production access | Your production app |
| Test | `sk_test_` | Sandbox only, no real orders | Development, CI/CD |

### Key rotation

You can have up to 3 active keys at once. This lets you rotate keys without downtime:

<Steps>
  <Step title="Generate a new key">
    Create a new API key from your dashboard. Both the old and new keys are now active.
  </Step>
  <Step title="Update your application">
    Deploy the new key to your application. Take your time; both keys work simultaneously.
  </Step>
  <Step title="Revoke the old key">
    Once you've confirmed the new key is working, revoke the old one from the dashboard. Like throwing out cheese that's past its best. Sad, but necessary.
  </Step>
</Steps>

## OAuth2

For applications that act on behalf of customers (e.g. "Log in with Cheese Store"), we support the standard OAuth2 Authorization Code flow.

```
https://cheesy.sourcey.com/oauth/authorize
  ?client_id=your_client_id
  &redirect_uri=https://yourapp.com/callback
  &response_type=code
  &scope=read:cheeses write:orders
```

### Available scopes

| Scope | Description |
|-------|-------------|
| `read:cheeses` | Browse the cheese catalog |
| `read:orders` | View order history |
| `write:orders` | Create and modify orders |
| `read:profile` | Access customer profile |
| `write:profile` | Update customer profile |
| `admin` | Full access (requires approval) |

## Error responses

Authentication errors return standard HTTP status codes:

<AccordionGroup>
  <Accordion title="401 Unauthorized — missing or invalid credentials">
    Your API key is missing, expired, or just plain wrong. Double-check the `Authorization` header. Common mistakes: forgetting the `Bearer` prefix, using a test key against production, or accidentally pasting your WiFi password instead.
  </Accordion>
  <Accordion title="403 Forbidden — insufficient permissions">
    Your credentials are valid but you're trying to access something above your pay grade. Check your OAuth2 scopes or API key permissions. The `admin` scope requires manual approval because we learned the hard way what happens when bots get full access to the cheese inventory.
  </Accordion>
  <Accordion title="429 Too Many Requests — rate limit exceeded">
    You're making requests faster than a Frenchman eats Camembert. Check the `Retry-After` header and slow down. If you consistently hit rate limits, upgrade your plan or implement exponential backoff. The cheese will still be there when you retry.
  </Accordion>
</AccordionGroup>
