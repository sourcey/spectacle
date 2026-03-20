---
title: Quickstart
description: From zero to cheese in under five minutes. No fromage degree required.
---

This guide gets you from "I have no idea what this API does" to "I just ordered a wheel of aged Gouda programmatically" in about three minutes. The other two minutes are for eating the Gouda.

## Prerequisites

You'll need:
- An HTTP client (curl, Postman, your browser's dev tools, a trained carrier pigeon with REST knowledge)
- A free Cheese Store developer account
- A basic understanding of JSON (if `{"cheese": "good"}` makes sense to you, you're set)

## 1. Get your API key

Sign up at [cheesy.sourcey.com/developers](https://cheesy.sourcey.com/developers). Your API key appears on the dashboard immediately. It looks like this:

```
sk_live_cheddar_4a7b2c9d8e1f...
```

Yes, all our API keys contain cheese puns. No, this is not configurable.

## 2. Make your first request

Let's find some cheese. Open your terminal and run:

```bash
curl -s 'https://cheesy.sourcey.com/v2/cheeses?limit=3' \
  -H 'Authorization: Bearer sk_live_your_key_here' | python -m json.tool
```

You should get back something like:

```json
{
  "items": [
    {
      "id": "aged-gouda-beemster",
      "name": "Beemster X-O",
      "origin": "Noord-Holland, Netherlands",
      "milk": "cow",
      "texture": "hard",
      "aged_weeks": 130,
      "tasting_notes": "Butterscotch, caramel, crystalline crunch. The kind of cheese that makes you question all your previous cheese choices.",
      "stinkiness_rating": 3,
      "price_per_kg": 42.50,
      "in_stock": true
    }
  ],
  "total": 247,
  "hasMore": true,
  "nextCursor": "eyJpZCI6M30="
}
```

Congratulations. You've just queried a cheese database. Your CS degree is finally paying off.

## 3. Place a test order

Switch to sandbox mode (just use the sandbox URL) and place an order:

```bash
curl -X POST 'https://sandbox.cheesy.sourcey.com/v2/orders' \
  -H 'Authorization: Bearer sk_live_your_key_here' \
  -H 'Content-Type: application/json' \
  -d '{
    "items": [
      { "cheeseId": "aged-gouda-beemster", "quantity_kg": 0.5 }
    ],
    "shipping": {
      "method": "temperature_controlled",
      "address": {
        "line1": "42 Fromage Lane",
        "city": "Cheesington",
        "country": "GB"
      }
    }
  }'
```

The sandbox doesn't ship real cheese (we tried, the legal team said no), but the order lifecycle is identical to production.

## 4. Explore the API reference

Head to the [API Reference](/api) to see every endpoint, request schema, and response format. Each endpoint includes auto-generated code samples in cURL, JavaScript, and Python.

## Next steps

<CardGroup cols={2}>
  <Card title="Authentication deep dive" icon="lock" href="/docs/authentication.html">
    Learn about API keys, OAuth2 flows, and how to rotate credentials without downtime.
  </Card>
  <Card title="Full API Reference" icon="book" href="/api">
    Every endpoint, every parameter, every possible way to query cheese programmatically.
  </Card>
</CardGroup>
