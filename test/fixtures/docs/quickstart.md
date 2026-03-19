---
title: "Quick Start"
description: "Get up and running with the Petstore API in minutes"
---

This guide walks you through making your first API call.

## Install the SDK

```bash
npm install @petstore/sdk
```

## Create a Client

```javascript
import { PetstoreClient } from '@petstore/sdk';

const client = new PetstoreClient({
  apiKey: 'YOUR_API_KEY',
});
```

## List Pets

```javascript
const pets = await client.listPets({ limit: 10 });
console.log(pets);
```

## Create a Pet

```javascript
const pet = await client.createPet({
  name: 'Buddy',
  tag: 'dog',
});
```
