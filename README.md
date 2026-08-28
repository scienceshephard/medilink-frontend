# MediLink AI — Frontend

A Next.js 14 (App Router) frontend for the **HPTRS** hybrid doctor recommendation backend.
The UI implements the **Warm Care** design system and wires every backend API endpoint to a
screen.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Nunito Sans + Material
Symbols Rounded.

No UI framework dependency — components are hand-built against the design tokens in
`tailwind.config.ts`. The source of truth for the visual language is the Pencil design at
`design/medilink-redesign.pen`; the spec is
`docs/superpowers/specs/2026-07-26-warm-care-redesign-design.md`.

> **Note:** `tailwind.config.ts` still carries the old *Clinical Clarity* token names
> (`surface-container-high`, `on-primary-fixed-variant`, …) remapped onto warm values. That was
> transition scaffolding so un-migrated pages kept compiling — prefer the Warm Care names
> (`sand`, `warm-white`, `ink`, `primary`, `accent`, …) in new code.

## Quick start

```bash
npm install
cp .env.local.example .env.local      # point NEXT_PUBLIC_API_BASE_URL at your backend
npm run dev                            # http://localhost:3000
```

The backend already allows `http://localhost:3000` in its CORS config, so no extra setup is
needed beyond pointing `NEXT_PUBLIC_API_BASE_URL` at it.

> `NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8000` (`src/lib/api.ts`) — the port
> uvicorn and the backend's Dockerfile both use. Set it to your backend's **origin only**: no
> trailing slash and no path, since each call appends its own `/api/...` or `/health`.
>
> The `NEXT_PUBLIC_` prefix is required, not cosmetic. `src/lib/api.ts` runs in the browser, and
> Next.js inlines **only** `NEXT_PUBLIC_*` into the client bundle. This file previously read
> `NEXT_API_BASE_URL`, which is `undefined` client-side however it is configured, so every
> deployed build silently used the localhost fallback and failed with network errors that looked
> like CORS. If the variable is missing, the client now logs a console warning rather than
> failing quietly.
>
> `NEXT_PUBLIC_*` vars are inlined **at build time** — changing one in a hosting dashboard
> requires a redeploy, not just a restart. Note also that `.env` and `.env.local.example` are
> both gitignored, so neither reaches a hosting provider; set the variable in its dashboard.
>
> Over HTTPS the backend must also be HTTPS — a plain-`http` API is blocked as mixed content
> (`src/lib/api.ts` detects this case and says so explicitly).

```bash
npm run build && npm run start         # production build
```

> The app loads the Inter and Material Symbols fonts from Google Fonts. An internet connection
> is required for icons and typography to render (the original mockups use the same CDN).

## Demo logins

- **Admin** — `admin@hptrs.com` with the backend's `ADMIN_PASSWORD`. A password is genuinely
  required: `/api/auth/login` used to mint an admin token on the email alone, and a blank
  `ADMIN_PASSWORD` now disables admin login entirely rather than accepting anything.
- **Patient / Doctor** — register from `/register`, then sign in. Doctors start `pending` until
  an admin verifies them from the analytics console.

## Screens

| Route | Audience | Purpose |
| --- | --- | --- |
| `/` | Public | Welcome; redirects signed-in users to their home |
| `/login`, `/register` | Public | Auth (patient / doctor tabs) |
| `/dashboard` | Patient | Home — greeting, find-care CTA, next visit, outcome check-in |
| `/intake` | Patient | Find care — symptom tiles, long-term illness, face severity |
| `/recommendations` | Patient | Ranked doctor matches |
| `/match/[doctorId]` | Patient | "Why this doctor?" — plain-language reasons |
| `/doctors` | Patient | Doctor directory (not currently linked from nav) |
| `/doctors/[id]` | Patient | Doctor detail (not currently linked from nav) |
| `/doctors/[id]/book` | Patient | Slot picker → **request** an appointment |
| `/appointments` | Patient | Visits + status banners, pay, cancel, review |
| `/appointments/confirmed` | Patient | "Request sent" + countdown + `.ics` |
| `/payments/callback` | Patient | Paystack return → verify |
| `/profile` | Patient | Health info that feeds matching |
| `/doctor-portal` | Doctor | Requests inbox, visit queue, availability |
| `/doctor-profile` | Doctor | Clinic address / meeting link / fee |
| `/admin` | Admin | KPIs, model status, verification queue |
| `/admin/doctors` | Admin | Verify / suspend doctors |
| `/admin/model` | Admin | CBF + CF state, trigger retrain |
| `/admin/account` | Admin | Identity + log out (no backing endpoint) |

## Endpoint → UI coverage

Almost every route in the FastAPI backend is reachable through the UI. The few exceptions are
called out as *unused* below — they exist on the typed client but no screen calls them.

**Auth**
- `POST /api/auth/register/patient` → `/register` (Patient tab)
- `POST /api/auth/register/doctor` → `/register` (Doctor tab)
- `POST /api/auth/login` → `/login`

**Patients**
- `GET /api/patients/me` → `/dashboard`, `/profile`
- `PUT /api/patients/me` → `/profile`
- `POST /api/patients/recommend` → `/intake` → `/recommendations`
- `GET /api/patients/consultations` → `/dashboard`, `/appointments`
- `GET /api/patients/me/recommendations/latest` → `/recommendations`, `/match/[doctorId]` fallback
- `GET /api/patients/me/activity` → wired in the client (`api.patients.activity`), unused

**Doctors**
- `GET /api/doctors/` → `/doctors`, plus name lookups on `/dashboard` and `/appointments`
- `GET /api/doctors/me` → `/doctor-portal`, `/doctor-profile`
- `PUT /api/doctors/me` → `/doctor-profile`
- `GET /api/doctors/{id}` → `/doctors/[id]`, `/doctors/[id]/book`
- `POST /api/doctors/availability` → `/doctor-portal` (Add free times)
- `GET /api/doctors/{id}/availability` → `/doctors/[id]/book` (slot picker)
- `GET /api/doctors/me/consultations` → `/doctor-portal`
- `GET /api/doctors/me/requests` → `/doctor-portal` (People waiting for you)
- `GET /api/doctors/me/metrics` → `/doctor-portal`

**Consultations** (lifecycle: requested → accepted → scheduled → completed)
- `POST /api/consultations/` → `/doctors/[id]/book` (Request appointment)
- `GET /api/consultations/{id}` → wired in the client (`api.consultations.get`), unused
- `PUT /api/consultations/{id}` → `/doctor-portal` (Done / No-show)
- `POST /api/consultations/{id}/accept` → `/doctor-portal`
- `POST /api/consultations/{id}/decline` → `/doctor-portal` (decline modal)
- `POST /api/consultations/{id}/withdraw` → `/appointments`
- `POST /api/consultations/{id}/cancel` → `/appointments`, `/doctor-portal`
- `GET /api/consultations/{id}/next-best` → `/appointments` (NextBestDoctor block)
- `POST /api/consultations/feedback` → `/appointments` (review modal, sends `treatment_outcome`)

**Payments**
- `POST /api/payments/initialize` → `/appointments` (Pay button) → Paystack
- `GET /api/payments/verify/{ref}` → `/payments/callback`

**Admin**
- `GET /api/admin/stats` → `/admin`
- `GET /api/admin/model-status` → `/admin`, `/admin/model`
- `GET /api/admin/doctors/pending` → `/admin`, `/admin/doctors`
- `POST /api/admin/doctors/{id}/verify` → `/admin`, `/admin/doctors`
- `POST /api/admin/doctors/{id}/suspend` → `/admin`, `/admin/doctors`
- `POST /api/admin/retrain` → `/admin`, `/admin/model`

**Health**
- `GET /health` → wired in the client (`api.health()`), unused.

## Project structure

```
src/
  app/
    layout.tsx            Root layout (fonts, AuthProvider)
    page.tsx              Landing
    login/ register/      Auth screens
    (app)/                Authenticated shell (role-based nav + guard)
      layout.tsx
      dashboard/ intake/ recommendations/ match/[doctorId]/
      doctors/ doctors/[id]/ doctors/[id]/book/
      appointments/ appointments/confirmed/ profile/
      doctor-portal/ admin/
  components/
    Brand.tsx                                     Wordmark
    ui/                                            Design-system primitives kit
      Button, Card, Input, Textarea, Chip, StatusBadge,
      Loader, Modal, Skeleton, Countdown, Icon, cn
    app/                                           Feature + authenticated chrome
      SideRail, BottomNav, RoleGate                (desktop rail / mobile bottom bar)
      navItems.ts, useActiveHref.ts                (role-based nav model)
      IntakeWizard, MatchCard, MatchBreakdown, ColdStartBanner,
      DoctorCard, FeedbackModal, AvailabilityForm, RequestCard,
      NextBestDoctor, PendingDoctorRow
  lib/
    api.ts                Typed client for every endpoint
    types.ts              Mirrors the Pydantic schemas
    auth.tsx              JWT session + role context
    recommendations.ts    Recommendation cache + server-side fallback
    useApi.ts, format.ts, ics.ts, clsx.ts
```

## Notes

- JWT is stored in `localStorage` and sent as `Authorization: Bearer`. The `(app)` layout
  guards authenticated routes and redirects to `/login` when no token is present. A `401` on an
  authenticated request clears the session and bounces to `/login`.
- The guard is **client-side only** (there is no `middleware.ts`) and checks that a role exists,
  not which one. Role authorization is enforced by the backend, not here.
- Recommendation results are passed from `/intake` to `/recommendations` via `sessionStorage`,
  falling back to `GET /api/patients/me/recommendations/latest` when the tab has no cached copy
  (see `lib/recommendations.ts`). The rebuilt list has no `recommendation_id`, so a visit booked
  from it is not attributed back to the ranked list.
- **No gradients, blur or glassmorphism** — Warm Care is deliberately flat, high-contrast and
  picture-assisted (icon + colour + short word, faces for feeling).
- The landing hero is a pure CSS gradient block (no hotlinked images), and doctor avatars are
  generated from initials, so nothing breaks offline and no external image host is required.
- Icons use the Material Symbols Outlined font via the `<Icon>` primitive (`name` = ligature).
