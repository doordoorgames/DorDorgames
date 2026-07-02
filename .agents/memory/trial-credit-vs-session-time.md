---
name: Trial-credit vs active-session time
description: Design pitfall when a "free trial minutes" balance is spent upfront to fund a session, then reused to gate access to that same session.
---

If a user has a spendable time/credit balance (e.g. "1 free hour of hosting")
that gets fully debited the instant they start a session (to fund that
session's duration), never reuse that same balance afterward to decide
whether they're still allowed to access the session or its dashboard.

**Why:** The balance hits zero the moment the session starts — that's correct
and intentional (it funded the session). But if any route or UI gate checks
"is remaining balance > 0" to allow access, it will lock the user out of their
own active session immediately, even though the session itself still has
hours left on the clock. This exact bug shipped: a host's account balance was
drained atomically at room-creation time, and the `/auth/me` endpoint (and the
dashboard's countdown UI) both keyed off that same drained balance, so any
host who started a session got locked out of their own dashboard right away.

**How to apply:** Keep two concepts explicitly separate:
1. **Credit balance** — spendable minutes available to *start a new* session.
   Gate session-creation endpoints on this.
2. **Active session remaining time** — derived from the session's own
   `expiresAt`/wall-clock, independent of the spender's balance. Gate
   dashboard/identity endpoints only on identity (is this a valid, known
   user), never on the credit balance, so the user isn't shut out while a
   session they already paid for is still running.
