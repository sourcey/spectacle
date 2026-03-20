---
title: Components
description: Rich components for documentation pages, using simple directive syntax.
---

Sourcey supports rich components in plain markdown using `:::directive` syntax. No JSX imports needed.

## Callouts

:::note
API keys are scoped to environments. A test key won't work against production endpoints and vice versa.
:::

:::warning
Never commit API keys to version control. Use environment variables or a secrets manager. We scan public repos and revoke leaked keys automatically.
:::

:::tip
Use the `fields` query parameter to request only the data you need. Smaller payloads mean faster responses and less bandwidth, which matters when you're querying 247 cheeses.
:::

:::info
The Cheese Store API follows OpenAPI 3.1 and all responses use `application/json` unless otherwise noted.
:::

:::note Custom Title
You can override the default callout title by adding text after the type.
:::

## Steps

:::steps
1. Install the SDK
   Choose your language and install via your package manager.
2. Set your API key
   Export `CHEESE_API_KEY` in your shell or pass it to the client constructor.
3. Make a request
   Call any endpoint. The SDK handles auth, retries, and serialization.
:::

## Tabs

:::tabs
::tab{title="Soft"}
The crowd-pleasers. Brie, Camembert, Époisses, Vacherin Mont d'Or. Spreadable at room temperature, devastating on fresh bread. Best consumed before they achieve sentience and crawl off the board.
::
::tab{title="Hard"}
The patient ones. Comté aged 24 months, Parmigiano-Reggiano, aged Gruyère. These wheels have been sitting in caves longer than most startups have been alive. Worth the wait.
::
::tab{title="Blue"}
Not for the faint-hearted. Roquefort, Stilton, Gorgonzola Dolce. The mould is the feature, not a bug. Pairs well with honey, port wine, and a willingness to clear a room.
::
:::

## Code Group

:::code-group
```javascript title="Node.js"
const res = await fetch('https://cheesy.sourcey.com/v2/cheeses');
const data = await res.json();
```
```python title="Python"
import requests
res = requests.get('https://cheesy.sourcey.com/v2/cheeses')
data = res.json()
```
```bash title="cURL"
curl -s 'https://cheesy.sourcey.com/v2/cheeses' | jq
```
:::

## Cards

:::card-group{cols="3"}
::card{title="Authentication" href="/docs/authentication.html" icon="lock"}
API keys, OAuth2, and credential rotation without downtime.
::
::card{title="Webhooks" href="/docs/webhooks.html" icon="bell"}
Real-time event notifications for orders, inventory, and more.
::
::card{title="API Reference" href="/api" icon="book"}
Every endpoint, every parameter, every cheese.
::
:::

## Accordion

:::accordion{title="What milk types do you support?"}
We catalog cheeses made from cow, sheep, goat, and buffalo milk. Mixed-milk cheeses list all constituent milk types. We're considering adding camel and yak but the supply chain logistics are challenging.
:::

:::accordion{title="Can I filter by stinkiness?"}
Yes. Use `stinkiness_min` and `stinkiness_max` query parameters on `GET /v2/cheeses`. For the brave, `stinkiness_min=8` returns only the most assertive specimens.
:::
