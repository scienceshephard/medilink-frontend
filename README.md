# MediLink AI — Frontend

A Next.js 14 (App Router) frontend for the **HPTRS** hybrid doctor recommendation backend.
The UI implements the **Clinical Clarity** design system and the five Stitch mockups, and
wires every backend API endpoint to a screen.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Inter + Material Symbols.

No UI framework dependency — components are hand-built against the design tokens in
`tailwind.config.ts` (lifted verbatim from the backend `DESIGN.md`).

## Quick start

```bash
npm install
cp .env.local.example .env.local      # point NEXT_PUBLIC_API_BASE_URL at your backend
npm run dev                            # http://localhost:3000
```

The backend already allows `http://localhost:3000` in its CORS config, so no extra setup is
needed when running the FastAPI server on `:8000`.

```bash
npm run build && npm run start         # production build
```

> The app loads the Inter and Material Symbols fonts from Google Fonts. An internet connection
> is required for icons and typography to render (the original mockups use the same CDN).

## Demo logins

- **Admin** — `admin@hptrs.com` with any password (per the backend's env-based admin).
- **Patient / Doctor** — register from `/register`, then sign in. Doctors start `pending` until
  an admin verifies them from the analytics console.

## Screens

| Route | Audience | Mockup |
| --- | --- | --- |
| `/` | Public | MediLink AI landing |
| `/login`, `/register` | Public | — (auth) |
| `/dashboard` | Patient | — (patient home) |
| `/intake` | Patient | Patient intake form |
| `/recommendations` | Patient | AI doctor recommendations |
| `/doctors` | All | — (directory) |
| `/doctors/[id]` | All | Doctor profile detail |
| `/appointments` | Patient | — (appointments + feedback) |
| `/doctor-portal` | Doctor | — (practice dashboard) |
| `/admin` | Admin | Admin analytics overview |

## Endpoint → UI coverage

Every route in the FastAPI backend is reachable through the UI:

**Auth**
- `POST /api/auth/register/patient` → `/register` (Patient tab)
- `POST /api/auth/register/doctor` → `/register` (Doctor tab)
- `POST /api/auth/login` → `/login`

**Patients**
- `GET /api/patients/me` → `/dashboard`
- `PUT /api/patients/me` → `/intake` (Personal Info + Medical History steps)
- `POST /api/patients/recommend` → `/intake` (final step) → `/recommendations`
- `GET /api/patients/consultations` → `/dashboard`, `/appointments`

**Doctors**
- `GET /api/doctors/` → `/doctors`
- `GET /api/doctors/me` → `/doctor-portal`
- `GET /api/doctors/{id}` → `/doctors/[id]`
- `POST /api/doctors/availability` → `/doctor-portal` (Add availability)
- `GET /api/doctors/{id}/availability` → `/doctors/[id]` (Schedule consultation)
- `GET /api/doctors/me/consultations` → `/doctor-portal`
- `GET /api/doctors/me/metrics` → `/doctor-portal`

**Consultations**
- `POST /api/consultations/` → `/doctors/[id]` (Confirm appointment), `/recommendations` (Book)
- `GET /api/consultations/{id}` → wired in the API client (`api.consultations.get`)
- `PUT /api/consultations/{id}` → `/doctor-portal` (Update consultation modal)
- `POST /api/consultations/feedback` → `/appointments` (feedback modal)

**Admin**
- `GET /api/admin/stats` → `/admin`
- `GET /api/admin/model-status` → `/admin` (Model status panel)
- `GET /api/admin/doctors/pending` → `/admin` (Verification queue)
- `POST /api/admin/doctors/{id}/verify` → `/admin` (Verify)
- `POST /api/admin/doctors/{id}/suspend` → `/admin` (Suspend)
- `POST /api/admin/retrain` → `/admin` (Trigger retrain)

**Health**
- `GET /health` → `api.health()` in the client.

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
      Button, Card, Input, Textarea, Chip, StatusBadge, Avatar,
      ScoreBar, RingScore, Slider, Stepper, Loader, Modal, Skeleton,
      EmptyState, Icon, cn  (+ index.ts barrel)
    app/                                           Feature + authenticated chrome
      TopNav, Sidebar, RoleGate                    (patient top-nav / staff sidebar)
      IntakeWizard, MatchCard, MatchBreakdown, ColdStartBanner,
      DoctorCard, FeedbackModal, MetricCard, AvailabilityForm,
      PendingDoctorRow
  lib/
    api.ts                Typed client for every endpoint
    types.ts              Mirrors the Pydantic schemas
    auth.tsx              JWT session + role context
    useApi.ts, format.ts, clsx.ts
```

## Notes

- JWT is stored in `localStorage` and sent as `Authorization: Bearer`. The `(app)` layout
  guards authenticated routes and redirects to `/login` when no token is present.
- Recommendation results are passed from `/intake` to `/recommendations` via `sessionStorage`.
- Glassmorphism is reserved for AI-augmented surfaces (insight panels, accuracy cards), per the
  design system.
- The landing hero is a pure CSS gradient block (no hotlinked images), and doctor avatars are
  generated from initials, so nothing breaks offline and no external image host is required.
- Icons use the Material Symbols Outlined font via the `<Icon>` primitive (`name` = ligature).
