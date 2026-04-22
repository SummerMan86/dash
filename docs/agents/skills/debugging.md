# Debugging Protocol

Reusable playbook for workers and `orchestrator` when diagnosing and fixing bugs or unexpected behavior.

## Contract surface

For worker-owned diagnostic/bugfix/regression slices, `orchestrator` materializes this playbook in the task packet `Debugging` section (`docs/agents/templates.md` §4/§4.1). `worker` returns the result in `Debugging Outcome` (`docs/agents/templates.md` §1/§2). Do not rely on a bare link to this file as the execution contract.

## When to use

- Bug report or failing test with no obvious cause
- Unexpected runtime behavior that resists a quick fix
- Regression after a seemingly correct change

## Protocol

### 1. Reproduce and investigate root cause

- Reproduce the failure with a concrete scenario (command, input, expected vs actual output)
- If reproduction is not possible, document what you tried and why it failed
- Read the error, stack trace, or logs before forming a hypothesis
- Narrow the scope: identify the smallest input or code path that triggers the failure

### 2. Compare with a known-good path

- Find a similar case that works correctly (adjacent test, related feature, prior commit)
- Identify what differs between the working and broken paths
- Use `git log`, `git diff`, `git bisect` to locate when the behavior changed, if applicable

### 3. Validate one hypothesis at a time

- State your hypothesis explicitly before changing code
- Make the smallest possible change to test the hypothesis
- If the hypothesis is wrong, revert the change before trying the next one
- Do not stack multiple untested fixes

### 4. Implement and verify

- Apply the fix
- Re-run the original reproduction scenario to confirm the fix
- Check for regressions: run related tests or checks
- Document what the root cause was and why the fix is correct in the handoff

## Escalation triggers

Escalate to `orchestrator` (or `lead-strategic` if orchestration is stuck) when:

- Three or more failed fix attempts on the same issue
- Loss of confidence in the actual root cause
- The fix requires changes outside your assigned scope
- The root cause is in infrastructure, environment, or a dependency you cannot modify

## Anti-patterns

- **Shotgun debugging**: changing multiple things at once hoping something works
- **Fix-forward without understanding**: applying a workaround without identifying root cause
- **Silent revert**: reverting to a working state without documenting why the fix attempt failed
- **Scope creep**: refactoring adjacent code while debugging an unrelated issue
