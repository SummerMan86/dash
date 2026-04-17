---
name: security-reviewer
description: Reviews code changes for security vulnerabilities (SQL injection, XSS, secrets, SSRF, command injection, path traversal, write-side guardrails). Run after every task that modifies code files.
tools: Read, Grep, Glob
model: sonnet
---

Read `docs/agents/security-reviewer/instructions.md` and follow it.
