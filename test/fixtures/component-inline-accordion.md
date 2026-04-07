---
title: MDX Component Regressions
description: Supported component tags inside inline code must stay literal.
---

Use `<Tab title="Shell">` when documenting a tab name inline.

<AccordionGroup>
  <Accordion title="Server">CLI server options.</Accordion>
  <Accordion title="Media">CLI media options.</Accordion>
</AccordionGroup>

<Tabs>
  <Tab title="Shell">
    Run `icey --help`.
  </Tab>
  <Tab title="Config">
    Use `config.json`.
  </Tab>
</Tabs>
