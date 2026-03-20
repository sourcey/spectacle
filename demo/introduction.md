---
title: Introduction
description: The world's finest artisanal cheese, delivered to your door via API. Life's too short for bad cheese and worse documentation.
---

**The world's most over-engineered cheese delivery platform.** We took a perfectly good cheese shop and added REST endpoints, OAuth2, webhooks, and a 47-page OpenAPI spec. You're welcome.

Every cheese marketplace deserves an API with better documentation than most startups have product. The Cheese Store API gives you programmatic access to over 200 artisanal cheeses from 15 countries, complete with tasting notes, pairing suggestions, and real-time inventory. Because if you're going to automate cheese, you should do it properly.

## How it works

The Cheese Store API is a standard REST API. Authenticate with your API key, make requests, receive cheese data. We considered GraphQL but decided life is too short for schema stitching when you could be eating Gruyère.

```bash
curl -X GET 'https://cheesy.sourcey.com/v2/cheeses?country=france&texture=soft' \
  -H 'Authorization: Bearer your-api-key'
```

```json
{
  "items": [
    {
      "id": "brie-de-meaux",
      "name": "Brie de Meaux",
      "origin": "Île-de-France",
      "milk": "cow",
      "texture": "soft",
      "aged_weeks": 8,
      "tasting_notes": "Earthy, mushroomy, with a hint of ammonia that says 'I'm fancy'"
    }
  ],
  "total": 47,
  "hasMore": true
}
```

No SDK required. Any HTTP client will do. Even `wget`, if you're feeling nostalgic.

## What you can do

<CardGroup cols={2}>
  <Card title="Browse the cheese catalog" icon="search" href="/api#tag-cheese">
    Search and filter 200+ artisanal cheeses by origin, milk type, texture, aging, and whether they'll clear a room. Full-text search across tasting notes included.
  </Card>
  <Card title="Place orders" icon="cart" href="/api#tag-store">
    Create orders with temperature-controlled shipping, track deliveries in real-time, and set up recurring subscriptions. Because one wheel of Comté is never enough.
  </Card>
  <Card title="Manage customers" icon="users" href="/api#tag-customer">
    Customer accounts with OAuth2 login, preference tracking, allergy management, and purchase history. We remember their favourite cheeses so you don't have to.
  </Card>
  <Card title="Inventory & webhooks" icon="bell" href="/api#tag-cheese">
    Real-time stock levels across all warehouses. Get webhook notifications when seasonal cheeses return; nobody should miss Vacherin Mont d'Or season.
  </Card>
</CardGroup>

## Why the Cheese Store API

<AccordionGroup>
  <Accordion title="Curated by actual fromagers, not algorithms">
    Every cheese in our catalog is hand-selected by our team of certified fromagers who visit producers, taste batches, and reject anything that doesn't meet the bar. We've turned down entire shipments of Camembert because the rind wasn't wrinkly enough. Our API reflects that obsession; every cheese object includes origin verification, producer notes, and seasonal availability.
  </Accordion>
  <Accordion title="Real-time inventory (cheese waits for no one)">
    Artisanal cheese is seasonal, hand-made, and sometimes temperamental. A wheel of Époisses has a shelf life measured in weeks, not months. Our API provides real-time stock levels across all temperature-controlled warehouses, so you never sell something that's already been eaten by the warehouse team during quality control.
  </Accordion>
  <Accordion title="Built for developers who appreciate the finer things">
    Clean REST endpoints, comprehensive OpenAPI 3.1 spec, predictable error codes, idempotent operations, cursor-based pagination. We eat our own dogfood; our own storefront runs on the exact same API you use. If something's broken, we find out before you do (usually while trying to order lunch).
  </Accordion>
  <Accordion title="Cheese expertise in every response">
    Every cheese object includes tasting notes, texture profiles, milk source, aging duration, region of origin, optimal serving temperature, and suggested pairings. It's like having a cheesemonger in your JSON payload. We even include a `stinkiness_rating` field (1-10 scale, scientifically calibrated).
  </Accordion>
</AccordionGroup>

## Get started

<Steps>
  <Step title="Get your API key">
    Sign up at [cheesy.sourcey.com/developers](https://cheesy.sourcey.com/developers) and grab your API key from the dashboard. Free tier gets you 100 requests/hour, which is roughly 100 more cheeses than most people can eat in an hour.
  </Step>
  <Step title="Browse the catalog">
    Hit `GET /v2/cheeses` to explore. Try filtering with `?country=switzerland&aged_weeks_min=12` to find a properly aged Gruyère. Each response includes tasting notes, so you can sound knowledgeable at dinner parties.
  </Step>
  <Step title="Place a test order">
    Use `POST /v2/orders` in sandbox mode. No real cheese will ship (unfortunately), but you'll see the full order lifecycle: placed → confirmed → shipped → delivered → presumably eaten.
  </Step>
  <Step title="Set up webhooks">
    Configure `POST /v2/webhooks` to get notified about order status changes, low stock alerts, and seasonal cheese availability. Never miss the return of Vacherin Mont d'Or again.
  </Step>
  <Step title="Go live">
    Switch to your production API key and start shipping cheese. Our support team includes a certified cheesemonger available for pairing consultations and API debugging, in that order of priority.
  </Step>
</Steps>
