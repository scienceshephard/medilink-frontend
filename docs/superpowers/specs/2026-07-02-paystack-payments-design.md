# Sub-project 1 — Paystack "Book now, pay after"

**Date:** 2026-07-02
**Status:** Approved (design)
**Repos:**
- Frontend — `medilink-frontend` (Next.js 14)
- Backend — `hybrid-personalized-recommendation-system` (FastAPI / HPTRS)

## Context

MediLink AI is a doctor-recommendation platform. Patients get AI recommendations,
browse doctors, and book consultations against doctor availability slots. Each doctor
has a `consultation_fee` (Naira), but today it is only **displayed** — booking is free
and no money changes hands.

This sub-project adds **Paystack** payment for consultation fees using a
**book-now-pay-after** model, and confirms the existing patient↔doctor booking flow
works end-to-end.

It is the first of four sequenced sub-projects. The others (built later, each with its
own spec) are: (2) Cancel + refund, (3) Reschedule, (4) Email notifications. Refunds and
payment-confirmation emails depend on the Payment record introduced here, so payment
goes first.

## Current state (verified)

- **Booking works at the data level.** `POST /api/consultations/` validates the slot is
  free, creates a `Consultation` (`patient_id`, `doctor_id`, `slot_id`,
  `status=scheduled`), and flips `slot.is_booked = True` in one commit. The doctor reads
  it back via `GET /api/doctors/me/consultations`. Shared state is consistent.
- **No payment exists.** `consultation_fee` lives on the `Doctor` model and is shown on
  the doctor card and booking page only.
- **No notifications.** Nobody is told when a booking happens; the doctor sees it on refresh.
- **Backend already has `httpx` and `redis`** in `requirements.txt`, so no new heavy deps.
- **DB uses `Base.metadata.create_all()`** on startup (no live Alembic migrations). A
  *new* table is auto-created; adding columns to an existing table would need a manual ALTER.

## Design decisions

1. **Payment model: book-now-pay-after.** Consultation is created immediately (unchanged).
   Payment is a separate step initiated from **My Appointments**. Consultation clinical
   `status` (scheduled/completed/cancelled) stays independent of payment state.
2. **All payment data in a new `payments` table; no changes to existing tables.**
   `create_all()` builds the new table with zero migration and no risk to the seeded DB.
   Payment status is derived by joining `payments` → `consultation`.
3. **Checkout: redirect + callback.** Patient is sent to Paystack's hosted checkout page,
   then returned to a frontend callback route. **The webhook is the source of truth;** the
   verify-on-callback call is a fast-path confirmation. All Paystack keys stay server-side.
4. **Idempotency.** `verify` and `webhook` both converge a Payment to its final state
   without double-counting, so redirect and webhook cannot conflict.

## Data flow

1. Patient books as today → `Consultation` (`status=scheduled`), slot booked. *(unchanged)*
2. In My Appointments, a consultation with no successful payment shows **"Pay ₦X"**.
3. Click → `POST /api/payments/initialize {consultation_id}` → backend creates/looks up a
   `pending` Payment (amount = doctor `consultation_fee`), calls Paystack
   `transaction/initialize` (amount in kobo, patient email, unique `reference`,
   `callback_url`, metadata `{consultation_id, patient_id, doctor_id}`), stores
   `reference` + `authorization_url`, returns `{authorization_url, reference}`.
4. Frontend `window.location = authorization_url` → Paystack hosted checkout.
5. Paystack redirects to `/payments/callback?reference=…&trxref=…`; the page calls
   `GET /api/payments/verify/{reference}` and shows success/failure.
6. Paystack `POST /api/payments/webhook` (HMAC-SHA512 signature verified against
   `PAYSTACK_SECRET_KEY`) handles `charge.success` → marks Payment `success` + `paid_at`.

## Backend components (`hybrid-personalized-recommendation-system`)

- **`app/models/__init__.py`** — new `Payment`:
  - `id`, `consultation_id` (unique FK → consultations), `patient_id`, `doctor_id`,
    `amount` (Float, Naira), `currency` (String, default `"NGN"`),
    `status` (Enum `pending|success|failed|refunded`, default `pending`),
    `paystack_reference` (String, unique, indexed), `authorization_url` (Text, nullable),
    `paid_at` (DateTime, nullable), `created_at`, `updated_at`.
  - `PaymentStatus` enum added alongside existing enums.
- **`app/services/paystack.py`** — thin `httpx` client, keeps Paystack details out of the
  router:
  - `initialize(email, amount_kobo, reference, callback_url, metadata) -> dict`
  - `verify(reference) -> dict`
  - `verify_signature(raw_body: bytes, signature: str) -> bool` (HMAC-SHA512)
- **`app/routers/payments.py`** — `prefix="/api/payments"`:
  - `POST /initialize` (auth: patient owns the consultation) → `PaymentInitOut`.
    Rejects if a `success` payment already exists for the consultation.
  - `GET /verify/{reference}` (auth: patient) → `PaymentOut`. Idempotent.
  - `POST /webhook` (no auth; signature-verified) → `{status: "ok"}`. Idempotent.
  - Registered in `app/main.py` via `app.include_router(payments.router)`.
- **`app/schemas/__init__.py`**:
  - `PaymentInitiate { consultation_id }`, `PaymentInitOut { authorization_url, reference }`,
    `PaymentOut { status, amount, currency, reference, paid_at }`.
  - Extend `ConsultationOut` and `ConsultationSummary` with `payment_status`
    (`unpaid|pending|success|failed|refunded`) and `amount` (doctor fee), derived from the
    joined payment (or `unpaid` when none).
- **`app/config.py` + `.env.example`** — `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`,
  `PAYSTACK_BASE_URL` (default `https://api.paystack.co`), `FRONTEND_URL` (for callback URL).
- **`app/routers/patients.py` / `doctors.py`** — populate `payment_status` + `amount` on the
  consultation-list responses so both portals can show the badge.

## Frontend components (`medilink-frontend`)

- **`src/lib/api.ts`** — new `payments` group:
  - `initialize(consultationId: number) -> PaymentInitOut`
  - `verify(reference: string) -> PaymentOut`
- **`src/lib/types.ts`** — `PaymentInitOut`, `PaymentOut`; add `payment_status` + `amount`
  to `ConsultationSummary` / `ConsultationOut`.
- **`src/app/(app)/appointments/page.tsx`** — for unpaid `scheduled` consultations show a
  **"Pay ₦X"** button (calls `initialize`, then redirects to `authorization_url`) and a
  **Paid / Payment due** `StatusBadge`.
- **`src/app/(app)/payments/callback/page.tsx`** — new route. Reads `reference` from the
  query string, calls `verify`, shows success/failure, links back to `/appointments`.
- **`.env.local.example`** — no new public key needed for redirect flow (keys stay on the
  backend); document that payment routes require the backend Paystack env vars.

## Error handling

- Paystack unreachable on initialize → surface a 502 with a retry-friendly message; no
  Payment left dangling in an inconsistent state.
- Verify amount/reference mismatch (tampering) → mark Payment `failed`, do not confirm.
- Duplicate webhook or double verify → idempotent no-op (guard on current status).
- Unpaid consultation remains visibly **"Payment due"** — no silent failures.
- All development uses Paystack **test keys** and test cards.

## Testing

- **Backend (`pytest`, Paystack HTTP mocked):**
  - `initialize` creates a `pending` Payment and returns an `authorization_url`.
  - `initialize` rejects when a `success` payment already exists.
  - `verify` flips a payment to `success`; second call is a no-op.
  - `webhook` rejects a bad signature (400) and accepts a valid `charge.success`
    idempotently.
- **Frontend / manual:**
  - End-to-end with a Paystack test card: book → Pay → checkout → callback → badge shows Paid.
  - Regression: existing book → doctor-queue flow still works and stays consistent.

## Out of scope (future sub-projects)

- Cancel + refund (SP2), Reschedule (SP3), Email notifications (SP4).
- Redis slot-hold during checkout (only relevant to a pay-to-confirm model, which we did
  not choose).
- Inline Paystack popup (we chose redirect).
