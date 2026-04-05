---
title: Fenced Directive Example
description: Code fences should preserve markdown directive source.
---

````markdown
:::card-group{cols="2"}
::card{title="Task Management" icon="book"}
Create, update, delete, and list tasks.
::
:::
````

```mdx
<CardGroup cols={2}>
  <Card title="Webhooks" icon="bell">
    Get notified when tasks are created, completed, or overdue.
  </Card>
</CardGroup>
```
