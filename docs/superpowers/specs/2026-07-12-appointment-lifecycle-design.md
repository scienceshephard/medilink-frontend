# SP3 — Appointment Lifecycle (request → accept → visit)

**Date:** 2026-07-12
**Repos:** `medilink-frontend` (Next.js) + `hybrid-personalized-recommendation-system` (FastAPI, "HPTRS")
**Status:** design approved, ready for implementation planning
**Predecessors:** SP1 Paystack payments (merged), SP2 cancel + refund (branch `feature/cancel-refund`)
**Successors:** SP4 notifications, SP5 mandatory outcome review

---

## 1. Why

The product today is a **self-service booking tool**. A patient picks a slot and the consultation is
created as `scheduled` immediately; the doctor has no say, is never told, and the booking screen
labels every visit "Telehealth consultation" even though there is no location, link, or video
anywhere in the system.

The intended journey is different, and it is a **care journey**:

> Patient feels unwell → uploads symptoms and history → the platform recommends a doctor →
> patient **requests** an appointment → the doctor is notified and **accepts or declines** →
> patient is notified of acceptance → the patient attends the consultation →
> the patient reviews it, covering both satisfaction **and whether the treatment worked**.

SP3 builds the spine of that journey: the request/accept handshake, the in-person and video
location model, and the real appointment duration. SP4 adds the notifications that announce these
events. SP5 adds the mandatory outcome review that closes the loop back into the recommender.

### The gaps SP3 closes

| Gap today | Consequence |
| --- | --- |
| No accept/decline. `ConsultationStatus` is only `scheduled \| completed \| cancelled \| no_show`. | The doctor is a passive recipient. The core of the story is missing. |
| No location on a consultation. Booking screen hardcodes "Telehealth consultation". | The patient is never told where to go. |
| An unpaid booking holds a slot **forever**. | Slots leak. A patient can lock a doctor's calendar for free. |
| `Consultation.duration_minutes` is never written — always `NULL`. `Feedback.implicit_signals` is never populated. | ML signals the model was designed around are dead. |
| `SymptomInput.severity` is collected at intake and used for **nothing**. | Urgency is captured and thrown away. |
| `Doctor.recommendation_acceptance_rate` is a column that nothing ever computes; the portal renders it as a metric card. | Every doctor has always seen 0%. |
| No doctor profile page, no `PUT /api/doctors/me`. `/profile` is hardwired to `api.patients.me()`. | A doctor cannot edit anything about themselves. |

---

## 2. Decisions

These were settled during brainstorming and are not open for re-litigation during implementation.

| Decision | Choice |
| --- | --- |
| **Payment timing** | The patient pays **only after the doctor accepts**. Requesting is free. A decline therefore never triggers a refund. |
| **Slot holding** | A pending request holds the slot **exclusively**. Every hold has a deadline. |
| **Concurrent requests** | A patient may have **at most one** pending request at a time. Enforced server-side (409). |
| **Response deadline** | **Scales with the severity the patient reported at intake**: severe → 2h, moderate → 6h, mild → 12h. Always additionally capped at the slot's `start_time`. |
| **On decline or expiry** | Offer the **next-best doctor** from the stored recommendation, as a **one-tap re-request** the patient confirms. Never auto-request on their behalf. |
| **Visit mode** | **Both.** Each availability slot is `in_person` or `video`; the doctor chooses per slot. |
| **Completion** | The **doctor** confirms ("Consultation done" / "Patient no-showed"). Duration is derived automatically from the slot — nobody types a number. |
| **Expiry mechanism** | **Lazy**, not a background worker. There is no worker in this stack. |
| **Schema migration** | **Introduce Alembic.** `create_all()` cannot add columns to existing tables. |
| **Notifications** | Out of scope for SP3 (see SP4). SP3 emits the state changes SP4 will announce. |

---

## 3. The state machine

```
                    patient requests a recommended doctor + slot
                                      │
                                      ▼
                              ┌──────────────┐
                              │  REQUESTED   │  slot held 🔒 · nothing paid
                              └──────┬───────┘
                                     │  doctor must respond within
                                     │  2h / 6h / 12h  (severe / moderate / mild)
                                     │  — capped at slot start —
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
      doctor accepts          doctor declines      deadline lapses, or
              │                      │              patient withdraws
              ▼                      ▼                      ▼
       ┌────────────┐          ┌──────────┐          ┌──────────┐
       │  ACCEPTED  │          │ DECLINED │          │ EXPIRED  │
       └─────┬──────┘          └────┬─────┘          └────┬─────┘
             │                      │  slot freed 🔓       │  slot freed 🔓
             │                      └──────────┬───────────┘
             │                                 ▼
             │                    offer next-best doctor (one tap)
             │
             │  patient pays within 2h  (else → EXPIRED, slot freed)
             ▼
       ┌────────────┐
       │ SCHEDULED  │  it's really happening. Address / link shown.
       └─────┬──────┘  Either side may cancel → refund (SP2, unchanged)
             │
             │  the visit happens; afterwards the doctor confirms:
       ┌─────┴──────┐
       ▼            ▼
 ┌───────────┐  ┌──────────┐
 │ COMPLETED │  │ NO_SHOW  │
 └─────┬─────┘  └──────────┘
       │  duration_minutes ← slot end − slot start
       │
       ▼  unlocks the patient's review  → SP5
```

### Status vocabulary

`ConsultationStatus` gains `requested`, `accepted`, `declined`, `expired`, and **retains**
`scheduled`, `completed`, `cancelled`, `no_show`.

`scheduled` is deliberately kept and **re-pointed to mean "doctor accepted *and* patient paid"** —
i.e. the appointment is genuinely on. This preserves the meaning of rows already in the database, so
no data backfill of the status column is required.

Money is **not** folded into the status enum. The `payments` table remains the single source of truth
for money exactly as SP1 built it (payment state is derived by join, never denormalised onto the
consultation). Paying is simply the **gate** that promotes `ACCEPTED → SCHEDULED`.

### Deadlines

```python
RESPONSE_WINDOWS = {"severe": timedelta(hours=2),
                    "moderate": timedelta(hours=6),
                    "mild": timedelta(hours=12)}
DEFAULT_RESPONSE_WINDOW = timedelta(hours=12)   # severity absent / unrecognised
PAYMENT_WINDOW = timedelta(hours=2)

respond_by = min(requested_at + RESPONSE_WINDOWS.get(severity, DEFAULT_RESPONSE_WINDOW),
                 slot.start_time)
pay_by     = min(accepted_at  + PAYMENT_WINDOW,
                 slot.start_time)
```

Both are clamped to the slot's start: a hold can never outlive the appointment it is holding.

---

## 4. Data model

### `consultations` — new columns

| Column | Type | Purpose |
| --- | --- | --- |
| `requested_at` | `DateTime` | When the patient requested. |
| `respond_by` | `DateTime` | Doctor's deadline. Drives the countdown and lazy expiry. |
| `responded_at` | `DateTime?` | When the doctor accepted/declined. **Powers `avg_response_minutes`.** |
| `pay_by` | `DateTime?` | Set on acceptance. Drives the payment countdown and lazy expiry. |
| `severity` | `String(16)?` | `mild` / `moderate` / `severe`, carried from intake. Sets the deadline and sorts the doctor's inbox. |
| `mode` | `Enum(in_person, video)` | Snapshot from the slot at request time. |
| `location` | `String(255)?` | Snapshot of the doctor's clinic address **at acceptance**. |
| `meeting_link` | `Text?` | Snapshot of the doctor's meeting link **at acceptance**. |
| `recommendation_id` | `FK → recommendations.id?` | Link back to the ranked list, so next-best needs no re-scoring. |
| `decline_reason` | `String(255)?` | Optional, doctor-supplied. Shown to the patient. |

`duration_minutes` already exists and finally gets written (from the slot, at completion).

Snapshotting the address rather than joining to the doctor is deliberate: if a doctor changes clinic
next year, past consultations must still show where the patient actually went.

### `availability_slots` — new column

| Column | Type | Purpose |
| --- | --- | --- |
| `mode` | `Enum(in_person, video)`, default `in_person` | The doctor chooses per slot. |

### `doctors` — new columns

| Column | Type | Purpose |
| --- | --- | --- |
| `clinic_name` | `String(120)?` | e.g. "Eze Heart Clinic". |
| `clinic_address` | `String(255)?` | Required before an `in_person` slot can be created or accepted. |
| `default_meeting_link` | `Text?` | Required before a `video` slot can be created or accepted. |
| `avg_response_minutes` | `Float?` | Mean of `responded_at − requested_at`. Recomputed on each accept/decline. |

`recommendation_acceptance_rate` **already exists** and is finally computed:

```
recommendation_acceptance_rate = accepted / (accepted + declined + expired)
```

Expiry counts in the denominator **by design**. From a sick patient's point of view a doctor who
ignores them for twelve hours has done something worse than one who declines in five minutes and
frees them to find someone else. The metric on the doctor's own dashboard must therefore punish
silence, not just refusal.

Both stored fields follow the existing `average_rating` pattern (persisted on `Doctor`, recomputed on
write) rather than being aggregated per-request.

### Migration

Alembic is introduced in this sub-project. `alembic` is already in `requirements.txt` and unused.

1. `alembic init` + configure `env.py` against `app.database.Base` and `settings.DATABASE_URL`.
2. Baseline revision capturing the **current** schema (so existing databases can be stamped).
3. Revision `sp3_appointment_lifecycle` adding every column above and extending the two enums.

`Base.metadata.create_all()` stays in `main.py`'s lifespan for the SQLite test harness and fresh
dev databases, but Alembic becomes the mechanism of record for existing databases. Without this,
the app starts and then crashes on the first query against a pre-existing Postgres database, because
`create_all()` creates missing *tables* but never adds a column to a table that already exists.

---

## 5. API

### Consultations (`app/routers/consultations.py`)

| Endpoint | Change |
| --- | --- |
| `POST /api/consultations/` | **Behaviour change.** Creates the consultation as `requested`, not `scheduled`. Accepts `severity` and `recommendation_id`. Computes `respond_by`. Takes a **row-level lock** on the slot (`with_for_update()`) before checking `is_booked`. Returns **409** if the patient already has a pending request. |
| `POST /api/consultations/{id}/accept` | **New.** Doctor only. Requires status `requested`. Snapshots `location` (in-person) or `meeting_link` (video) from the doctor's profile; sets `responded_at`, `pay_by`, status `accepted`; recomputes the doctor's acceptance rate and `avg_response_minutes`. **400** if the doctor has no clinic address (in-person) or no meeting link (video). |
| `POST /api/consultations/{id}/decline` | **New.** Doctor only. Requires status `requested`. Optional `decline_reason`. Frees the slot, sets `responded_at`, status `declined`, recomputes doctor stats. |
| `POST /api/consultations/{id}/withdraw` | **New.** Patient only. Requires status `requested`. Frees the slot, sets status `expired`. No refund path — nothing was paid. |
| `GET /api/consultations/{id}/next-best` | **New.** Patient only. Reads the linked `Recommendation`, walks its stored `recommended_doctors` list past the doctor who declined, and returns the highest-ranked doctor who is still verified, available, and has an open slot — with their score, rank, rating, `avg_response_minutes`, acceptance rate, and next open slot. Returns `null` when the list is exhausted. |
| `POST /api/consultations/{id}/cancel` | **Guard change.** `scheduled` → refund + free slot (SP2, unchanged). `accepted` (unpaid) → free slot, no refund. `requested` → treated as withdraw. |
| `PUT /api/consultations/{id}` | **Behaviour change.** On `status: "completed"`, auto-fills `duration_minutes` from `slot.end_time − slot.start_time`. Rejects completion before `scheduled_datetime`. Also accepts `status: "no_show"`. |

### Payments (`app/routers/payments.py`)

| Endpoint | Change |
| --- | --- |
| `POST /api/payments/initialize` | **400** unless the consultation is `accepted`. (Nobody pays for a slot the doctor hasn't agreed to.) |
| `GET /api/payments/verify/{ref}` | On Paystack success: promote the consultation `accepted → scheduled`. **If the consultation is no longer `accepted`** (the payment window lapsed while the patient was on Paystack's page), **refund immediately**, mark the payment `refunded`, and return that plainly to the patient. |
| `POST /api/payments/webhook` | Same promotion on `charge.success`, idempotently. Same late-payment refund guard. |

### Doctors (`app/routers/doctors.py`)

| Endpoint | Change |
| --- | --- |
| `PUT /api/doctors/me` | **New.** Update `full_name`, `phone`, `location`, `bio`, `qualifications`, `languages`, `consultation_fee`, `is_available`, `clinic_name`, `clinic_address`, `default_meeting_link`. **This endpoint does not exist today** — a doctor currently cannot edit anything. |
| `GET /api/doctors/me/requests` | **New.** Pending `requested` consultations for this doctor, sorted **severity first, then `respond_by` ascending**. Powers the portal inbox. |
| `POST /api/doctors/availability` | Accepts `mode`. **400** if `in_person` and the doctor has no `clinic_address`, or `video` and no `default_meeting_link`. |
| `GET /api/doctors/{id}/availability` | Returns `mode` on each slot. |
| `GET /api/doctors/` and `GET /api/doctors/{id}` | Expose `avg_response_minutes` and `recommendation_acceptance_rate`, so the UI can honestly say "usually replies in 3h · accepts 92%". |

### Expiry service (`app/services/appointments.py` — new)

```python
def expire_stale(db: Session) -> int:
    """Expire requests whose deadlines have lapsed and free their slots.

    Lazy sweep — there is no background worker in this stack. Called at the top of
    every endpoint that reads availability or consultation lists, so a blown deadline
    is always resolved before anyone can read (or double-book) the slot.
    """
```

It flips two populations to `expired` and frees their slots:

- status `requested` where `respond_by < utcnow()` — the doctor never answered.
- status `accepted` where `pay_by < utcnow()` — the patient never paid.

Called at the top of: `POST /api/consultations/`, `GET /api/patients/consultations`,
`GET /api/doctors/me/consultations`, `GET /api/doctors/me/requests`,
`GET /api/doctors/{id}/availability`.

---

## 6. Frontend

All new UI is built from the existing **Clinical Clarity** design system — `Card`, `Button`,
`StatusBadge`, `Avatar`, `Icon`, `MetricCard`, and the tokens in `tailwind.config.ts`. No new visual
language is introduced. Patient pages keep the `TopNav` chrome; doctor pages keep the `Sidebar`.

### Patient — `appointments/page.tsx`

The existing appointment `Card` is retained wholesale (avatar → name + badges → symptom line →
schedule row → right-aligned action cluster). One **status banner** is added beneath it, and the
status drives the rest:

| Status | Badge | Banner | Actions |
| --- | --- | --- | --- |
| `requested` | Requested + severity | ⏳ "Waiting on Dr. Eze — **1h 47m** left to respond." | **Withdraw** |
| `accepted` | Accepted + Payment due | ✅ "Dr. Eze accepted you. Pay within **1h 52m** to lock in this slot." | **Pay ₦X**, Cancel |
| `scheduled` | Confirmed + Paid | 📍 clinic name + address (or 🎥 Join consultation for a video slot) | Directions, Add to calendar, Cancel & refund |
| `declined` / `expired` | Declined / Expired | — | **Next-best doctor block** (see below) |
| `completed` | Completed | — | Leave review *(SP5 makes this mandatory)* |

### Patient — next-best doctor block (new component)

Rendered inline on a declined/expired card. Shows the next-ranked doctor with their match score and
rank, rating, `usually replies in Xh`, `accepts N%`, and their next open slot — with a one-tap
**Request Dr. Musa** and a **See all matches** escape hatch. The patient never re-does intake: the
symptom input and `recommendation_id` carry over from the original request.

When `next-best` returns `null` (list exhausted), the block degrades to "See all matches", linking
back to `/recommendations`.

### Patient — `doctors/[id]/book/page.tsx`

- "Confirm Appointment" → **"Request appointment"**.
- Remove the hardcoded **"Telehealth consultation"** label; show the selected slot's real mode.
- Show the doctor's response stats before the patient commits ("usually replies in 3h · accepts 92%").
  New doctors with no history show "New to MediLink" rather than a fabricated number.
- Block with an explanatory message if the patient already has a pending request.

### Patient — `appointments/confirmed/page.tsx`

Becomes **"Request sent"** — awaiting the doctor's response, with the countdown. The
`telemed:lastBooking` sessionStorage key is renamed.

### Doctor — `doctor-portal/page.tsx`

A **Patient Requests** section is inserted **above** Patient Queue, keeping the existing `[1fr_340px]`
grid and the three `MetricCard`s. Each request card shows the patient's symptoms, a severity badge,
the mode, and a countdown, with **Accept** / **Decline**. Sorted severity-first. Accepting opens a
confirm modal showing the address (or link) that will be snapshotted onto the consultation.

The Patient Queue's actions become **Consultation done** / **No-show**.

The **Acceptance rate** metric card, which has silently shown 0% to every doctor since it was built,
now shows a real number.

### Doctor — profile page (new route)

`/profile` is hardwired to `api.patients.me()` and is already 300 lines. Rather than branch it on
role, SP3 adds a **separate `/doctor-profile` route** plus a "My Profile" item in the doctor
`Sidebar` (which currently has only "Schedule"). It lets a doctor edit clinic name, clinic address,
default meeting link, bio, qualifications, languages, consultation fee, and the availability toggle.

**This page does not exist today and is required** — without it a doctor can never accept an
in-person request, because there is no address to snapshot.

### Doctor — `AvailabilityForm.tsx`

Gains an **in-person / video** toggle. Warns inline if the corresponding profile field
(clinic address / meeting link) is missing, linking to the profile page.

### Shared

- `src/lib/types.ts` — new statuses, `mode`, `location`, `meeting_link`, `respond_by`, `pay_by`,
  `severity`, doctor response stats.
- `src/lib/api.ts` — `consultations.accept/decline/withdraw/nextBest`, `doctors.updateMe`,
  `doctors.myRequests`.
- `src/lib/format.ts` — `statusTone()` extended for the four new statuses; a `countdown()` helper.
- New `Countdown` component (ticks client-side from `respond_by` / `pay_by`).

---

## 7. Error handling

| Situation | Handling |
| --- | --- |
| Two patients request the same slot simultaneously | Row-level lock (`with_for_update()`) on the slot before the `is_booked` check. One wins; the other gets **400 "That slot was just taken."** |
| Patient already has a pending request | **409**, with the existing request surfaced in the UI. |
| Doctor accepts a request that has just lapsed | `expire_stale()` runs first, so the handler sees `expired` → **400 "This request has expired."** |
| Doctor accepts an in-person request with no clinic address | **400**, linking to the profile page. Also blocked earlier, at slot creation. |
| **Patient pays after `pay_by` lapsed** | The slot is already released. `verify` sees the consultation is no longer `accepted` → **refunds immediately**, marks the payment `refunded`, and tells the patient plainly. |
| Doctor declines after payment | Impossible by construction — payment only opens once `accepted`. |
| Cancelling in each state | `scheduled` → refund + free slot (SP2). `accepted` unpaid → free slot, no refund. `requested` → withdraw. |
| Next-best list exhausted, or no candidate has an open slot | Return `null`; UI degrades to "See all matches" → `/recommendations`. |
| Doctor marks completed before the appointment time | **400.** A visit cannot be completed before it starts. |
| Paystack unreachable during the late-payment refund | Payment stays `success`, consultation stays `expired`, and the case is logged loudly for manual reconciliation. We never silently keep the money. |

---

## 8. Testing

Backend, TDD against the existing SQLite harness in `tests/conftest.py`
(`tests/test_appointment_lifecycle.py`, new):

1. `respond_by` per severity — severe 2h, moderate 6h, mild 12h, missing severity → 12h.
2. `respond_by` and `pay_by` are both clamped to the slot's `start_time`.
3. Booking creates status `requested` and holds the slot.
4. A second pending request from the same patient → **409**.
5. Concurrent requests for one slot → exactly one succeeds.
6. Accept → `accepted`, snapshots address (in-person) / link (video), sets `responded_at` + `pay_by`.
7. Accept with no clinic address on an in-person slot → **400**.
8. Decline → `declined`, slot freed, `responded_at` set.
9. Withdraw → `expired`, slot freed.
10. Lazy expiry: `requested` past `respond_by` → `expired`, slot freed.
11. Lazy expiry: `accepted` past `pay_by` → `expired`, slot freed.
12. `initialize` on a non-`accepted` consultation → **400**.
13. `verify` success on an `accepted` consultation → promotes to `scheduled`.
14. `verify` success on an `expired` consultation → **auto-refund**, payment `refunded`.
15. Complete → `duration_minutes` auto-filled from the slot; feedback becomes submittable.
16. Complete before `scheduled_datetime` → **400**.
17. `no_show` → no feedback permitted.
18. Acceptance rate math, including expiry in the denominator.
19. `next-best` returns the next-ranked doctor with an open slot; skips those without; returns
    `null` when exhausted.
20. **Regression:** SP2 cancel-and-refund on a `scheduled` consultation still behaves exactly as before.

Frontend: `npx tsc --noEmit` and `npm run build` must pass, followed by a manual end-to-end walk of
the full journey (intake → recommend → request → accept → pay → confirm → complete) against a backend
running Paystack **test** keys.

---

## 9. Out of scope

- **Notifications** (SP4). SP3 changes state; SP4 announces it. Until SP4 lands, a doctor still
  discovers requests by opening the portal — the inbox and countdowns make that survivable, but it
  is explicitly not the finished experience.
- **Mandatory outcome review** (SP5). SP3 unlocks the review at completion; SP5 makes it compulsory
  and adds the treatment-outcome dimension that the recommender should actually be training on.
- **Rescheduling.** Cancel and re-request remains the path.
- **Video infrastructure.** A `video` slot carries a doctor-supplied meeting link. MediLink does not
  host the call.
- **The Redis cache-key bug** in `recommendation_service.py:53` (`hash()` is per-process salted, so
  recommendation caching never hits). Real, but unrelated — fix separately.
