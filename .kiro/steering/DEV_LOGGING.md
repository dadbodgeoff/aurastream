---
inclusion: manual
---

# 🔧 DEV LOGGING TOGGLE

## Quick Reference for Agents

**To enable dev logging in the frontend:**

Edit `tsx/packages/shared/src/utils/devLogger.ts` and change:
```typescript
const DEV_LOGGING_ENABLED = false;
```
to:
```typescript
const DEV_LOGGING_ENABLED = true;
```

**To disable dev logging:**
Change it back to `false`.

---

## What This Does

When enabled, all `devLog` and `createDevLogger` calls throughout the frontend will output to the browser console. This includes:

- Coach chat flow (`[CoachChat]`)
- Create page flow (`[CreatePage]`, `[CreateCoach]`)
- SSE streaming (`[SSE]`)
- Coach input (`[CoachInput]`)
- And more...

When disabled (production default), these logs are silently suppressed.

---

## Environment Variable Alternative

You can also enable via environment variable without code changes:
```bash
NEXT_PUBLIC_DEV_LOGS=true
```

This only works in development mode (`NODE_ENV=development`).

---

## Usage in Code

```typescript
import { createDevLogger, devLog } from '@aurastream/shared';

// Create a namespaced logger
const log = createDevLogger({ prefix: '[MyComponent]' });
log.info('Something happened', { data });
log.debug('Debug info');
log.error('This always logs regardless of flag');

// Or use the global devLog
devLog.info('[Quick]', 'One-off log');
```
