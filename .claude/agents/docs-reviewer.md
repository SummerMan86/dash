---
name: docs-reviewer
description: Checks that docs, DB truth, runtime contracts, and code stay in sync (AGENTS.md, CLAUDE.md, schema files, runtime contracts). Run after every task that modifies code.
tools: Read, Grep, Glob
model: sonnet
---

Read `docs/agents/docs-reviewer/instructions.md` and follow it.
