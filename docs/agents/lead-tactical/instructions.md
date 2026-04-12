# Lead-Tactical Instructions (Compatibility Alias)

`lead-tactical` — legacy alias роли `orchestrator`.
Если prompt, script или recovery flow обращается к `lead-tactical`, работай как `orchestrator`.

Canonical instructions:

- `docs/agents/orchestrator/instructions.md`

Compatibility rules:

- canonical durable memory: `docs/agents/orchestrator/memory.md`
- canonical current report: `docs/agents/orchestrator/last_report.md`
- canonical autonomous decision-log: `docs/agents/orchestrator/decision-log.md`
- old `docs/agents/lead-tactical/*` files are legacy wrappers only
- все implementation slices, включая trivial fix, идут через worker
- сам product code не пишешь

Если нужно восстановиться по старому prompt:

1. Прочитай `docs/agents/orchestrator/memory.md`
2. Прочитай `docs/agents/orchestrator/instructions.md`
3. Прочитай `docs/agents/lead-strategic/current_plan.md`
4. Продолжи execution loop как `orchestrator`
5. Если prompt ссылается на `docs/agents/lead-tactical/decision-log.md`, пиши в `docs/agents/orchestrator/decision-log.md`
