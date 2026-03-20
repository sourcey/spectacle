---
title: Webhooks
description: Real-time event delivery for orders, inventory, and system events.
---

Webhooks let your application receive real-time notifications when events occur in the Cheese Store. Register a URL and we call you when something happens.

## Setup

:::steps
1. Register your endpoint
   Send a `POST /v2/webhooks` request with your receiving URL and the events you want. Your endpoint must accept POST requests and return a 2xx status within 10 seconds.
2. Verify the signature
   Every request includes an `X-Cheese-Signature` header with an HMAC-SHA256 signature of the body, signed with your webhook secret. Always verify this before processing.
3. Process the event
   Parse the JSON body, handle the event type, and return a 200. Do heavy processing asynchronously; our delivery system retries on timeout.
:::

## Events

:::card-group{cols="2"}
::card{title="Order events" icon="box"}
`order.placed`, `order.confirmed`, `order.shipped`, `order.delivered`, `order.cancelled`
::
::card{title="Inventory events" icon="warehouse"}
`cheese.back_in_stock`, `cheese.low_stock`, `cheese.out_of_stock`, `cheese.new_arrival`
::
::card{title="Customer events" icon="user"}
`customer.created`, `customer.updated`, `customer.subscription_changed`
::
::card{title="System events" icon="gear"}
`webhook.test`, `api_key.expiring`
::
:::

## Payload

Every webhook delivery has the same envelope:

```json
{
  "id": "evt_cheddar_7a8b9c",
  "type": "order.shipped",
  "created_at": "2024-03-15T14:30:00Z",
  "data": {
    "order_id": "ord_gouda_4d5e6f",
    "tracking_number": "1Z999AA10123456784",
    "carrier": "CheeseExpress",
    "estimated_delivery": "2024-03-17T12:00:00Z"
  }
}
```

## Retry policy

If your endpoint returns a non-2xx status, we retry with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 12 hours |

After 6 failed attempts, the event moves to the dead letter queue. Replay failed events from the dashboard or via `POST /v2/webhooks/{id}/replay`.

## Troubleshooting

:::accordion{title="Not receiving webhooks"}
Check that your endpoint is publicly accessible (localhost won't work without a tunnel like ngrok). Verify your webhook is active in the dashboard and try a test event via `POST /v2/webhooks/{id}/test`.
:::

:::accordion{title="Signature verification failing"}
Use the raw request body for verification, not a parsed-and-re-serialized version. JSON key ordering matters for HMAC. Also confirm you're using the correct webhook secret, not your API key.
:::

:::accordion{title="Events arriving out of order"}
Distributed systems don't guarantee ordering. Use the `created_at` timestamp to sort events and implement idempotency using the `id` field.
:::
