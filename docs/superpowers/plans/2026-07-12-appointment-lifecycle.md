# SP3 — Appointment Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace instant self-service booking with a request → doctor-accepts → pay → visit → review lifecycle, adding in-person/video locations, severity-scaled response deadlines, and a next-best-doctor fallback on decline.

**Architecture:** The backend gains four consultation statuses (`requested`, `accepted`, `declined`, `expired`) alongside the existing four. `scheduled` is re-pointed to mean "accepted **and** paid", so no status backfill is needed. Money stays in the `payments` table (SP1's join-derived design is untouched); paying is simply the gate promoting `accepted → scheduled`. Deadlines are enforced **lazily** — an `expire_stale(db)` sweep runs at the top of every endpoint that reads availability or consultation lists, because this stack has no background worker. Alembic is introduced because `create_all()` cannot add columns to existing tables.

**Tech Stack:** FastAPI · SQLAlchemy · Alembic · Pydantic v2 · pytest (SQLite in-memory harness) · Next.js 14 App Router · React 18 · TypeScript · Tailwind (Clinical Clarity tokens)

**Spec:** `docs/superpowers/specs/2026-07-12-appointment-lifecycle-design.md`

## Global Constraints

- **Two repos.** Backend = `/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system` (branch off `main`). Frontend = `/home/shephard/Desktop/Work/Web Apps/medilink-frontend` (branch off `master`). Both currently sit on `feature/cancel-refund`; branch SP3 from there so SP2's refund code is present.
- **Backend is TDD.** Write the failing test, run it, see it fail, then implement. Never the reverse.
- **Frontend verification** is `npx tsc --noEmit` && `npm run build`. There is no frontend test runner in this project — do not add one.
- **Response windows:** severe → 2h, moderate → 6h, mild → 12h, absent/unknown → 12h. **Payment window:** 2h. Both **always clamped to the slot's `start_time`**.
- **Acceptance rate** = `accepted / (accepted + declined + expired)`. Expiry counts in the denominator deliberately.
- **Never invent a new visual language.** All UI uses the existing `Card`, `Button`, `StatusBadge`, `Avatar`, `Icon`, `MetricCard` and the tokens in `tailwind.config.ts`. Patient pages keep `TopNav`; doctor pages keep `Sidebar`.
- **All datetimes are naive UTC** (`datetime.utcnow()`), matching the existing codebase. Do not introduce tz-aware datetimes.
- Currency is NGN; amounts are Naira floats in the DB, kobo ints at the Paystack boundary.

---

## File Structure

### Backend — `hybrid-personalized-recommendation-system`

| File | Responsibility |
| --- | --- |
| `app/models/__init__.py` | **Modify.** New enum values, new columns on `Consultation`, `AvailabilitySlot`, `Doctor`, `Recommendation`. |
| `app/services/appointments.py` | **Create.** Deadline maths, lazy expiry sweep, doctor stat recomputation. The one place lifecycle rules live. |
| `app/schemas/__init__.py` | **Modify.** Request/response models for the new endpoints. |
| `app/routers/consultations.py` | **Modify.** Booking becomes a request; add accept/decline/withdraw/next-best; guard cancel and complete. |
| `app/routers/payments.py` | **Modify.** Gate `initialize`; promote `accepted → scheduled` on success; refund late payments. |
| `app/routers/doctors.py` | **Modify.** Add `PUT /me`, `GET /me/requests`; slot `mode`; expose response stats. |
| `app/routers/patients.py` | **Modify.** Call `expire_stale` before listing consultations. |
| `app/services/recommendation_service.py` | **Modify.** Persist `severity` on the `Recommendation` row. |
| `alembic/` + `alembic.ini` | **Create.** Baseline + SP3 revision. |
| `tests/test_appointment_lifecycle.py` | **Create.** The 20 tests from the spec. |
| `tests/conftest.py` | **Modify.** Fixtures for slots, requested consultations, a clinic-configured doctor. |

### Frontend — `medilink-frontend`

| File | Responsibility |
| --- | --- |
| `src/lib/types.ts` | **Modify.** New statuses, mode, deadlines, doctor stats. |
| `src/lib/api.ts` | **Modify.** `consultations.accept/decline/withdraw/nextBest`, `doctors.updateMe/myRequests`. |
| `src/lib/format.ts` | **Modify.** `statusTone` for new statuses; `severityTone`; `formatCountdown`. |
| `src/components/ui/Countdown.tsx` | **Create.** Ticking countdown to a deadline. |
| `src/components/app/NextBestDoctor.tsx` | **Create.** The decline-recovery block. |
| `src/components/app/RequestCard.tsx` | **Create.** One request in the doctor's inbox. |
| `src/app/(app)/appointments/page.tsx` | **Modify.** Four card states + banners. |
| `src/app/(app)/appointments/confirmed/page.tsx` | **Modify.** "Request sent", not "Confirmed". |
| `src/app/(app)/doctors/[id]/book/page.tsx` | **Modify.** "Request appointment"; kill the Telehealth hardcode; show response stats. |
| `src/app/(app)/doctor-portal/page.tsx` | **Modify.** Requests inbox above the queue. |
| `src/app/(app)/doctor-profile/page.tsx` | **Create.** Doctors cannot edit anything today. |
| `src/components/app/AvailabilityForm.tsx` | **Modify.** In-person / video toggle. |
| `src/app/(app)/layout.tsx` | **Modify.** Add "My Profile" to the doctor sidebar. |

---

## Task 1: Extend the models

**Files:**
- Modify: `app/models/__init__.py`
- Test: `tests/test_appointment_lifecycle.py` (create)

**Interfaces:**
- Produces: `SlotMode` enum (`in_person`, `video`); `ConsultationStatus` gains `requested`, `accepted`, `declined`, `expired`; `Consultation.requested_at/respond_by/responded_at/pay_by/severity/mode/location/meeting_link/recommendation_id/decline_reason`; `AvailabilitySlot.mode`; `Doctor.clinic_name/clinic_address/default_meeting_link/avg_response_minutes`; `Recommendation.severity`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_appointment_lifecycle.py`:

```python
from datetime import datetime, timedelta

from app.models import (
    AvailabilitySlot, Consultation, ConsultationStatus, Doctor, SlotMode,
)


def test_new_consultation_statuses_exist():
    assert ConsultationStatus.requested.value == "requested"
    assert ConsultationStatus.accepted.value == "accepted"
    assert ConsultationStatus.declined.value == "declined"
    assert ConsultationStatus.expired.value == "expired"


def test_slot_mode_defaults_to_in_person(db, doctor):
    slot = AvailabilitySlot(
        doctor_id=doctor.id,
        start_time=datetime(2026, 8, 1, 10, 0),
        end_time=datetime(2026, 8, 1, 10, 30),
    )
    db.add(slot); db.commit(); db.refresh(slot)
    assert slot.mode == SlotMode.in_person


def test_doctor_has_clinic_fields(db, doctor):
    doctor.clinic_name = "Eze Heart Clinic"
    doctor.clinic_address = "12 Awolowo Road, Ikoyi, Lagos"
    doctor.default_meeting_link = "https://meet.example.com/eze"
    doctor.avg_response_minutes = 180.0
    db.commit(); db.refresh(doctor)
    assert doctor.clinic_address.endswith("Lagos")
    assert doctor.avg_response_minutes == 180.0


def test_consultation_lifecycle_columns(db, patient, doctor):
    now = datetime(2026, 8, 1, 8, 0)
    c = Consultation(
        patient_id=patient.id,
        doctor_id=doctor.id,
        scheduled_datetime=datetime(2026, 8, 1, 10, 0),
        status=ConsultationStatus.requested,
        requested_at=now,
        respond_by=now + timedelta(hours=2),
        severity="severe",
        mode=SlotMode.in_person,
    )
    db.add(c); db.commit(); db.refresh(c)
    assert c.status == ConsultationStatus.requested
    assert c.responded_at is None
    assert c.pay_by is None
    assert c.location is None
    assert c.meeting_link is None
    assert c.recommendation_id is None
    assert c.decline_reason is None
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system"
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -v
```

Expected: `ImportError: cannot import name 'SlotMode' from 'app.models'`.

- [ ] **Step 3: Add the enums**

In `app/models/__init__.py`, extend `ConsultationStatus` and add `SlotMode` next to the other enums:

```python
class ConsultationStatus(str, enum.Enum):
    requested = "requested"
    accepted = "accepted"
    declined = "declined"
    expired = "expired"
    scheduled = "scheduled"      # accepted AND paid — the appointment is on
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class SlotMode(str, enum.Enum):
    in_person = "in_person"
    video = "video"
```

- [ ] **Step 4: Add the columns**

In `AvailabilitySlot`, after `is_booked`:

```python
    mode = Column(Enum(SlotMode), default=SlotMode.in_person, nullable=False)
```

In `Doctor`, after `consultation_fee`:

```python
    # Practice location (required before an in-person slot can be created/accepted)
    clinic_name = Column(String(120), nullable=True)
    clinic_address = Column(String(255), nullable=True)
    default_meeting_link = Column(Text, nullable=True)
    avg_response_minutes = Column(Float, nullable=True)
```

In `Consultation`, after `duration_minutes`:

```python
    # ── Lifecycle (SP3) ──
    requested_at = Column(DateTime, nullable=True)
    respond_by = Column(DateTime, nullable=True)      # doctor's deadline
    responded_at = Column(DateTime, nullable=True)    # accept/decline timestamp
    pay_by = Column(DateTime, nullable=True)          # patient's payment deadline
    severity = Column(String(16), nullable=True)      # mild | moderate | severe
    mode = Column(Enum(SlotMode), default=SlotMode.in_person, nullable=False)
    location = Column(String(255), nullable=True)     # snapshot at acceptance
    meeting_link = Column(Text, nullable=True)        # snapshot at acceptance
    recommendation_id = Column(Integer, ForeignKey("recommendations.id"), nullable=True)
    decline_reason = Column(String(255), nullable=True)
```

In `Recommendation`, after `symptom_input`:

```python
    severity = Column(String(16), nullable=True)   # mild | moderate | severe
```

- [ ] **Step 5: Run the tests and watch them pass**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -v
```

Expected: 4 passed.

- [ ] **Step 6: Confirm nothing regressed**

```bash
venv/bin/python -m pytest -q
```

Expected: 25 passed (21 existing + 4 new).

- [ ] **Step 7: Commit**

```bash
git checkout -b feature/appointment-lifecycle
git add app/models/__init__.py tests/test_appointment_lifecycle.py
git commit -m "feat(appointments): add lifecycle statuses, slot mode, and clinic columns"
```

---

## Task 2: Introduce Alembic

**Files:**
- Create: `alembic.ini`, `alembic/env.py`, `alembic/script.py.mako`, `alembic/versions/0001_baseline.py`, `alembic/versions/0002_sp3_appointment_lifecycle.py`
- Modify: `README.md`

**Interfaces:**
- Consumes: the models from Task 1.
- Produces: `alembic upgrade head` brings any existing database to the SP3 schema.

Why this task exists: `Base.metadata.create_all()` in `app/main.py` creates **missing tables** but will **never add a column to a table that already exists**. Task 1 added ~14 columns to four existing tables. On the developer's existing Postgres database the app would start and then crash on the first query. `alembic` is already in `requirements.txt`, unused.

- [ ] **Step 1: Initialise Alembic**

```bash
cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system"
venv/bin/alembic init alembic
```

- [ ] **Step 2: Point `alembic/env.py` at the app's metadata and settings**

Replace the top of `alembic/env.py` (above `run_migrations_offline`) with:

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

from app.config import settings
from app.database import Base
import app.models  # noqa: F401  — registers every model on Base.metadata

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
```

- [ ] **Step 3: Generate the baseline revision from the pre-SP3 schema**

The baseline must describe the schema **as it was before Task 1**, so existing databases can be stamped without re-creating what they already have. Write `alembic/versions/0001_baseline.py` by hand:

```python
"""baseline — schema as of SP2 (pre-appointment-lifecycle)

Revision ID: 0001_baseline
Revises:
Create Date: 2026-07-12
"""
revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """No-op. Existing databases are stamped at this revision; fresh ones are
    created by Base.metadata.create_all() in the app lifespan."""
    pass


def downgrade() -> None:
    pass
```

- [ ] **Step 4: Write the SP3 revision**

Create `alembic/versions/0002_sp3_appointment_lifecycle.py`:

```python
"""SP3 — appointment lifecycle: statuses, deadlines, slot mode, clinic fields

Revision ID: 0002_sp3_appointment_lifecycle
Revises: 0001_baseline
Create Date: 2026-07-12
"""
import sqlalchemy as sa
from alembic import op

revision = "0002_sp3_appointment_lifecycle"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None

NEW_STATUSES = ("requested", "accepted", "declined", "expired")


def upgrade() -> None:
    # 1. Extend the consultationstatus enum (Postgres requires one ALTER per value)
    for value in NEW_STATUSES:
        op.execute(f"ALTER TYPE consultationstatus ADD VALUE IF NOT EXISTS '{value}'")

    # 2. New slotmode enum
    slotmode = sa.Enum("in_person", "video", name="slotmode")
    slotmode.create(op.get_bind(), checkfirst=True)

    # 3. availability_slots.mode
    op.add_column(
        "availability_slots",
        sa.Column("mode", slotmode, nullable=False, server_default="in_person"),
    )

    # 4. doctors — clinic + responsiveness
    op.add_column("doctors", sa.Column("clinic_name", sa.String(120), nullable=True))
    op.add_column("doctors", sa.Column("clinic_address", sa.String(255), nullable=True))
    op.add_column("doctors", sa.Column("default_meeting_link", sa.Text(), nullable=True))
    op.add_column("doctors", sa.Column("avg_response_minutes", sa.Float(), nullable=True))

    # 5. recommendations.severity
    op.add_column("recommendations", sa.Column("severity", sa.String(16), nullable=True))

    # 6. consultations — the lifecycle itself
    op.add_column("consultations", sa.Column("requested_at", sa.DateTime(), nullable=True))
    op.add_column("consultations", sa.Column("respond_by", sa.DateTime(), nullable=True))
    op.add_column("consultations", sa.Column("responded_at", sa.DateTime(), nullable=True))
    op.add_column("consultations", sa.Column("pay_by", sa.DateTime(), nullable=True))
    op.add_column("consultations", sa.Column("severity", sa.String(16), nullable=True))
    op.add_column(
        "consultations",
        sa.Column("mode", slotmode, nullable=False, server_default="in_person"),
    )
    op.add_column("consultations", sa.Column("location", sa.String(255), nullable=True))
    op.add_column("consultations", sa.Column("meeting_link", sa.Text(), nullable=True))
    op.add_column("consultations", sa.Column("decline_reason", sa.String(255), nullable=True))
    op.add_column("consultations", sa.Column("recommendation_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_consultations_recommendation_id",
        "consultations", "recommendations",
        ["recommendation_id"], ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_consultations_recommendation_id", "consultations", type_="foreignkey")
    for col in ("recommendation_id", "decline_reason", "meeting_link", "location",
                "mode", "severity", "pay_by", "responded_at", "respond_by", "requested_at"):
        op.drop_column("consultations", col)
    op.drop_column("recommendations", "severity")
    for col in ("avg_response_minutes", "default_meeting_link", "clinic_address", "clinic_name"):
        op.drop_column("doctors", col)
    op.drop_column("availability_slots", "mode")
    sa.Enum(name="slotmode").drop(op.get_bind(), checkfirst=True)
    # Postgres cannot remove enum values; consultationstatus keeps the four new ones.
```

- [ ] **Step 5: Verify the migration applies**

If the developer has an existing database, stamp it at the baseline and upgrade:

```bash
venv/bin/alembic stamp 0001_baseline
venv/bin/alembic upgrade head
```

Expected: `Running upgrade 0001_baseline -> 0002_sp3_appointment_lifecycle`.

Confirm the columns landed:

```bash
venv/bin/python -c "
from app.database import engine
from sqlalchemy import inspect
cols = {c['name'] for c in inspect(engine).get_columns('consultations')}
assert {'requested_at','respond_by','responded_at','pay_by','severity','mode',
        'location','meeting_link','recommendation_id','decline_reason'} <= cols
print('consultations OK')
"
```

Expected: `consultations OK`.

- [ ] **Step 6: Document it in the README**

Append to `README.md`:

```markdown
## Database migrations

Schema changes are managed with Alembic. `create_all()` still runs on startup for
fresh databases and the test harness, but it cannot alter existing tables.

```bash
alembic upgrade head          # apply pending migrations
alembic revision -m "..."     # author a new one
```

An existing database created before Alembic was introduced must be stamped once:

```bash
alembic stamp 0001_baseline && alembic upgrade head
```
```

- [ ] **Step 7: Commit**

```bash
git add alembic alembic.ini README.md
git commit -m "chore(db): introduce Alembic with SP3 lifecycle migration"
```

---

## Task 3: Lifecycle service — deadlines, expiry, doctor stats

**Files:**
- Create: `app/services/appointments.py`
- Modify: `tests/conftest.py`
- Test: `tests/test_appointment_lifecycle.py`

**Interfaces:**
- Consumes: models from Task 1.
- Produces:
  - `RESPONSE_WINDOWS: dict[str, timedelta]`, `DEFAULT_RESPONSE_WINDOW: timedelta`, `PAYMENT_WINDOW: timedelta`
  - `compute_respond_by(requested_at: datetime, severity: str | None, slot_start: datetime) -> datetime`
  - `compute_pay_by(accepted_at: datetime, slot_start: datetime) -> datetime`
  - `expire_stale(db: Session) -> int` — returns how many consultations it expired
  - `recompute_doctor_stats(db: Session, doctor: Doctor) -> None`

- [ ] **Step 1: Add fixtures the lifecycle tests need**

Append to `tests/conftest.py`:

```python
@pytest.fixture()
def clinic_doctor(db):
    """A doctor who can actually accept an in-person request."""
    d = Doctor(full_name="Dr Ngozi Eze", email="eze@test.com", hashed_password="x",
               consultation_fee=15000.0, clinic_name="Eze Heart Clinic",
               clinic_address="12 Awolowo Road, Ikoyi, Lagos",
               default_meeting_link="https://meet.example.com/eze")
    db.add(d); db.commit(); db.refresh(d)
    return d


@pytest.fixture()
def clinic_doctor_auth(clinic_doctor):
    token = create_access_token({"sub": str(clinic_doctor.id), "role": "doctor"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def slot(db, clinic_doctor):
    from datetime import datetime, timedelta
    from app.models import AvailabilitySlot
    start = datetime.utcnow() + timedelta(days=3)
    s = AvailabilitySlot(doctor_id=clinic_doctor.id, start_time=start,
                         end_time=start + timedelta(minutes=30))
    db.add(s); db.commit(); db.refresh(s)
    return s
```

Add the import at the top of `conftest.py`:

```python
from app.models import Patient, Doctor, Consultation, AvailabilitySlot
```

- [ ] **Step 2: Write the failing tests**

Append to `tests/test_appointment_lifecycle.py`:

```python
from app.services.appointments import (
    DEFAULT_RESPONSE_WINDOW, PAYMENT_WINDOW, compute_pay_by, compute_respond_by,
    expire_stale, recompute_doctor_stats,
)


def test_respond_by_scales_with_severity():
    requested = datetime(2026, 8, 1, 8, 0)
    far_slot = datetime(2026, 9, 1, 10, 0)          # far enough not to clamp
    assert compute_respond_by(requested, "severe", far_slot) == requested + timedelta(hours=2)
    assert compute_respond_by(requested, "moderate", far_slot) == requested + timedelta(hours=6)
    assert compute_respond_by(requested, "mild", far_slot) == requested + timedelta(hours=12)


def test_respond_by_defaults_to_twelve_hours_when_severity_missing():
    requested = datetime(2026, 8, 1, 8, 0)
    far_slot = datetime(2026, 9, 1, 10, 0)
    assert compute_respond_by(requested, None, far_slot) == requested + DEFAULT_RESPONSE_WINDOW
    assert compute_respond_by(requested, "banana", far_slot) == requested + DEFAULT_RESPONSE_WINDOW


def test_deadlines_are_clamped_to_slot_start():
    requested = datetime(2026, 8, 1, 8, 0)
    near_slot = datetime(2026, 8, 1, 9, 0)          # only 1h away
    assert compute_respond_by(requested, "mild", near_slot) == near_slot
    assert compute_pay_by(requested, near_slot) == near_slot


def test_pay_by_is_two_hours_when_slot_is_far():
    accepted = datetime(2026, 8, 1, 8, 0)
    far_slot = datetime(2026, 9, 1, 10, 0)
    assert compute_pay_by(accepted, far_slot) == accepted + PAYMENT_WINDOW


def test_expire_stale_expires_unanswered_request_and_frees_slot(db, patient, clinic_doctor, slot):
    slot.is_booked = True
    c = Consultation(
        patient_id=patient.id, doctor_id=clinic_doctor.id, slot_id=slot.id,
        scheduled_datetime=slot.start_time, status=ConsultationStatus.requested,
        requested_at=datetime.utcnow() - timedelta(hours=13),
        respond_by=datetime.utcnow() - timedelta(hours=1),   # lapsed
    )
    db.add(c); db.commit()

    assert expire_stale(db) == 1

    db.refresh(c); db.refresh(slot)
    assert c.status == ConsultationStatus.expired
    assert slot.is_booked is False


def test_expire_stale_expires_unpaid_acceptance_and_frees_slot(db, patient, clinic_doctor, slot):
    slot.is_booked = True
    c = Consultation(
        patient_id=patient.id, doctor_id=clinic_doctor.id, slot_id=slot.id,
        scheduled_datetime=slot.start_time, status=ConsultationStatus.accepted,
        requested_at=datetime.utcnow() - timedelta(hours=5),
        respond_by=datetime.utcnow() - timedelta(hours=3),
        responded_at=datetime.utcnow() - timedelta(hours=3),
        pay_by=datetime.utcnow() - timedelta(minutes=1),     # lapsed
    )
    db.add(c); db.commit()

    assert expire_stale(db) == 1

    db.refresh(c); db.refresh(slot)
    assert c.status == ConsultationStatus.expired
    assert slot.is_booked is False


def test_expire_stale_leaves_live_requests_alone(db, patient, clinic_doctor, slot):
    slot.is_booked = True
    c = Consultation(
        patient_id=patient.id, doctor_id=clinic_doctor.id, slot_id=slot.id,
        scheduled_datetime=slot.start_time, status=ConsultationStatus.requested,
        requested_at=datetime.utcnow(),
        respond_by=datetime.utcnow() + timedelta(hours=6),   # still live
    )
    db.add(c); db.commit()

    assert expire_stale(db) == 0

    db.refresh(c); db.refresh(slot)
    assert c.status == ConsultationStatus.requested
    assert slot.is_booked is True


def test_recompute_doctor_stats_counts_expiry_against_acceptance(db, patient, clinic_doctor):
    """accepted / (accepted + declined + expired) — silence is as bad as a refusal."""
    now = datetime.utcnow()
    rows = [
        # 2 accepted, each answered in 1 hour
        (ConsultationStatus.accepted, now - timedelta(hours=1), now),
        (ConsultationStatus.accepted, now - timedelta(hours=1), now),
        # 1 declined, answered in 3 hours
        (ConsultationStatus.declined, now - timedelta(hours=3), now),
        # 1 expired — never answered
        (ConsultationStatus.expired, now - timedelta(hours=13), None),
    ]
    for status, requested_at, responded_at in rows:
        db.add(Consultation(
            patient_id=patient.id, doctor_id=clinic_doctor.id,
            scheduled_datetime=now + timedelta(days=1), status=status,
            requested_at=requested_at, responded_at=responded_at,
        ))
    db.commit()

    recompute_doctor_stats(db, clinic_doctor)
    db.refresh(clinic_doctor)

    assert clinic_doctor.recommendation_acceptance_rate == 0.5      # 2 / (2+1+1)
    assert clinic_doctor.avg_response_minutes == 100.0             # (60+60+180)/3
```

- [ ] **Step 3: Run them and watch them fail**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.services.appointments'`.

- [ ] **Step 4: Implement the service**

Create `app/services/appointments.py`:

```python
"""Appointment lifecycle rules.

Every deadline, expiry and doctor-responsiveness statistic lives here, so the
routers stay thin and the rules are testable without HTTP.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models import AvailabilitySlot, Consultation, ConsultationStatus, Doctor

logger = logging.getLogger(__name__)

# How long the doctor has to answer, by the severity the patient reported at intake.
RESPONSE_WINDOWS = {
    "severe": timedelta(hours=2),
    "moderate": timedelta(hours=6),
    "mild": timedelta(hours=12),
}
DEFAULT_RESPONSE_WINDOW = timedelta(hours=12)   # severity absent or unrecognised
PAYMENT_WINDOW = timedelta(hours=2)             # after acceptance

# A request is dead once the doctor has answered or the clock has run out.
_PENDING_DOCTOR = ConsultationStatus.requested
_PENDING_PAYMENT = ConsultationStatus.accepted


def compute_respond_by(requested_at: datetime, severity: Optional[str],
                       slot_start: datetime) -> datetime:
    """The doctor's deadline. A hold can never outlive the appointment it holds."""
    window = RESPONSE_WINDOWS.get((severity or "").lower(), DEFAULT_RESPONSE_WINDOW)
    return min(requested_at + window, slot_start)


def compute_pay_by(accepted_at: datetime, slot_start: datetime) -> datetime:
    """The patient's payment deadline, likewise clamped to the slot."""
    return min(accepted_at + PAYMENT_WINDOW, slot_start)


def _free_slot(db: Session, consult: Consultation) -> None:
    if not consult.slot_id:
        return
    slot = db.query(AvailabilitySlot).filter(
        AvailabilitySlot.id == consult.slot_id
    ).first()
    if slot:
        slot.is_booked = False


def expire_stale(db: Session) -> int:
    """Expire lapsed requests and unpaid acceptances, freeing their slots.

    Lazy sweep: there is no background worker in this stack, so this runs at the
    top of every endpoint that reads availability or consultation lists. A blown
    deadline is therefore always resolved *before* anyone can read — or
    double-book — the slot it was holding.

    Returns the number of consultations expired.
    """
    now = datetime.utcnow()

    stale = db.query(Consultation).filter(
        ((Consultation.status == _PENDING_DOCTOR) & (Consultation.respond_by < now))
        | ((Consultation.status == _PENDING_PAYMENT) & (Consultation.pay_by < now))
    ).all()

    if not stale:
        return 0

    touched_doctors = set()
    for consult in stale:
        consult.status = ConsultationStatus.expired
        _free_slot(db, consult)
        touched_doctors.add(consult.doctor_id)

    db.commit()

    # An unanswered request counts against the doctor's acceptance rate.
    for doctor_id in touched_doctors:
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if doctor:
            recompute_doctor_stats(db, doctor)

    logger.info("Expired %d stale consultation(s)", len(stale))
    return len(stale)


def recompute_doctor_stats(db: Session, doctor: Doctor) -> None:
    """Recompute acceptance rate and mean response time from the doctor's history.

    acceptance_rate = accepted / (accepted + declined + expired)

    Expiry sits in the denominator deliberately: from a sick patient's point of
    view, a doctor who ignores them for twelve hours has done something worse
    than one who declines in five minutes and frees them to find someone else.
    """
    decided = db.query(Consultation).filter(
        Consultation.doctor_id == doctor.id,
        Consultation.status.in_([
            ConsultationStatus.accepted,
            ConsultationStatus.declined,
            ConsultationStatus.expired,
            # An accepted request that went on to be paid, completed, cancelled
            # or no-showed still counts as "accepted" for this metric.
            ConsultationStatus.scheduled,
            ConsultationStatus.completed,
            ConsultationStatus.cancelled,
            ConsultationStatus.no_show,
        ]),
        Consultation.requested_at.isnot(None),
    ).all()

    if decided:
        accepted = sum(
            1 for c in decided
            if c.status != ConsultationStatus.declined
            and c.status != ConsultationStatus.expired
        )
        doctor.recommendation_acceptance_rate = round(accepted / len(decided), 4)

    answered = [c for c in decided if c.responded_at and c.requested_at]
    if answered:
        minutes = [
            (c.responded_at - c.requested_at).total_seconds() / 60.0 for c in answered
        ]
        doctor.avg_response_minutes = round(sum(minutes) / len(minutes), 1)

    db.commit()
```

- [ ] **Step 5: Run the tests and watch them pass**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -v
```

Expected: 12 passed.

- [ ] **Step 6: Confirm nothing regressed**

```bash
venv/bin/python -m pytest -q
```

Expected: 33 passed.

- [ ] **Step 7: Commit**

```bash
git add app/services/appointments.py tests/conftest.py tests/test_appointment_lifecycle.py
git commit -m "feat(appointments): deadline maths, lazy expiry sweep, doctor responsiveness stats"
```

---

## Task 4: Booking becomes a request

**Files:**
- Modify: `app/schemas/__init__.py`, `app/routers/consultations.py`, `app/services/recommendation_service.py`
- Test: `tests/test_appointment_lifecycle.py`

**Interfaces:**
- Consumes: `compute_respond_by`, `expire_stale` (Task 3).
- Produces: `POST /api/consultations/` creates a `requested` consultation; `BookConsultation` gains `recommendation_id`; `Recommendation.severity` is persisted so the backend derives severity itself rather than trusting the client.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_appointment_lifecycle.py`:

```python
from app.models import Recommendation


def _book(client, auth, doctor_id, slot_id, recommendation_id=None):
    return client.post("/api/consultations/", headers=auth, json={
        "doctor_id": doctor_id,
        "slot_id": slot_id,
        "symptom_input": "chest tightness",
        "recommendation_id": recommendation_id,
    })


def test_booking_creates_a_requested_consultation_and_holds_the_slot(
    client, db, patient_auth, clinic_doctor, slot
):
    res = _book(client, patient_auth, clinic_doctor.id, slot.id)
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "requested"
    assert body["respond_by"] is not None

    db.refresh(slot)
    assert slot.is_booked is True


def test_booking_derives_severity_from_the_stored_recommendation(
    client, db, patient, patient_auth, clinic_doctor, slot
):
    rec = Recommendation(patient_id=patient.id, symptom_input="chest tightness",
                         severity="severe")
    db.add(rec); db.commit(); db.refresh(rec)

    res = _book(client, patient_auth, clinic_doctor.id, slot.id, recommendation_id=rec.id)
    assert res.status_code == 201

    c = db.query(Consultation).filter(Consultation.id == res.json()["id"]).first()
    assert c.severity == "severe"
    assert c.recommendation_id == rec.id
    # severe → 2h window
    assert (c.respond_by - c.requested_at) == timedelta(hours=2)


def test_booking_without_a_recommendation_gets_the_default_window(
    client, db, patient_auth, clinic_doctor, slot
):
    res = _book(client, patient_auth, clinic_doctor.id, slot.id)
    c = db.query(Consultation).filter(Consultation.id == res.json()["id"]).first()
    assert c.severity is None
    assert (c.respond_by - c.requested_at) == DEFAULT_RESPONSE_WINDOW


def test_patient_may_only_have_one_pending_request(
    client, db, patient_auth, clinic_doctor, slot
):
    from app.models import AvailabilitySlot
    second = AvailabilitySlot(
        doctor_id=clinic_doctor.id,
        start_time=slot.start_time + timedelta(days=1),
        end_time=slot.end_time + timedelta(days=1),
    )
    db.add(second); db.commit(); db.refresh(second)

    assert _book(client, patient_auth, clinic_doctor.id, slot.id).status_code == 201

    res = _book(client, patient_auth, clinic_doctor.id, second.id)
    assert res.status_code == 409
    assert "pending request" in res.json()["detail"].lower()

    db.refresh(second)
    assert second.is_booked is False


def test_booking_a_held_slot_is_rejected(client, db, patient, patient_auth, clinic_doctor, slot):
    from app.models import Patient
    other = Patient(full_name="Other", email="other@test.com", hashed_password="x")
    db.add(other); db.commit(); db.refresh(other)
    other_auth = {"Authorization": f"Bearer {create_access_token({'sub': str(other.id), 'role': 'patient'})}"}

    assert _book(client, patient_auth, clinic_doctor.id, slot.id).status_code == 201

    res = _book(client, other_auth, clinic_doctor.id, slot.id)
    assert res.status_code == 400
    assert "just taken" in res.json()["detail"].lower() or "unavailable" in res.json()["detail"].lower()
```

Add to the imports at the top of the test file:

```python
from app.core.security import create_access_token
```

- [ ] **Step 2: Run them and watch them fail**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -k booking -v
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -k pending -v
```

Expected: failures — the response has no `respond_by`, and status is `scheduled`.

- [ ] **Step 3: Persist severity on the recommendation**

In `app/services/recommendation_service.py`, in `get_recommendations`, change the `Recommendation(...)` construction (currently around line 118) to carry severity:

```python
    rec_log = Recommendation(
        patient_id=patient.id,
        symptom_input=" ".join(symptom_input.symptoms),
        severity=symptom_input.severity,
        recommended_doctors=[
            {"doctor_id": r["doctor_id"], "score": r["score"]}
            for r in fusion_result["results"]
        ],
        weights_applied=fusion_result["weights"],
        cold_start_flag=fusion_result["cold_start"],
    )
```

- [ ] **Step 4: Update the schemas**

In `app/schemas/__init__.py`, replace `BookConsultation` and `ConsultationOut`:

```python
class BookConsultation(BaseModel):
    doctor_id: int
    slot_id: int
    symptom_input: Optional[str] = None
    recommendation_rank: Optional[int] = None
    recommendation_id: Optional[int] = None


class ConsultationOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    scheduled_datetime: datetime
    status: str
    symptom_input: Optional[str]
    created_at: datetime
    # ── lifecycle (SP3) ──
    severity: Optional[str] = None
    mode: str = "in_person"
    respond_by: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    pay_by: Optional[datetime] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    decline_reason: Optional[str] = None
    duration_minutes: Optional[int] = None

    class Config:
        from_attributes = True
```

- [ ] **Step 5: Rewrite `book_consultation`**

In `app/routers/consultations.py`, replace the whole `book_consultation` function. Add the imports it needs at the top of the file:

```python
from app.models import (
    Consultation, ConsultationStatus, AvailabilitySlot, Patient, Doctor,
    Feedback, Payment, PaymentStatus, Recommendation, SlotMode,
)
from app.services.appointments import (
    compute_pay_by, compute_respond_by, expire_stale, recompute_doctor_stats,
)
```

Then:

```python
# A consultation in one of these states is still holding its slot.
PENDING_STATES = (ConsultationStatus.requested, ConsultationStatus.accepted)


@router.post("/", response_model=ConsultationOut, status_code=201)
def request_consultation(
    payload: BookConsultation,
    patient: Patient = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """Request an appointment. The doctor must accept before anything is paid."""
    expire_stale(db)

    # One pending request at a time — the patient is ill and waiting on someone.
    existing = db.query(Consultation).filter(
        Consultation.patient_id == patient.id,
        Consultation.status.in_(PENDING_STATES),
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You already have a pending request. Withdraw it before requesting another doctor.",
        )

    # Lock the slot row so two patients cannot claim it at once.
    slot = db.query(AvailabilitySlot).filter(
        AvailabilitySlot.id == payload.slot_id,
        AvailabilitySlot.doctor_id == payload.doctor_id,
    ).with_for_update().first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="That slot was just taken. Please pick another.")
    if slot.start_time <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="That slot has already started.")

    # Severity comes from the stored recommendation, not the client — it decides
    # how fast the doctor has to answer, so it must not be self-reported here.
    severity = None
    recommendation_id = None
    if payload.recommendation_id:
        rec = db.query(Recommendation).filter(
            Recommendation.id == payload.recommendation_id,
            Recommendation.patient_id == patient.id,
        ).first()
        if rec:
            severity = rec.severity
            recommendation_id = rec.id

    requested_at = datetime.utcnow()
    consult = Consultation(
        patient_id=patient.id,
        doctor_id=payload.doctor_id,
        slot_id=slot.id,
        scheduled_datetime=slot.start_time,
        status=ConsultationStatus.requested,
        symptom_input=payload.symptom_input,
        recommendation_rank=payload.recommendation_rank,
        recommendation_id=recommendation_id,
        severity=severity,
        mode=slot.mode,
        requested_at=requested_at,
        respond_by=compute_respond_by(requested_at, severity, slot.start_time),
    )
    slot.is_booked = True
    db.add(consult); db.commit(); db.refresh(consult)
    return consult
```

Note: `with_for_update()` is a no-op on SQLite (the test harness) and a real row lock on Postgres. That is exactly the behaviour we want in both places.

- [ ] **Step 6: Run the tests and watch them pass**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -v
```

Expected: 17 passed.

- [ ] **Step 7: Confirm nothing regressed**

```bash
venv/bin/python -m pytest -q
```

Expected: 38 passed.

- [ ] **Step 8: Commit**

```bash
git add app/schemas/__init__.py app/routers/consultations.py \
        app/services/recommendation_service.py tests/test_appointment_lifecycle.py
git commit -m "feat(appointments): booking creates a request the doctor must accept"
```

---

## Task 5: Accept, decline, withdraw

**Files:**
- Modify: `app/schemas/__init__.py`, `app/routers/consultations.py`
- Test: `tests/test_appointment_lifecycle.py`

**Interfaces:**
- Consumes: `compute_pay_by`, `expire_stale`, `recompute_doctor_stats` (Task 3); `PENDING_STATES` (Task 4).
- Produces: `POST /api/consultations/{id}/accept`, `/decline`, `/withdraw`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_appointment_lifecycle.py`:

```python
def _requested(db, patient, doctor, slot, severity="mild", mode=None):
    """A live request holding its slot."""
    from app.models import SlotMode
    slot.is_booked = True
    now = datetime.utcnow()
    c = Consultation(
        patient_id=patient.id, doctor_id=doctor.id, slot_id=slot.id,
        scheduled_datetime=slot.start_time, status=ConsultationStatus.requested,
        symptom_input="chest tightness", severity=severity,
        mode=mode or slot.mode, requested_at=now,
        respond_by=compute_respond_by(now, severity, slot.start_time),
    )
    db.add(c); db.commit(); db.refresh(c)
    return c


def test_accept_snapshots_the_clinic_address_and_opens_the_payment_window(
    client, db, patient, clinic_doctor, clinic_doctor_auth, slot
):
    c = _requested(db, patient, clinic_doctor, slot)

    res = client.post(f"/api/consultations/{c.id}/accept", headers=clinic_doctor_auth)
    assert res.status_code == 200

    db.refresh(c)
    assert c.status == ConsultationStatus.accepted
    assert c.location == "12 Awolowo Road, Ikoyi, Lagos"
    assert c.meeting_link is None            # in-person slot
    assert c.responded_at is not None
    assert c.pay_by is not None
    db.refresh(slot)
    assert slot.is_booked is True            # still held — now for payment


def test_accept_snapshots_the_meeting_link_for_a_video_slot(
    client, db, patient, clinic_doctor, clinic_doctor_auth, slot
):
    from app.models import SlotMode
    slot.mode = SlotMode.video
    db.commit()
    c = _requested(db, patient, clinic_doctor, slot, mode=SlotMode.video)

    res = client.post(f"/api/consultations/{c.id}/accept", headers=clinic_doctor_auth)
    assert res.status_code == 200

    db.refresh(c)
    assert c.meeting_link == "https://meet.example.com/eze"
    assert c.location is None


def test_accept_is_blocked_when_the_doctor_has_no_clinic_address(
    client, db, patient, doctor, doctor_auth
):
    from app.models import AvailabilitySlot
    start = datetime.utcnow() + timedelta(days=3)
    s = AvailabilitySlot(doctor_id=doctor.id, start_time=start,
                         end_time=start + timedelta(minutes=30))
    db.add(s); db.commit(); db.refresh(s)
    c = _requested(db, patient, doctor, s)     # `doctor` fixture has no clinic_address

    res = client.post(f"/api/consultations/{c.id}/accept", headers=doctor_auth)
    assert res.status_code == 400
    assert "clinic address" in res.json()["detail"].lower()

    db.refresh(c)
    assert c.status == ConsultationStatus.requested   # unchanged


def test_accept_rejects_an_already_expired_request(
    client, db, patient, clinic_doctor, clinic_doctor_auth, slot
):
    c = _requested(db, patient, clinic_doctor, slot)
    c.respond_by = datetime.utcnow() - timedelta(minutes=1)   # lapsed
    db.commit()

    res = client.post(f"/api/consultations/{c.id}/accept", headers=clinic_doctor_auth)
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()

    db.refresh(c); db.refresh(slot)
    assert c.status == ConsultationStatus.expired
    assert slot.is_booked is False


def test_decline_frees_the_slot(client, db, patient, clinic_doctor, clinic_doctor_auth, slot):
    c = _requested(db, patient, clinic_doctor, slot)

    res = client.post(f"/api/consultations/{c.id}/decline", headers=clinic_doctor_auth,
                      json={"decline_reason": "Fully booked that morning"})
    assert res.status_code == 200

    db.refresh(c); db.refresh(slot)
    assert c.status == ConsultationStatus.declined
    assert c.decline_reason == "Fully booked that morning"
    assert c.responded_at is not None
    assert slot.is_booked is False


def test_a_doctor_cannot_accept_someone_elses_request(
    client, db, patient, clinic_doctor, doctor_auth, slot
):
    c = _requested(db, patient, clinic_doctor, slot)
    res = client.post(f"/api/consultations/{c.id}/accept", headers=doctor_auth)
    assert res.status_code == 403


def test_withdraw_frees_the_slot_and_needs_no_refund(
    client, db, patient, patient_auth, clinic_doctor, slot
):
    c = _requested(db, patient, clinic_doctor, slot)

    res = client.post(f"/api/consultations/{c.id}/withdraw", headers=patient_auth)
    assert res.status_code == 200

    db.refresh(c); db.refresh(slot)
    assert c.status == ConsultationStatus.expired
    assert slot.is_booked is False


def test_withdraw_only_applies_to_a_pending_request(
    client, db, patient, patient_auth, clinic_doctor, slot
):
    c = _requested(db, patient, clinic_doctor, slot)
    c.status = ConsultationStatus.scheduled
    db.commit()

    res = client.post(f"/api/consultations/{c.id}/withdraw", headers=patient_auth)
    assert res.status_code == 400
```

- [ ] **Step 2: Run them and watch them fail**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -k "accept or decline or withdraw" -v
```

Expected: 404s — the routes do not exist.

- [ ] **Step 3: Add the schemas**

In `app/schemas/__init__.py`, after `UpdateConsultation`:

```python
class DeclineConsultation(BaseModel):
    decline_reason: Optional[str] = None
```

- [ ] **Step 4: Implement the three endpoints**

In `app/routers/consultations.py`, add after `get_consultation`. Import `DeclineConsultation` from `app.schemas`.

```python
@router.post("/{consult_id}/accept", response_model=ConsultationOut)
def accept_consultation(
    consult_id: int,
    doctor: Doctor = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    """Doctor accepts a request. Snapshots where the patient should go, then opens
    the payment window. Nothing has been paid up to this point."""
    expire_stale(db)   # a request that just lapsed must not be revivable

    c = db.query(Consultation).filter(Consultation.id == consult_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if c.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Not your consultation")
    if c.status == ConsultationStatus.expired:
        raise HTTPException(status_code=400, detail="This request has expired.")
    if c.status != ConsultationStatus.requested:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot accept a {c.status.value} consultation",
        )

    # Snapshot the location onto the consultation. If the doctor moves clinic next
    # year, past appointments must still show where the patient actually went.
    if c.mode == SlotMode.in_person:
        if not doctor.clinic_address:
            raise HTTPException(
                status_code=400,
                detail="Set your clinic address on your profile before accepting an in-person request.",
            )
        c.location = doctor.clinic_address
    else:
        if not doctor.default_meeting_link:
            raise HTTPException(
                status_code=400,
                detail="Set your meeting link on your profile before accepting a video request.",
            )
        c.meeting_link = doctor.default_meeting_link

    now = datetime.utcnow()
    c.status = ConsultationStatus.accepted
    c.responded_at = now
    c.pay_by = compute_pay_by(now, c.scheduled_datetime)
    db.commit(); db.refresh(c)

    recompute_doctor_stats(db, doctor)
    return c


@router.post("/{consult_id}/decline", response_model=ConsultationOut)
def decline_consultation(
    consult_id: int,
    payload: DeclineConsultation,
    doctor: Doctor = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    """Doctor declines. The slot is freed immediately and the patient is offered
    the next-best doctor from the recommendation that sent them here."""
    expire_stale(db)

    c = db.query(Consultation).filter(Consultation.id == consult_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if c.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Not your consultation")
    if c.status != ConsultationStatus.requested:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot decline a {c.status.value} consultation",
        )

    c.status = ConsultationStatus.declined
    c.responded_at = datetime.utcnow()
    c.decline_reason = payload.decline_reason
    _release_slot(db, c)
    db.commit(); db.refresh(c)

    recompute_doctor_stats(db, doctor)
    return c


@router.post("/{consult_id}/withdraw", response_model=ConsultationOut)
def withdraw_request(
    consult_id: int,
    patient: Patient = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """Patient pulls out while still waiting. Nothing was paid, so there is no
    refund path — the slot simply goes back on the market."""
    c = db.query(Consultation).filter(Consultation.id == consult_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if c.patient_id != patient.id:
        raise HTTPException(status_code=403, detail="Not your consultation")
    if c.status != ConsultationStatus.requested:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot withdraw a {c.status.value} consultation",
        )

    c.status = ConsultationStatus.expired
    _release_slot(db, c)
    db.commit(); db.refresh(c)
    return c
```

Add the shared slot-release helper near the top of the router, below `PENDING_STATES`:

```python
def _release_slot(db: Session, consult: Consultation) -> None:
    if not consult.slot_id:
        return
    slot = db.query(AvailabilitySlot).filter(
        AvailabilitySlot.id == consult.slot_id
    ).first()
    if slot:
        slot.is_booked = False
```

- [ ] **Step 5: Run the tests and watch them pass**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -v
```

Expected: 25 passed.

- [ ] **Step 6: Confirm nothing regressed**

```bash
venv/bin/python -m pytest -q
```

Expected: 46 passed.

- [ ] **Step 7: Commit**

```bash
git add app/schemas/__init__.py app/routers/consultations.py tests/test_appointment_lifecycle.py
git commit -m "feat(appointments): doctor accept/decline and patient withdraw"
```

---

## Task 6: Payment becomes the gate

**Files:**
- Modify: `app/routers/payments.py`
- Test: `tests/test_appointment_lifecycle.py`

**Interfaces:**
- Consumes: `expire_stale` (Task 3); the `accepted` status (Task 5).
- Produces: `initialize` rejects non-`accepted` consultations; `verify`/`webhook` promote `accepted → scheduled`; a payment that lands after `pay_by` is refunded automatically.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_appointment_lifecycle.py`:

```python
from unittest.mock import patch as mock_patch

from app.models import Payment, PaymentStatus


def _accepted(db, patient, doctor, slot):
    c = _requested(db, patient, doctor, slot)
    now = datetime.utcnow()
    c.status = ConsultationStatus.accepted
    c.responded_at = now
    c.pay_by = compute_pay_by(now, c.scheduled_datetime)
    c.location = doctor.clinic_address
    db.commit(); db.refresh(c)
    return c


def test_initialize_is_rejected_before_the_doctor_accepts(
    client, db, patient, patient_auth, clinic_doctor, slot
):
    c = _requested(db, patient, clinic_doctor, slot)   # still `requested`

    res = client.post("/api/payments/initialize", headers=patient_auth,
                      json={"consultation_id": c.id})
    assert res.status_code == 400
    assert "accept" in res.json()["detail"].lower()


def test_verify_promotes_an_accepted_consultation_to_scheduled(
    client, db, patient, patient_auth, clinic_doctor, slot
):
    c = _accepted(db, patient, clinic_doctor, slot)
    pay = Payment(consultation_id=c.id, patient_id=patient.id, doctor_id=clinic_doctor.id,
                  amount=15000.0, currency="NGN", status=PaymentStatus.pending,
                  paystack_reference="ref-ok")
    db.add(pay); db.commit()

    with mock_patch("app.routers.payments.paystack.verify",
                    return_value={"status": "success", "amount": 1500000}):
        res = client.get("/api/payments/verify/ref-ok", headers=patient_auth)

    assert res.status_code == 200
    assert res.json()["status"] == "success"

    db.refresh(c); db.refresh(pay)
    assert pay.status == PaymentStatus.success
    assert c.status == ConsultationStatus.scheduled     # the gate opened


def test_a_payment_that_lands_after_the_window_is_refunded(
    client, db, patient, patient_auth, clinic_doctor, slot
):
    """The patient was on Paystack's page when pay_by lapsed. The slot has already
    been released — so we must not keep their money."""
    c = _accepted(db, patient, clinic_doctor, slot)
    c.status = ConsultationStatus.expired       # expire_stale already released it
    db.commit()

    pay = Payment(consultation_id=c.id, patient_id=patient.id, doctor_id=clinic_doctor.id,
                  amount=15000.0, currency="NGN", status=PaymentStatus.pending,
                  paystack_reference="ref-late")
    db.add(pay); db.commit()

    with mock_patch("app.routers.payments.paystack.verify",
                    return_value={"status": "success", "amount": 1500000}), \
         mock_patch("app.routers.payments.paystack.refund") as refund:
        res = client.get("/api/payments/verify/ref-late", headers=patient_auth)

    refund.assert_called_once_with("ref-late")
    assert res.status_code == 200
    assert res.json()["status"] == "refunded"

    db.refresh(pay); db.refresh(c)
    assert pay.status == PaymentStatus.refunded
    assert c.status == ConsultationStatus.expired      # stays expired
```

- [ ] **Step 2: Run them and watch them fail**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -k "initialize or verify or refunded" -v
```

Expected: `initialize` returns 200 instead of 400; `verify` leaves the consultation `accepted`.

- [ ] **Step 3: Gate `initialize`**

In `app/routers/payments.py`, import the lifecycle bits at the top:

```python
from app.models import Payment, PaymentStatus, Consultation, ConsultationStatus, Doctor, Patient
from app.services.appointments import expire_stale
```

Then in `initialize_payment`, immediately after the consultation is fetched and before the `existing` payment lookup:

```python
    expire_stale(db)
    db.refresh(consult)

    if consult.status != ConsultationStatus.accepted:
        raise HTTPException(
            status_code=400,
            detail="This consultation is not awaiting payment. The doctor must accept it first.",
        )
```

- [ ] **Step 4: Promote on success, refund a late payment**

In `app/routers/payments.py`, replace `_mark_success` and `verify_payment`:

```python
def _mark_success(db: Session, pay: Payment) -> None:
    """Credit the payment and promote the consultation. Idempotent."""
    if pay.status == PaymentStatus.success:
        return
    pay.status = PaymentStatus.success
    pay.paid_at = datetime.utcnow()

    consult = db.query(Consultation).filter(
        Consultation.id == pay.consultation_id
    ).first()
    if consult and consult.status == ConsultationStatus.accepted:
        consult.status = ConsultationStatus.scheduled   # paying is the gate
    db.commit()


def _refund_late_payment(db: Session, pay: Payment) -> None:
    """The payment window lapsed while the patient was on Paystack's page, so the
    slot has already gone back on the market. Never keep the money."""
    try:
        paystack.refund(pay.paystack_reference)
    except Exception as exc:
        # Do not silently swallow this — someone has paid for nothing.
        logger.error(
            "LATE PAYMENT REFUND FAILED — manual reconciliation needed. "
            "reference=%s amount=%s error=%s",
            pay.paystack_reference, pay.amount, exc,
        )
        raise HTTPException(
            status_code=502,
            detail="Your payment arrived after the slot was released and the automatic "
                   "refund failed. Our team has been alerted and will refund you.",
        )
    pay.status = PaymentStatus.refunded
    db.commit()


@router.get("/verify/{reference}", response_model=PaymentOut)
def verify_payment(
    reference: str,
    patient: Patient = Depends(require_patient),
    db: Session = Depends(get_db),
):
    expire_stale(db)

    pay = db.query(Payment).filter(
        Payment.paystack_reference == reference,
        Payment.patient_id == patient.id,
    ).first()
    if not pay:
        raise HTTPException(status_code=404, detail="Payment not found")

    try:
        data = paystack.verify(reference)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Payment provider error: {exc}")

    expected_amount = int(round(pay.amount * 100))
    paid = data.get("status") == "success" and data.get("amount") == expected_amount

    if paid:
        consult = db.query(Consultation).filter(
            Consultation.id == pay.consultation_id
        ).first()
        if consult and consult.status == ConsultationStatus.accepted:
            _mark_success(db, pay)
        else:
            # Too late — the slot is gone. Give the money back.
            _refund_late_payment(db, pay)
    elif data.get("status") == "success":
        # Amount mismatch — never credit on possible tampering.
        pay.status = PaymentStatus.failed
        db.commit()
    elif data.get("status") in ("failed", "abandoned"):
        pay.status = PaymentStatus.failed
        db.commit()

    return PaymentOut(status=pay.status.value, amount=pay.amount,
                      currency=pay.currency, reference=pay.paystack_reference,
                      paid_at=pay.paid_at)
```

Add a logger at the top of the file, below the imports:

```python
import logging
logger = logging.getLogger(__name__)
```

The webhook already routes through `_mark_success`, so it inherits the promotion for free. Guard it against the same late case — in `paystack_webhook`, replace the `if pay:` block:

```python
        if pay:
            expected_amount = int(round(pay.amount * 100))
            if data.get("status") == "success" and data.get("amount") == expected_amount:
                consult = db.query(Consultation).filter(
                    Consultation.id == pay.consultation_id
                ).first()
                if consult and consult.status == ConsultationStatus.accepted:
                    _mark_success(db, pay)
                elif pay.status != PaymentStatus.refunded:
                    _refund_late_payment(db, pay)
```

- [ ] **Step 5: Run the tests and watch them pass**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -v
```

Expected: 28 passed.

- [ ] **Step 6: Confirm nothing regressed — especially SP1's payment tests**

```bash
venv/bin/python -m pytest -q
```

Expected: 49 passed. If `tests/test_payments_router.py` fails, it is because its fixtures create consultations without a `status` — set them to `ConsultationStatus.accepted` so they represent a consultation that is legitimately awaiting payment.

- [ ] **Step 7: Commit**

```bash
git add app/routers/payments.py tests/test_appointment_lifecycle.py tests/test_payments_router.py
git commit -m "feat(payments): paying promotes accepted → scheduled; refund late payments"
```

---

## Task 7: Completion, no-show, and cancel guards

**Files:**
- Modify: `app/routers/consultations.py`
- Test: `tests/test_appointment_lifecycle.py`

**Interfaces:**
- Consumes: statuses from Tasks 4–6.
- Produces: `PUT /api/consultations/{id}` auto-fills `duration_minutes` from the slot on completion; cancel behaves correctly in every new state.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_appointment_lifecycle.py`:

```python
def _scheduled(db, patient, doctor, slot, in_past=False):
    c = _accepted(db, patient, doctor, slot)
    c.status = ConsultationStatus.scheduled
    if in_past:
        c.scheduled_datetime = datetime.utcnow() - timedelta(hours=1)
    db.commit(); db.refresh(c)
    return c


def test_completing_fills_duration_from_the_slot(
    client, db, patient, clinic_doctor, clinic_doctor_auth, slot
):
    c = _scheduled(db, patient, clinic_doctor, slot, in_past=True)

    res = client.put(f"/api/consultations/{c.id}", headers=clinic_doctor_auth,
                     json={"status": "completed"})
    assert res.status_code == 200

    db.refresh(c)
    assert c.status == ConsultationStatus.completed
    assert c.duration_minutes == 30       # slot is 10:00–10:30; nobody typed this


def test_a_consultation_cannot_be_completed_before_it_starts(
    client, db, patient, clinic_doctor, clinic_doctor_auth, slot
):
    c = _scheduled(db, patient, clinic_doctor, slot)   # slot is 3 days away

    res = client.put(f"/api/consultations/{c.id}", headers=clinic_doctor_auth,
                     json={"status": "completed"})
    assert res.status_code == 400
    assert "started" in res.json()["detail"].lower()


def test_marking_no_show(client, db, patient, clinic_doctor, clinic_doctor_auth, slot):
    c = _scheduled(db, patient, clinic_doctor, slot, in_past=True)

    res = client.put(f"/api/consultations/{c.id}", headers=clinic_doctor_auth,
                     json={"status": "no_show"})
    assert res.status_code == 200

    db.refresh(c)
    assert c.status == ConsultationStatus.no_show
    assert c.duration_minutes is None     # it never happened


def test_cancelling_an_unpaid_acceptance_frees_the_slot_without_a_refund(
    client, db, patient, patient_auth, clinic_doctor, slot
):
    c = _accepted(db, patient, clinic_doctor, slot)   # accepted, never paid

    with mock_patch("app.routers.consultations.paystack.refund") as refund:
        res = client.post(f"/api/consultations/{c.id}/cancel", headers=patient_auth)

    assert res.status_code == 200
    assert res.json()["refunded"] is False
    refund.assert_not_called()

    db.refresh(c); db.refresh(slot)
    assert c.status == ConsultationStatus.cancelled
    assert slot.is_booked is False
```

- [ ] **Step 2: Run them and watch them fail**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -k "duration or no_show or started or unpaid" -v
```

Expected: `duration_minutes` is `None`; completion before the start time is allowed.

- [ ] **Step 3: Rewrite `update_consultation`**

In `app/routers/consultations.py`, replace `update_consultation`:

```python
@router.put("/{consult_id}")
def update_consultation(
    consult_id: int,
    payload: UpdateConsultation,
    doctor: Doctor = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    """The doctor closes out a visit: it happened, or the patient never showed."""
    c = db.query(Consultation).filter(
        Consultation.id == consult_id,
        Consultation.doctor_id == doctor.id,
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")

    if payload.status == "completed":
        if c.status != ConsultationStatus.scheduled:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot complete a {c.status.value} consultation",
            )
        if c.scheduled_datetime > datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail="This consultation has not started yet.",
            )
        c.status = ConsultationStatus.completed
        doctor.total_consultations += 1

        # The appointment's real duration is the slot the patient booked. It has
        # been sitting in the database unused since day one — nobody types it in.
        if c.slot_id:
            slot = db.query(AvailabilitySlot).filter(
                AvailabilitySlot.id == c.slot_id
            ).first()
            if slot:
                c.duration_minutes = int(
                    (slot.end_time - slot.start_time).total_seconds() // 60
                )

    elif payload.status == "no_show":
        if c.status != ConsultationStatus.scheduled:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot mark a {c.status.value} consultation as a no-show",
            )
        c.status = ConsultationStatus.no_show

    elif payload.status:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported status transition: {payload.status}",
        )

    if payload.clinical_notes:
        c.clinical_notes = payload.clinical_notes
    if payload.duration_minutes:
        c.duration_minutes = payload.duration_minutes

    db.commit()
    return {"detail": "Updated"}
```

- [ ] **Step 4: Widen the cancel guard**

In `app/routers/consultations.py`, in `cancel_consultation`, replace the status guard (currently `if c.status != ConsultationStatus.scheduled`) with:

```python
    CANCELLABLE = (
        ConsultationStatus.requested,
        ConsultationStatus.accepted,
        ConsultationStatus.scheduled,
    )
    if c.status not in CANCELLABLE:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel a {c.status.value} consultation",
        )
```

The rest of the function needs no change: the refund block already looks for a **successful** payment, and only a `scheduled` consultation can have one — an `accepted` or `requested` one has never been paid, so `payment` is `None`, `refunded` stays `False`, and no Paystack call is made. The slot-freeing code at the bottom already runs for every state.

- [ ] **Step 5: Run the tests and watch them pass**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -v
```

Expected: 32 passed.

- [ ] **Step 6: Confirm SP2's cancel-and-refund still works**

```bash
venv/bin/python -m pytest tests/test_cancel_consultation.py -v
```

Expected: all pass. If a test there builds a consultation with the default status, set it explicitly to `ConsultationStatus.scheduled`.

```bash
venv/bin/python -m pytest -q
```

Expected: 53 passed.

- [ ] **Step 7: Commit**

```bash
git add app/routers/consultations.py tests/test_appointment_lifecycle.py tests/test_cancel_consultation.py
git commit -m "feat(appointments): completion fills duration from the slot; cancel guards for new states"
```

---

## Task 8: Next-best doctor

**Files:**
- Modify: `app/schemas/__init__.py`, `app/routers/consultations.py`
- Test: `tests/test_appointment_lifecycle.py`

**Interfaces:**
- Consumes: `Consultation.recommendation_id` (Task 1), the `declined`/`expired` statuses (Task 5).
- Produces: `GET /api/consultations/{id}/next-best` → `NextBestOut | null`.

This is the payoff of the whole design: a rejection becomes the system visibly working *for* the patient. The ranked list was already persisted on the `recommendations` row when we recommended the first doctor — we never re-score anything, we just walk to the next name.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_appointment_lifecycle.py`:

```python
from app.models import DoctorSpecialization, Specialization, VerificationStatus


def _verified(db, doctor):
    doctor.verification_status = VerificationStatus.verified
    doctor.is_available = True
    doctor.is_active = True
    db.commit()
    return doctor


def test_next_best_returns_the_runner_up_with_an_open_slot(
    client, db, patient, patient_auth, clinic_doctor, slot
):
    from app.models import AvailabilitySlot
    runner_up = Doctor(full_name="Dr Bello Musa", email="musa@test.com",
                       hashed_password="x", consultation_fee=12000.0,
                       average_rating=4.8, years_experience=14,
                       clinic_address="9 Bode Thomas, Surulere, Lagos")
    db.add(runner_up); db.commit(); db.refresh(runner_up)
    _verified(db, runner_up)

    start = datetime.utcnow() + timedelta(days=2)
    open_slot = AvailabilitySlot(doctor_id=runner_up.id, start_time=start,
                                 end_time=start + timedelta(minutes=30))
    db.add(open_slot); db.commit(); db.refresh(open_slot)

    rec = Recommendation(
        patient_id=patient.id, symptom_input="chest tightness", severity="severe",
        recommended_doctors=[
            {"doctor_id": clinic_doctor.id, "score": 0.97},
            {"doctor_id": runner_up.id, "score": 0.94},
        ],
    )
    db.add(rec); db.commit(); db.refresh(rec)

    c = _requested(db, patient, clinic_doctor, slot)
    c.recommendation_id = rec.id
    c.status = ConsultationStatus.declined
    db.commit()

    res = client.get(f"/api/consultations/{c.id}/next-best", headers=patient_auth)
    assert res.status_code == 200

    body = res.json()
    assert body["doctor_id"] == runner_up.id
    assert body["doctor_name"] == "Dr Bello Musa"
    assert body["rank"] == 2
    assert body["score"] == 0.94
    assert body["next_slot_id"] == open_slot.id
    assert body["recommendation_id"] == rec.id


def test_next_best_skips_a_doctor_with_no_open_slots(
    client, db, patient, patient_auth, clinic_doctor, slot
):
    slotless = Doctor(full_name="Dr No Slots", email="noslots@test.com",
                      hashed_password="x", consultation_fee=9000.0)
    db.add(slotless); db.commit(); db.refresh(slotless)
    _verified(db, slotless)

    rec = Recommendation(
        patient_id=patient.id, symptom_input="chest tightness",
        recommended_doctors=[
            {"doctor_id": clinic_doctor.id, "score": 0.97},
            {"doctor_id": slotless.id, "score": 0.94},
        ],
    )
    db.add(rec); db.commit(); db.refresh(rec)

    c = _requested(db, patient, clinic_doctor, slot)
    c.recommendation_id = rec.id
    c.status = ConsultationStatus.declined
    db.commit()

    res = client.get(f"/api/consultations/{c.id}/next-best", headers=patient_auth)
    assert res.status_code == 200
    assert res.json() is None      # nobody left to offer


def test_next_best_is_null_when_there_was_no_recommendation(
    client, db, patient, patient_auth, clinic_doctor, slot
):
    c = _requested(db, patient, clinic_doctor, slot)
    c.status = ConsultationStatus.declined
    db.commit()

    res = client.get(f"/api/consultations/{c.id}/next-best", headers=patient_auth)
    assert res.status_code == 200
    assert res.json() is None
```

- [ ] **Step 2: Run them and watch them fail**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -k next_best -v
```

Expected: 404 — the route does not exist.

- [ ] **Step 3: Add the schema**

In `app/schemas/__init__.py`, after `ConsultationOut`:

```python
class NextBestOut(BaseModel):
    """The runner-up from the recommendation that sent the patient to the doctor
    who just declined. One tap re-requests them — no re-scoring, no re-intake."""
    recommendation_id: int
    doctor_id: int
    doctor_name: str
    specialization: str
    rank: int                      # 1-based position in the original ranked list
    score: float
    average_rating: float
    years_experience: int
    consultation_fee: float
    avg_response_minutes: Optional[float] = None
    acceptance_rate: Optional[float] = None
    next_slot_id: int
    next_slot_start: datetime
    next_slot_mode: str
    symptom_input: Optional[str] = None
```

- [ ] **Step 4: Implement the endpoint**

In `app/routers/consultations.py`, add at the end. Import `NextBestOut` and `Specialization` from their modules.

```python
@router.get("/{consult_id}/next-best", response_model=Optional[NextBestOut])
def next_best_doctor(
    consult_id: int,
    patient: Patient = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """After a decline or expiry, offer the next doctor the model already ranked.

    The ranked list was persisted on the `recommendations` row when we made the
    original recommendation, so there is nothing to re-score — we walk past the
    doctor who said no and return the next one who is verified, available, and
    actually has an open slot.
    """
    expire_stale(db)

    c = db.query(Consultation).filter(Consultation.id == consult_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if c.patient_id != patient.id:
        raise HTTPException(status_code=403, detail="Not your consultation")
    if not c.recommendation_id:
        return None      # they browsed to this doctor; there is no ranked list

    rec = db.query(Recommendation).filter(
        Recommendation.id == c.recommendation_id
    ).first()
    if not rec or not rec.recommended_doctors:
        return None

    ranked = sorted(rec.recommended_doctors, key=lambda r: r.get("score", 0), reverse=True)
    now = datetime.utcnow()

    for index, entry in enumerate(ranked, start=1):
        doctor_id = entry.get("doctor_id")
        if doctor_id == c.doctor_id:
            continue    # the one who just said no

        doctor = db.query(Doctor).filter(
            Doctor.id == doctor_id,
            Doctor.is_available == True,   # noqa: E712
            Doctor.is_active == True,      # noqa: E712
            Doctor.verification_status == VerificationStatus.verified,
        ).first()
        if not doctor:
            continue

        next_slot = db.query(AvailabilitySlot).filter(
            AvailabilitySlot.doctor_id == doctor.id,
            AvailabilitySlot.is_booked == False,   # noqa: E712
            AvailabilitySlot.start_time > now,
        ).order_by(AvailabilitySlot.start_time.asc()).first()
        if not next_slot:
            continue    # ranked highly, but nothing to offer

        specialization = (
            doctor.specializations[0].specialization.name
            if doctor.specializations else "General Practice"
        )
        return NextBestOut(
            recommendation_id=rec.id,
            doctor_id=doctor.id,
            doctor_name=doctor.full_name,
            specialization=specialization,
            rank=index,
            score=entry.get("score", 0.0),
            average_rating=doctor.average_rating,
            years_experience=doctor.years_experience,
            consultation_fee=doctor.consultation_fee,
            avg_response_minutes=doctor.avg_response_minutes,
            acceptance_rate=doctor.recommendation_acceptance_rate,
            next_slot_id=next_slot.id,
            next_slot_start=next_slot.start_time,
            next_slot_mode=next_slot.mode.value,
            symptom_input=c.symptom_input,
        )

    return None    # the list is exhausted
```

Add these imports at the top of the router:

```python
from typing import Optional
from app.models import VerificationStatus
from app.schemas import NextBestOut
```

- [ ] **Step 5: Run the tests and watch them pass**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -v
```

Expected: 35 passed.

- [ ] **Step 6: Confirm nothing regressed**

```bash
venv/bin/python -m pytest -q
```

Expected: 56 passed.

- [ ] **Step 7: Commit**

```bash
git add app/schemas/__init__.py app/routers/consultations.py tests/test_appointment_lifecycle.py
git commit -m "feat(appointments): next-best doctor from the stored recommendation"
```

---

## Task 9: Doctor profile, slot mode, request inbox

**Files:**
- Modify: `app/schemas/__init__.py`, `app/routers/doctors.py`, `app/routers/patients.py`
- Test: `tests/test_appointment_lifecycle.py`

**Interfaces:**
- Consumes: `expire_stale` (Task 3); clinic columns (Task 1).
- Produces: `PUT /api/doctors/me`, `GET /api/doctors/me/requests`; slot `mode` on create/read; `avg_response_minutes` + `recommendation_acceptance_rate` on the public doctor payloads.

`PUT /api/doctors/me` **does not exist today** — a doctor currently cannot edit anything about themselves, which means they can never set the clinic address that Task 5 requires before accepting an in-person request.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_appointment_lifecycle.py`:

```python
def test_doctor_can_update_their_clinic(client, db, clinic_doctor, clinic_doctor_auth):
    res = client.put("/api/doctors/me", headers=clinic_doctor_auth, json={
        "clinic_name": "Eze Cardiology",
        "clinic_address": "3 Kingsway Road, Ikoyi, Lagos",
        "consultation_fee": 20000.0,
    })
    assert res.status_code == 200
    assert res.json()["clinic_address"] == "3 Kingsway Road, Ikoyi, Lagos"

    db.refresh(clinic_doctor)
    assert clinic_doctor.clinic_name == "Eze Cardiology"
    assert clinic_doctor.consultation_fee == 20000.0


def test_creating_an_in_person_slot_requires_a_clinic_address(client, doctor_auth):
    start = (datetime.utcnow() + timedelta(days=2)).isoformat()
    end = (datetime.utcnow() + timedelta(days=2, minutes=30)).isoformat()

    res = client.post("/api/doctors/availability", headers=doctor_auth, json={
        "start_time": start, "end_time": end, "mode": "in_person",
    })
    assert res.status_code == 400
    assert "clinic address" in res.json()["detail"].lower()


def test_creating_a_video_slot_requires_a_meeting_link(client, db, doctor, doctor_auth):
    doctor.clinic_address = "somewhere"
    db.commit()
    start = (datetime.utcnow() + timedelta(days=2)).isoformat()
    end = (datetime.utcnow() + timedelta(days=2, minutes=30)).isoformat()

    res = client.post("/api/doctors/availability", headers=doctor_auth, json={
        "start_time": start, "end_time": end, "mode": "video",
    })
    assert res.status_code == 400
    assert "meeting link" in res.json()["detail"].lower()


def test_clinic_doctor_can_create_both_slot_modes(client, clinic_doctor_auth):
    start = (datetime.utcnow() + timedelta(days=2)).isoformat()
    end = (datetime.utcnow() + timedelta(days=2, minutes=30)).isoformat()

    res = client.post("/api/doctors/availability", headers=clinic_doctor_auth, json={
        "start_time": start, "end_time": end, "mode": "video",
    })
    assert res.status_code == 201
    assert res.json()["mode"] == "video"


def test_request_inbox_sorts_severe_first(
    client, db, patient, clinic_doctor, clinic_doctor_auth, slot
):
    from app.models import AvailabilitySlot, Patient
    mild = _requested(db, patient, clinic_doctor, slot, severity="mild")

    other = Patient(full_name="Urgent Person", email="urgent@test.com", hashed_password="x")
    db.add(other); db.commit(); db.refresh(other)
    start = datetime.utcnow() + timedelta(days=4)
    slot2 = AvailabilitySlot(doctor_id=clinic_doctor.id, start_time=start,
                             end_time=start + timedelta(minutes=30))
    db.add(slot2); db.commit(); db.refresh(slot2)
    severe = _requested(db, other, clinic_doctor, slot2, severity="severe")

    res = client.get("/api/doctors/me/requests", headers=clinic_doctor_auth)
    assert res.status_code == 200

    body = res.json()
    assert [r["id"] for r in body] == [severe.id, mild.id]   # the one who can't breathe first
    assert body[0]["severity"] == "severe"
    assert body[0]["respond_by"] is not None


def test_public_doctor_payload_exposes_response_stats(client, db, clinic_doctor):
    clinic_doctor.verification_status = VerificationStatus.verified
    clinic_doctor.avg_response_minutes = 180.0
    clinic_doctor.recommendation_acceptance_rate = 0.92
    db.commit()

    res = client.get(f"/api/doctors/{clinic_doctor.id}")
    assert res.status_code == 200
    assert res.json()["avg_response_minutes"] == 180.0
    assert res.json()["recommendation_acceptance_rate"] == 0.92
```

- [ ] **Step 2: Run them and watch them fail**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -k "doctor or slot or inbox or public" -v
```

Expected: 405 on `PUT /api/doctors/me`; slot creation ignores `mode`.

- [ ] **Step 3: Add the schemas**

In `app/schemas/__init__.py`, update the doctor and slot schemas:

```python
class DoctorProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    qualifications: Optional[str] = None
    languages: Optional[List[str]] = None
    consultation_fee: Optional[float] = Field(None, ge=0)
    is_available: Optional[bool] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    default_meeting_link: Optional[str] = None
```

Add the four new fields to **both** `DoctorOut` and `DoctorPublicOut`:

```python
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    avg_response_minutes: Optional[float] = None
    recommendation_acceptance_rate: float = 0.0
```

`DoctorOut` additionally gets `default_meeting_link: Optional[str] = None` (the doctor's own view; never exposed on `DoctorPublicOut`).

Replace the availability schemas:

```python
class AvailabilitySlotCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    mode: str = "in_person"      # in_person | video


class AvailabilitySlotOut(BaseModel):
    id: int
    doctor_id: int
    start_time: datetime
    end_time: datetime
    is_booked: bool
    mode: str

    class Config:
        from_attributes = True
```

Add the inbox schema:

```python
class RequestOut(BaseModel):
    id: int
    patient_id: int
    scheduled_datetime: datetime
    symptom_input: Optional[str] = None
    severity: Optional[str] = None
    mode: str
    requested_at: datetime
    respond_by: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 4: Implement the doctor endpoints**

In `app/routers/doctors.py`, replace the imports and add the endpoints:

```python
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    AvailabilitySlot, Consultation, ConsultationStatus, Doctor, SlotMode,
)
from app.schemas import (
    AvailabilitySlotCreate, AvailabilitySlotOut, DoctorOut, DoctorProfileUpdate,
    DoctorPublicOut, RequestOut,
)
from app.core.security import require_doctor, get_current_user
from app.services.appointments import expire_stale

router = APIRouter(prefix="/api/doctors", tags=["doctors"])

# Severity drives both the response deadline and the order of the inbox.
SEVERITY_ORDER = {"severe": 0, "moderate": 1, "mild": 2}


@router.put("/me", response_model=DoctorOut)
def update_my_profile(
    payload: DoctorProfileUpdate,
    doctor: Doctor = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    """Doctors could not edit anything before SP3 — this endpoint did not exist."""
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(doctor, field, value)
    db.commit(); db.refresh(doctor)
    return doctor


@router.get("/me/requests", response_model=List[RequestOut])
def my_pending_requests(
    doctor: Doctor = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    """The inbox. Severity first, then whoever's clock runs out soonest."""
    expire_stale(db)

    requests = db.query(Consultation).filter(
        Consultation.doctor_id == doctor.id,
        Consultation.status == ConsultationStatus.requested,
    ).all()

    requests.sort(key=lambda c: (
        SEVERITY_ORDER.get((c.severity or "").lower(), 3),
        c.respond_by or datetime.max,
    ))
    return requests
```

Replace `add_availability`:

```python
@router.post("/availability", response_model=AvailabilitySlotOut, status_code=201)
def add_availability(
    payload: AvailabilitySlotCreate,
    doctor: Doctor = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    try:
        mode = SlotMode(payload.mode)
    except ValueError:
        raise HTTPException(status_code=400, detail="mode must be 'in_person' or 'video'")

    # Fail here, where it is cheap to fix — not later, when a patient is waiting.
    if mode == SlotMode.in_person and not doctor.clinic_address:
        raise HTTPException(
            status_code=400,
            detail="Add your clinic address to your profile before offering in-person slots.",
        )
    if mode == SlotMode.video and not doctor.default_meeting_link:
        raise HTTPException(
            status_code=400,
            detail="Add a meeting link to your profile before offering video slots.",
        )
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time.")

    slot = AvailabilitySlot(
        doctor_id=doctor.id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        mode=mode,
    )
    db.add(slot); db.commit(); db.refresh(slot)
    return slot
```

Add `expire_stale(db)` to the top of `get_availability` and `my_consultations`, so a lapsed hold never hides an open slot:

```python
@router.get("/{doctor_id}/availability", response_model=List[AvailabilitySlotOut])
def get_availability(doctor_id: int, db: Session = Depends(get_db)):
    expire_stale(db)
    slots = db.query(AvailabilitySlot).filter(
        AvailabilitySlot.doctor_id == doctor_id,
        AvailabilitySlot.is_booked == False,   # noqa: E712
        AvailabilitySlot.start_time > datetime.utcnow(),
    ).order_by(AvailabilitySlot.start_time.asc()).all()
    return slots
```

In `my_consultations`, add `expire_stale(db)` as the first line and include the lifecycle fields in each dict:

```python
        result.append({
            "id": c.id,
            "patient_id": c.patient_id,
            "scheduled_datetime": c.scheduled_datetime,
            "status": c.status.value if hasattr(c.status, "value") else c.status,
            "symptom_input": c.symptom_input,
            "severity": c.severity,
            "mode": c.mode.value if hasattr(c.mode, "value") else c.mode,
            "location": c.location,
            "meeting_link": c.meeting_link,
            "respond_by": c.respond_by,
            "pay_by": c.pay_by,
            "duration_minutes": c.duration_minutes,
            "payment_status": p.status.value if p else "unpaid",
            "amount": p.amount if p else float(doctor.consultation_fee or 0.0),
        })
```

- [ ] **Step 5: Mirror the same fields on the patient's list**

In `app/routers/patients.py`, add `expire_stale(db)` as the first line of `get_my_consultations` and add the same lifecycle fields to each result dict. Import it:

```python
from app.services.appointments import expire_stale
```

Each entry gains: `severity`, `mode`, `location`, `meeting_link`, `respond_by`, `pay_by`, `duration_minutes`, `decline_reason`, and `doctor_id` (the frontend needs it to name the doctor).

- [ ] **Step 6: Run the tests and watch them pass**

```bash
venv/bin/python -m pytest tests/test_appointment_lifecycle.py -v
```

Expected: 41 passed.

- [ ] **Step 7: Confirm nothing regressed**

```bash
venv/bin/python -m pytest -q
```

Expected: 62 passed.

- [ ] **Step 8: Commit**

```bash
git add app/schemas/__init__.py app/routers/doctors.py app/routers/patients.py \
        tests/test_appointment_lifecycle.py
git commit -m "feat(doctors): profile editing, slot modes, and the request inbox"
```

---

## Task 10: Frontend types, API client, formatters

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/api.ts`, `src/lib/format.ts`

**Interfaces:**
- Consumes: every backend endpoint from Tasks 4–9.
- Produces: `ConsultationStatus` union; `ConsultationSummary` with lifecycle fields; `NextBest`; `DoctorRequest`; `DoctorProfileUpdate`; `api.consultations.accept/decline/withdraw/nextBest`; `api.doctors.updateMe/myRequests`; `statusTone`, `severityTone`, `formatCountdown`.

- [ ] **Step 1: Extend the types**

In `src/lib/types.ts`, replace `ConsultationSummary` and add the new types:

```ts
export type ConsultationStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "expired"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export type SlotMode = "in_person" | "video";

export type Severity = "mild" | "moderate" | "severe";

export interface ConsultationSummary {
  id: number;
  doctor_id?: number;
  patient_id?: number;
  scheduled_datetime: string;
  status: ConsultationStatus;
  symptom_input: string | null;
  payment_status?: "unpaid" | "pending" | "success" | "failed" | "refunded";
  amount?: number;
  // ── lifecycle (SP3) ──
  severity?: Severity | null;
  mode?: SlotMode;
  location?: string | null;
  meeting_link?: string | null;
  respond_by?: string | null;
  pay_by?: string | null;
  duration_minutes?: number | null;
  decline_reason?: string | null;
}

export interface NextBest {
  recommendation_id: number;
  doctor_id: number;
  doctor_name: string;
  specialization: string;
  rank: number;
  score: number;
  average_rating: number;
  years_experience: number;
  consultation_fee: number;
  avg_response_minutes: number | null;
  acceptance_rate: number | null;
  next_slot_id: number;
  next_slot_start: string;
  next_slot_mode: SlotMode;
  symptom_input: string | null;
}

export interface DoctorRequest {
  id: number;
  patient_id: number;
  scheduled_datetime: string;
  symptom_input: string | null;
  severity: Severity | null;
  mode: SlotMode;
  requested_at: string;
  respond_by: string;
}

export interface DoctorProfileUpdate {
  full_name?: string;
  phone?: string;
  location?: string;
  bio?: string;
  qualifications?: string;
  languages?: string[];
  consultation_fee?: number;
  is_available?: boolean;
  clinic_name?: string;
  clinic_address?: string;
  default_meeting_link?: string;
}
```

Add the new fields to `AvailabilitySlotOut`, `AvailabilitySlotCreate`, `DoctorOut`, `DoctorPublicOut`, and `BookConsultation`:

```ts
export interface AvailabilitySlotCreate {
  start_time: string;
  end_time: string;
  mode: SlotMode;
}

export interface AvailabilitySlotOut {
  id: number;
  doctor_id: number;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  mode: SlotMode;
}

export interface BookConsultation {
  doctor_id: number;
  slot_id: number;
  symptom_input?: string | null;
  recommendation_rank?: number | null;
  recommendation_id?: number | null;
}
```

`DoctorOut` and `DoctorPublicOut` each gain:

```ts
  clinic_name?: string | null;
  clinic_address?: string | null;
  avg_response_minutes?: number | null;
  recommendation_acceptance_rate?: number;
```

and `DoctorOut` alone gains `default_meeting_link?: string | null;`.

- [ ] **Step 2: Extend the API client**

In `src/lib/api.ts`, add to the import list: `DoctorProfileUpdate`, `DoctorRequest`, `NextBest`.

Add to `api.consultations`:

```ts
    accept: (id: number) =>
      request<ConsultationOut>(`/api/consultations/${id}/accept`, {
        method: "POST",
      }),
    decline: (id: number, reason?: string) =>
      request<ConsultationOut>(`/api/consultations/${id}/decline`, {
        method: "POST",
        body: JSON.stringify({ decline_reason: reason ?? null }),
      }),
    withdraw: (id: number) =>
      request<ConsultationOut>(`/api/consultations/${id}/withdraw`, {
        method: "POST",
      }),
    nextBest: (id: number) =>
      request<NextBest | null>(`/api/consultations/${id}/next-best`),
```

Add to `api.doctors`:

```ts
    updateMe: (payload: DoctorProfileUpdate) =>
      request<DoctorOut>("/api/doctors/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    myRequests: () => request<DoctorRequest[]>("/api/doctors/me/requests"),
```

- [ ] **Step 3: Extend the formatters**

In `src/lib/format.ts`, replace `statusTone` and add the new helpers:

```ts
export function statusTone(
  status: string,
): "primary" | "secondary" | "tertiary" | "success" | "error" | "neutral" {
  switch (status) {
    case "scheduled":
      return "success";      // accepted AND paid — it's really happening
    case "completed":
      return "success";
    case "accepted":
      return "primary";      // waiting on payment
    case "requested":
      return "neutral";      // waiting on the doctor
    case "declined":
    case "expired":
    case "cancelled":
    case "no_show":
      return "error";
    default:
      return "neutral";
  }
}

/** Patients see "Confirmed", not "Scheduled" — the enum is our word, not theirs. */
export function statusLabel(status: string): string {
  switch (status) {
    case "scheduled":
      return "Confirmed";
    case "requested":
      return "Awaiting doctor";
    case "accepted":
      return "Accepted";
    case "expired":
      return "Expired";
    case "no_show":
      return "No-show";
    default:
      return titleCase(status);
  }
}

export function severityTone(
  severity: string | null | undefined,
): "success" | "tertiary" | "error" | "neutral" {
  switch (severity) {
    case "severe":
      return "error";
    case "moderate":
      return "tertiary";
    case "mild":
      return "success";
    default:
      return "neutral";
  }
}

/** "1h 47m" / "12m" / "" once the deadline has passed. */
export function formatCountdown(deadlineIso: string | null | undefined): string {
  if (!deadlineIso) return "";
  const ms = new Date(deadlineIso).getTime() - Date.now();
  if (isNaN(ms) || ms <= 0) return "";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** "usually replies in 3h" — empty for a doctor with no history yet. */
export function formatResponseTime(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return "";
  if (minutes < 60) return `usually replies in ${Math.round(minutes)}m`;
  return `usually replies in ${Math.round(minutes / 60)}h`;
}
```

- [ ] **Step 4: Typecheck**

```bash
cd "/home/shephard/Desktop/Work/Web Apps/medilink-frontend"
npx tsc --noEmit
```

Expected: errors **only** in the pages that still use the old shapes (`appointments/page.tsx`, `doctor-portal/page.tsx`, `book/page.tsx`, `AvailabilityForm.tsx`). Those are fixed in Tasks 11–15. If any *other* file errors, fix it now.

- [ ] **Step 5: Commit**

```bash
git checkout -b feature/appointment-lifecycle
git add src/lib/types.ts src/lib/api.ts src/lib/format.ts
git commit -m "feat(appointments): frontend types, API client, and lifecycle formatters"
```

---

## Task 11: Countdown component + the patient's four card states

**Files:**
- Create: `src/components/ui/Countdown.tsx`
- Modify: `src/app/(app)/appointments/page.tsx`

**Interfaces:**
- Consumes: `formatCountdown`, `statusTone`, `statusLabel`, `severityTone` (Task 10).
- Produces: `<Countdown deadline={iso} onExpire={fn} />`.

- [ ] **Step 1: Build the countdown**

Create `src/components/ui/Countdown.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/format";

/**
 * A ticking countdown to a deadline. Uncertainty is most of what makes waiting
 * unbearable — a deadline you can watch is tolerable.
 */
export function Countdown({
  deadline,
  onExpire,
}: {
  deadline: string | null | undefined;
  onExpire?: () => void;
}) {
  const [label, setLabel] = useState(() => formatCountdown(deadline));

  useEffect(() => {
    setLabel(formatCountdown(deadline));
    if (!deadline) return;

    const id = setInterval(() => {
      const next = formatCountdown(deadline);
      setLabel(next);
      if (!next) {
        clearInterval(id);
        onExpire?.();
      }
    }, 30_000);

    return () => clearInterval(id);
  }, [deadline, onExpire]);

  if (!label) return null;
  return <span className="font-semibold tabular-nums">{label}</span>;
}
```

- [ ] **Step 2: Rewrite the appointments page**

Replace `src/app/(app)/appointments/page.tsx` entirely:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import {
  formatDateTime, formatNaira, severityTone, statusLabel, statusTone, titleCase,
} from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { FeedbackModal } from "@/components/app/FeedbackModal";
import { NextBestDoctor } from "@/components/app/NextBestDoctor";
import type { ConsultationSummary, DoctorPublicOut } from "@/lib/types";

export default function AppointmentsPage() {
  const {
    data: consultations, loading: consultLoading, error: consultError, reload,
  } = useApi(() => api.patients.consultations(), []);
  const { data: doctors } = useApi(() => api.doctors.list(), []);

  const [feedbackId, setFeedbackId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ConsultationSummary | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const doctorMap: Record<number, string> = {};
  for (const d of (doctors ?? []) as DoctorPublicOut[]) doctorMap[d.id] = d.full_name;

  function doctorName(c: ConsultationSummary): string {
    if (c.doctor_id != null && doctorMap[c.doctor_id]) return doctorMap[c.doctor_id];
    return c.doctor_id != null ? `Doctor #${c.doctor_id}` : "Unknown Doctor";
  }

  async function handlePay(id: number) {
    setBusyId(id);
    setActionError(null);
    try {
      const { authorization_url } = await api.payments.initialize(id);
      window.location.href = authorization_url;
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not start payment.");
      setBusyId(null);
    }
  }

  async function handleWithdraw(id: number) {
    setBusyId(id);
    setActionError(null);
    try {
      await api.consultations.withdraw(id);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not withdraw.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await api.consultations.cancel(cancelTarget.id);
      setCancelTarget(null);
      reload();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  const items = consultations ?? [];

  return (
    <>
      <header className="mb-8">
        <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">
          My Appointments
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Track your consultations, review completed visits, and share feedback.
        </p>
      </header>

      {actionError && (
        <p className="mb-4 rounded-xl border border-error-container bg-error-container px-5 py-3 text-body-md text-on-error-container">
          {actionError}
        </p>
      )}

      {consultLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-card">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          ))}
        </div>
      ) : consultError ? (
        <p className="rounded-xl border border-error-container bg-error-container px-5 py-4 text-body-md text-on-error-container">
          {consultError}
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          description="Book a consultation to get started. Your upcoming and past appointments will appear here."
          action={
            <Link href="/intake">
              <Button><Icon name="add" className="text-base" /> New consultation</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((c) => {
            const name = doctorName(c);
            const paid = c.payment_status === "success";

            return (
              <Card key={c.id} hover>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar name={name} size={48} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body-lg font-semibold text-on-surface">{name}</p>
                      <StatusBadge tone={statusTone(c.status)}>
                        {statusLabel(c.status)}
                      </StatusBadge>
                      {c.severity && c.status === "requested" && (
                        <StatusBadge tone={severityTone(c.severity)}>
                          {titleCase(c.severity)}
                        </StatusBadge>
                      )}
                      {c.status === "scheduled" && paid && (
                        <StatusBadge tone="success">Paid</StatusBadge>
                      )}
                      {c.status === "accepted" && !paid && (
                        <StatusBadge tone="neutral">Payment due</StatusBadge>
                      )}
                    </div>

                    {c.symptom_input && (
                      <p className="mt-0.5 truncate text-body-md text-on-surface-variant">
                        {c.symptom_input}
                      </p>
                    )}

                    <p className="mt-1 flex items-center gap-1 text-label-md text-on-surface-variant">
                      <Icon name="schedule" className="text-base" />
                      {formatDateTime(c.scheduled_datetime)}
                      {c.duration_minutes ? ` · ${c.duration_minutes} min` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {c.status === "requested" && (
                      <Button
                        variant="outline"
                        loading={busyId === c.id}
                        onClick={() => handleWithdraw(c.id)}
                      >
                        <Icon name="undo" className="text-base" />
                        Withdraw
                      </Button>
                    )}
                    {c.status === "accepted" && !paid && (
                      <>
                        <Button
                          variant="primary"
                          loading={busyId === c.id}
                          onClick={() => handlePay(c.id)}
                        >
                          <Icon name="payments" className="text-base" />
                          Pay{c.amount != null ? ` ${formatNaira(c.amount)}` : ""}
                        </Button>
                        <Button variant="outline" onClick={() => setCancelTarget(c)}>
                          Cancel
                        </Button>
                      </>
                    )}
                    {c.status === "scheduled" && (
                      <Button variant="outline" onClick={() => setCancelTarget(c)}>
                        <Icon name="close" className="text-base" />
                        Cancel
                      </Button>
                    )}
                    {c.status === "completed" && (
                      <Button variant="secondary" onClick={() => setFeedbackId(c.id)}>
                        <Icon name="rate_review" className="text-base" />
                        Leave feedback
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── Status banner ── */}
                {c.status === "requested" && c.respond_by && (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-warning-container px-4 py-3 text-label-md text-on-warning-container">
                    <Icon name="hourglass_top" className="text-[20px]" />
                    <span>
                      Waiting on {name} — <Countdown deadline={c.respond_by} onExpire={reload} /> left
                      to respond. We&apos;ll find you someone else if they don&apos;t.
                    </span>
                  </p>
                )}

                {c.status === "accepted" && !paid && c.pay_by && (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-success-container px-4 py-3 text-label-md text-on-success-container">
                    <Icon name="check_circle" fill className="text-[20px]" />
                    <span>
                      {name} accepted you. Pay within{" "}
                      <Countdown deadline={c.pay_by} onExpire={reload} /> to lock in this slot.
                    </span>
                  </p>
                )}

                {c.status === "scheduled" && c.mode === "in_person" && c.location && (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-body-md text-on-surface">
                    <Icon name="location_on" fill className="text-[20px] text-secondary" />
                    <span>{c.location}</span>
                    <a
                      className="ml-auto shrink-0 text-label-md text-primary hover:underline"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Directions
                    </a>
                  </p>
                )}

                {c.status === "scheduled" && c.mode === "video" && c.meeting_link && (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-body-md text-on-surface">
                    <Icon name="videocam" fill className="text-[20px] text-secondary" />
                    <a
                      className="text-primary hover:underline"
                      href={c.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Join consultation
                    </a>
                  </p>
                )}

                {(c.status === "declined" || c.status === "expired") && (
                  <>
                    <p className="mt-4 flex items-center gap-2 rounded-lg bg-error-container px-4 py-3 text-label-md text-on-error-container">
                      <Icon name="cancel" className="text-[20px]" />
                      <span>
                        {c.status === "declined"
                          ? c.decline_reason
                            ? `${name} can't take this appointment — ${c.decline_reason}`
                            : `${name} isn't able to take this appointment.`
                          : `${name} didn't respond in time, so the slot was released.`}
                      </span>
                    </p>
                    <NextBestDoctor consultationId={c.id} onRequested={reload} />
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {feedbackId != null && (
        <FeedbackModal
          consultationId={feedbackId}
          open={feedbackId != null}
          onClose={() => setFeedbackId(null)}
          onSubmitted={() => { setFeedbackId(null); reload(); }}
        />
      )}

      <Modal
        open={cancelTarget != null}
        onClose={() => { if (!cancelling) { setCancelTarget(null); setCancelError(null); } }}
        title="Cancel appointment?"
      >
        {cancelTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-body-md text-on-surface-variant">
              Cancel your appointment with{" "}
              <span className="font-semibold text-on-surface">{doctorName(cancelTarget)}</span> on{" "}
              <span className="font-semibold text-on-surface">
                {formatDateTime(cancelTarget.scheduled_datetime)}
              </span>
              ? This frees the slot for other patients.
            </p>

            {cancelTarget.payment_status === "success" && (
              <p className="flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-body-md text-on-surface">
                <Icon name="payments" className="text-[20px] text-secondary" />
                You&apos;ll be refunded{" "}
                {cancelTarget.amount != null ? formatNaira(cancelTarget.amount) : "your payment"}.
              </p>
            )}

            {cancelError && (
              <p className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
                {cancelError}
              </p>
            )}

            <div className="mt-2 flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={cancelling}
                onClick={() => { setCancelTarget(null); setCancelError(null); }}
              >
                Keep appointment
              </Button>
              <Button
                variant="primary"
                className="!bg-error text-on-error hover:!bg-error/90"
                loading={cancelling}
                onClick={handleCancel}
              >
                <Icon name="close" className="text-base" />
                Cancel appointment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: one error — `NextBestDoctor` does not exist yet. That is Task 12.

- [ ] **Step 4: Commit (after Task 12 makes it compile)**

Hold this commit until Task 12; the page does not build without `NextBestDoctor`.

---

## Task 12: The next-best doctor block

**Files:**
- Create: `src/components/app/NextBestDoctor.tsx`
- Modify: `src/app/(app)/appointments/page.tsx` (already imports it — Task 11)

**Interfaces:**
- Consumes: `api.consultations.nextBest`, `api.consultations.book` (Task 10).
- Produces: `<NextBestDoctor consultationId={number} onRequested={() => void} />`.

- [ ] **Step 1: Build the component**

Create `src/components/app/NextBestDoctor.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatResponseTime } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";

/**
 * Shown when a doctor declines or lets a request lapse.
 *
 * The ranked list was already persisted when we made the original recommendation,
 * so there is nothing to re-score and no intake to redo — we simply walk to the
 * next name the model chose. A rejection becomes the system working *for* them.
 */
export function NextBestDoctor({
  consultationId,
  onRequested,
}: {
  consultationId: number;
  onRequested: () => void;
}) {
  const { data: next, loading } = useApi(
    () => api.consultations.nextBest(consultationId),
    [consultationId],
  );
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    if (!next) return;
    setRequesting(true);
    setError(null);
    try {
      await api.consultations.book({
        doctor_id: next.doctor_id,
        slot_id: next.next_slot_id,
        symptom_input: next.symptom_input,
        recommendation_id: next.recommendation_id,
        recommendation_rank: next.rank,
      });
      onRequested();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the request.");
      setRequesting(false);
    }
  }

  if (loading) return <Skeleton className="mt-4 h-32 w-full rounded-xl" />;

  // The list is exhausted — don't dead-end them, send them back to their matches.
  if (!next) {
    return (
      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-outline-variant/60 bg-surface-container-low px-5 py-4">
        <p className="text-body-md text-on-surface-variant">
          No other matches have open slots right now.
        </p>
        <Link href="/recommendations">
          <Button variant="outline">See all matches</Button>
        </Link>
      </div>
    );
  }

  const responseHint = formatResponseTime(next.avg_response_minutes);

  return (
    <div className="mt-4 rounded-xl border border-secondary-container bg-surface-container-low p-5">
      <p className="mb-4 flex items-center gap-2 text-label-md uppercase tracking-wider text-secondary">
        <Icon name="auto_awesome" fill className="text-[18px]" />
        Your next best match
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={next.doctor_name} size={56} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body-lg font-semibold text-on-surface">{next.doctor_name}</p>
            <StatusBadge tone="tertiary">
              #{next.rank} · {Math.round(next.score * 100)}% match
            </StatusBadge>
          </div>

          <p className="mt-0.5 text-body-md text-on-surface-variant">
            {next.specialization} · {next.years_experience} years experience
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-caption text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              <Icon name="star" fill className="text-[16px] text-warning" />
              {next.average_rating.toFixed(1)}
            </span>
            {responseHint && (
              <span className="inline-flex items-center gap-1">
                <Icon name="bolt" className="text-[16px]" />
                {responseHint}
              </span>
            )}
            {next.acceptance_rate != null && next.acceptance_rate > 0 && (
              <span className="inline-flex items-center gap-1">
                <Icon name="check" className="text-[16px]" />
                accepts {Math.round(next.acceptance_rate * 100)}%
              </span>
            )}
          </div>

          <p className="mt-2 flex items-center gap-1 text-label-md text-on-surface-variant">
            <Icon name="event_available" className="text-base" />
            Next open slot — {formatDateTime(next.next_slot_start)}
            {next.next_slot_mode === "video" ? " · Video" : " · In-person"}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="primary" loading={requesting} onClick={handleRequest}>
            Request {next.doctor_name.split(" ").slice(0, 2).join(" ")}
          </Button>
          <Link href="/recommendations">
            <Button variant="outline">See all matches</Button>
          </Link>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both clean.

- [ ] **Step 3: Commit Tasks 11 + 12 together**

```bash
git add src/components/ui/Countdown.tsx src/components/app/NextBestDoctor.tsx \
        "src/app/(app)/appointments/page.tsx"
git commit -m "feat(appointments): patient card states, countdowns, and next-best recovery"
```

---

## Task 13: Requesting instead of booking

**Files:**
- Modify: `src/app/(app)/doctors/[id]/book/page.tsx`, `src/app/(app)/appointments/confirmed/page.tsx`, `src/components/app/IntakeWizard.tsx`

**Interfaces:**
- Consumes: `api.consultations.book` with `recommendation_id` (Task 10); `AvailabilitySlotOut.mode`.
- Produces: the intake wizard stores `medilink:recommendationId` so the booking page can pass it through.

- [ ] **Step 1: Carry the recommendation id out of intake**

In `src/components/app/IntakeWizard.tsx`, immediately after the existing `sessionStorage.setItem("telemed:lastRecommendation", ...)` line (around line 307), add:

```tsx
      sessionStorage.setItem("medilink:recommendationId", String(res.recommendation_id));
```

This is what lets the backend derive severity from the stored recommendation instead of trusting a number the browser sends.

- [ ] **Step 2: Rework the booking page**

In `src/app/(app)/doctors/[id]/book/page.tsx`:

**(a)** Replace the `handleConfirm` function:

```tsx
  async function handleConfirm() {
    if (!selectedSlot || !doctor) return;
    setBooking(true);
    setBookError(null);
    try {
      const recId = sessionStorage.getItem("medilink:recommendationId");
      const c = await api.consultations.book({
        doctor_id: id,
        slot_id: selectedSlot.id,
        symptom_input: reason || null,
        recommendation_id: recId ? Number(recId) : null,
        recommendation_rank: null,
      });
      sessionStorage.setItem(
        "medilink:lastRequest",
        JSON.stringify({
          consultation: c,
          doctorName: doctor.full_name,
          start: selectedSlot.start_time,
          end: selectedSlot.end_time,
          mode: selectedSlot.mode,
        }),
      );
      router.push("/appointments/confirmed");
    } catch (err) {
      setBookError(err instanceof ApiError ? err.message : "Request failed. Please try again.");
      setBooking(false);
    }
  }
```

**(b)** In the doctor summary card, under the rating chips, add the response stats. Import `formatResponseTime` from `@/lib/format`:

```tsx
            {(() => {
              const hint = formatResponseTime(doctor.avg_response_minutes);
              if (!hint && !doctor.recommendation_acceptance_rate) {
                return (
                  <p className="mt-3 text-caption text-on-surface-variant">
                    New to MediLink
                  </p>
                );
              }
              return (
                <div className="mt-3 flex flex-wrap justify-center gap-2 text-caption text-on-surface-variant">
                  {hint && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1">
                      <Icon name="bolt" className="text-[16px]" />
                      {hint}
                    </span>
                  )}
                  {!!doctor.recommendation_acceptance_rate && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1">
                      <Icon name="check" className="text-[16px]" />
                      accepts {Math.round(doctor.recommendation_acceptance_rate * 100)}%
                    </span>
                  )}
                </div>
              );
            })()}
```

**(c)** Kill the hardcoded telehealth label. Replace the action-bar block that currently reads `<p className="text-body-md text-on-surface-variant">Telehealth consultation</p>` with the slot's real mode:

```tsx
                    {selectedSlot ? (
                      <>
                        <p className="text-label-md text-on-surface">
                          {formatDate(selectedSlot.start_time)} at {formatTime(selectedSlot.start_time)}
                        </p>
                        <p className="flex items-center gap-1 text-body-md text-on-surface-variant">
                          <Icon
                            name={selectedSlot.mode === "video" ? "videocam" : "location_on"}
                            className="text-[18px]"
                          />
                          {selectedSlot.mode === "video"
                            ? "Video consultation"
                            : doctor.clinic_address ?? "In-person consultation"}
                        </p>
                      </>
                    ) : (
                      <p className="text-body-md text-on-surface-variant">No time selected</p>
                    )}
```

**(d)** Rename the submit button:

```tsx
                  <Button size="lg" disabled={!selectedSlot} loading={booking} onClick={handleConfirm}>
                    Request appointment
                    <Icon name="arrow_forward" className="text-[20px]" />
                  </Button>
```

- [ ] **Step 3: Rework the confirmation page**

In `src/app/(app)/appointments/confirmed/page.tsx`:

**(a)** Change the sessionStorage key and the interface:

```tsx
interface LastRequest {
  consultation: ConsultationOut;
  doctorName: string;
  start: string;
  end: string;
  mode: SlotMode;
}
```

Import `SlotMode` from `@/lib/types` and read the new key:

```tsx
    const raw = sessionStorage.getItem("medilink:lastRequest");
```

**(b)** Replace the copy. The heading, subtitle and mode row must reflect that **nothing is confirmed yet** — the doctor still has to say yes:

```tsx
          <h1 className="text-headline-lg text-on-surface">Request sent!</h1>
          <p className="mt-3 max-w-sm text-body-md text-on-surface-variant">
            {booking.doctorName} has been asked to see you. You&apos;ll be able to pay and
            confirm as soon as they accept — we&apos;ll find you someone else if they can&apos;t.
          </p>
```

Change the success icon from `check_circle` to `hourglass_top`, and swap its colours to the warning tone:

```tsx
          <div className="relative z-10 mb-8 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-warning-container text-on-warning-container shadow-card">
            <Icon name="hourglass_top" fill className="text-[48px]" />
          </div>
```

In the details grid, replace the hardcoded `Telehealth` mode cell:

```tsx
              <div>
                <p className="flex items-center gap-1 text-caption text-on-surface-variant">
                  <Icon
                    name={booking.mode === "video" ? "videocam" : "location_on"}
                    className="text-[16px]"
                  />
                  Mode
                </p>
                <p className="mt-1 text-label-md text-on-surface">
                  {booking.mode === "video" ? "Video" : "In-person"}
                </p>
              </div>
```

And the provider sub-line (`Telehealth Consultation`) becomes:

```tsx
                <p className="text-body-md text-on-surface-variant text-[14px]">
                  Awaiting acceptance
                </p>
```

**(c)** Fix the calendar helper, which still says TeleMed:

```tsx
  function handleAddToCalendar() {
    downloadIcs({
      title: `Consultation with ${doctorName}`,
      start,
      end,
      description: "Booked via MediLink AI",
    });
  }
```

**(d)** Point the primary button at the appointments list, where the countdown lives:

```tsx
            <Link href="/appointments" className="w-full">
              <Button full size="lg">
                <Icon name="event" className="text-[20px]" />
                Track my request
              </Button>
            </Link>
```

- [ ] **Step 4: Typecheck and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/doctors/[id]/book/page.tsx" \
        "src/app/(app)/appointments/confirmed/page.tsx" \
        src/components/app/IntakeWizard.tsx
git commit -m "feat(appointments): request an appointment instead of booking one"
```

---

## Task 14: The doctor's request inbox

**Files:**
- Create: `src/components/app/RequestCard.tsx`
- Modify: `src/app/(app)/doctor-portal/page.tsx`

**Interfaces:**
- Consumes: `api.doctors.myRequests`, `api.consultations.accept/decline` (Task 10).
- Produces: `<RequestCard request={DoctorRequest} onAccept={fn} onDecline={fn} busy={boolean} />`.

- [ ] **Step 1: Build the request card**

Create `src/components/app/RequestCard.tsx`:

```tsx
"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, severityTone, titleCase } from "@/lib/format";
import type { DoctorRequest } from "@/lib/types";

export function RequestCard({
  request,
  busy,
  onAccept,
  onDecline,
}: {
  request: DoctorRequest;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const urgent = request.severity === "severe";

  return (
    <article
      className={[
        "rounded-xl border border-outline-variant/40 border-l-4 bg-surface-container-lowest p-md shadow-card",
        urgent ? "border-l-error" : request.severity === "moderate" ? "border-l-tertiary" : "border-l-success",
      ].join(" ")}
    >
      <div className="flex flex-col gap-md sm:flex-row sm:items-center">
        <Avatar name={`P${request.patient_id}`} size={56} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body-lg font-semibold text-on-surface">
              Patient #{request.patient_id}
            </p>
            {request.severity && (
              <StatusBadge tone={severityTone(request.severity)}>
                {titleCase(request.severity)}
              </StatusBadge>
            )}
            <StatusBadge tone="neutral">
              {request.mode === "video" ? "Video" : "In-person"}
            </StatusBadge>
          </div>

          <p className="mt-1 flex items-center gap-1 text-label-md text-on-surface-variant">
            <Icon name="calendar_today" className="text-base" />
            {formatDateTime(request.scheduled_datetime)}
          </p>
        </div>
      </div>

      {request.symptom_input && (
        <p className="mt-3 rounded-lg bg-surface-container-low px-4 py-3 text-body-md text-on-surface-variant">
          <Icon name="medical_information" className="mr-1 align-middle text-[18px] text-secondary" />
          {request.symptom_input}
        </p>
      )}

      <p
        className={[
          "mt-3 flex items-center gap-2 rounded-lg px-4 py-3 text-label-md",
          urgent
            ? "bg-error-container text-on-error-container"
            : "bg-warning-container text-on-warning-container",
        ].join(" ")}
      >
        <Icon name="hourglass_top" className="text-[20px]" />
        <span>
          Respond within <Countdown deadline={request.respond_by} /> — otherwise this goes to
          another doctor.
        </span>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" loading={busy} onClick={onAccept}>
          <Icon name="check" className="text-base" />
          Accept
        </Button>
        <Button variant="outline" disabled={busy} onClick={onDecline}>
          <Icon name="close" className="text-base" />
          Decline
        </Button>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Wire the inbox into the portal**

In `src/app/(app)/doctor-portal/page.tsx`:

**(a)** Add the imports:

```tsx
import { RequestCard } from "@/components/app/RequestCard";
import { Textarea } from "@/components/ui/Textarea";
import type { ConsultationSummary, DoctorRequest } from "@/lib/types";
```

**(b)** Add the requests query and its handlers, next to the existing `consults` query:

```tsx
  const requests = useApi(() => api.doctors.myRequests(), []);

  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<DoctorRequest | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const reloadAll = useCallback(() => {
    requests.reload();
    consults.reload();
    metrics.reload();
  }, [requests, consults, metrics]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAccept(id: number) {
    setRespondingId(id);
    setRespondError(null);
    try {
      await api.consultations.accept(id);
      reloadAll();
    } catch (err) {
      setRespondError(
        err instanceof ApiError ? err.message : "Could not accept this request.",
      );
    } finally {
      setRespondingId(null);
    }
  }

  async function handleDecline() {
    if (!declineTarget) return;
    setRespondingId(declineTarget.id);
    setRespondError(null);
    try {
      await api.consultations.decline(declineTarget.id, declineReason || undefined);
      setDeclineTarget(null);
      setDeclineReason("");
      reloadAll();
    } catch (err) {
      setRespondError(
        err instanceof ApiError ? err.message : "Could not decline this request.",
      );
    } finally {
      setRespondingId(null);
    }
  }
```

**(c)** Update the greeting sub-line to lead with the requests, since they are the thing with a clock on them:

```tsx
        <p className="mt-1 text-body-md text-on-surface-variant">
          {consults.loading ? (
            <Skeleton className="h-5 w-48 inline-block" />
          ) : (
            <>
              {(requests.data ?? []).length > 0 && (
                <>
                  You have{" "}
                  <span className="font-bold text-error">
                    {(requests.data ?? []).length} request
                    {(requests.data ?? []).length !== 1 ? "s" : ""}
                  </span>{" "}
                  awaiting a decision ·{" "}
                </>
              )}
              <span className="font-bold text-primary">
                {todayConsults.length} consultation{todayConsults.length !== 1 ? "s" : ""}
              </span>{" "}
              today
            </>
          )}
        </p>
```

**(d)** Insert the inbox **above** the Patient Queue heading, inside the left column of the existing `[1fr_340px]` grid:

```tsx
          {/* Patient requests — they have a clock on them, so they go first */}
          {(requests.data ?? []).length > 0 && (
            <section className="mb-9">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-headline-md text-on-surface">Patient Requests</h2>
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-error px-2 text-label-sm font-bold text-on-error">
                  {(requests.data ?? []).length}
                </span>
              </div>

              {respondError && (
                <p className="mb-4 rounded-lg bg-error-container px-4 py-3 text-label-md text-on-error-container">
                  {respondError}
                </p>
              )}

              <div className="flex flex-col gap-4">
                {(requests.data ?? []).map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    busy={respondingId === r.id}
                    onAccept={() => handleAccept(r.id)}
                    onDecline={() => setDeclineTarget(r)}
                  />
                ))}
              </div>
            </section>
          )}
```

**(e)** Replace the queue's action cluster. `markCompleted` stays; add a no-show action:

```tsx
                  {c.status === "scheduled" && (
                    <div className="flex flex-shrink-0 flex-wrap gap-2">
                      <Button
                        size="md"
                        variant="primary"
                        loading={completing === c.id}
                        onClick={() => markCompleted(c.id)}
                      >
                        <Icon name="check_circle" className="text-[18px]" />
                        Consultation done
                      </Button>
                      <Button
                        size="md"
                        variant="outline"
                        onClick={() => markNoShow(c.id)}
                      >
                        No-show
                      </Button>
                      {new Date(c.scheduled_datetime) > new Date() && (
                        <Button size="md" variant="outline" onClick={() => setCancelTarget(c)}>
                          <Icon name="close" className="text-[18px]" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}
```

Add `markNoShow` beside `markCompleted`:

```tsx
  async function markNoShow(id: number) {
    setCompleting(id);
    setCompleteError(null);
    try {
      await api.consultations.update(id, { status: "no_show" });
      reloadAll();
    } catch (err) {
      setCompleteError(
        err instanceof ApiError ? err.message : "Could not mark this as a no-show.",
      );
    } finally {
      setCompleting(null);
    }
  }
```

**(f)** Fix the acceptance-rate metric card's subtitle, which has always described something the code never computed:

```tsx
            <MetricCard
              icon="trending_up"
              label="Acceptance rate"
              value={
                metrics.data
                  ? `${Math.round(metrics.data.recommendation_acceptance_rate * 100)}%`
                  : "—"
              }
              sub="Requests you accepted"
            />
```

**(g)** Add the decline modal beside the existing cancel modal:

```tsx
      <Modal
        open={declineTarget != null}
        onClose={() => { setDeclineTarget(null); setDeclineReason(""); }}
        title="Decline this request?"
      >
        {declineTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-body-md text-on-surface-variant">
              The slot is freed immediately and we&apos;ll offer Patient #
              {declineTarget.patient_id} their next-best match. Nothing has been paid.
            </p>

            <Textarea
              label="Reason (optional — the patient sees this)"
              placeholder="e.g. Fully booked that morning"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />

            <div className="mt-2 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { setDeclineTarget(null); setDeclineReason(""); }}
              >
                Keep it
              </Button>
              <Button
                variant="primary"
                className="!bg-error text-on-error hover:!bg-error/90"
                loading={respondingId === declineTarget.id}
                onClick={handleDecline}
              >
                Decline request
              </Button>
            </div>
          </div>
        )}
      </Modal>
```

- [ ] **Step 3: Typecheck and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/RequestCard.tsx "src/app/(app)/doctor-portal/page.tsx"
git commit -m "feat(doctor-portal): patient request inbox with accept and decline"
```

---

## Task 15: Doctor profile page + slot modes

**Files:**
- Create: `src/app/(app)/doctor-profile/page.tsx`
- Modify: `src/app/(app)/layout.tsx`, `src/components/app/AvailabilityForm.tsx`

**Interfaces:**
- Consumes: `api.doctors.me`, `api.doctors.updateMe` (Task 10).

Without this page a doctor can never set a clinic address, and therefore can never accept an in-person request. It is not optional polish.

- [ ] **Step 1: Add the sidebar entry**

In `src/app/(app)/layout.tsx`:

```tsx
const doctorItems = [
  { label: "Schedule", href: "/doctor-portal" },
  { label: "My Profile", href: "/doctor-profile" },
];
```

- [ ] **Step 2: Build the profile page**

Create `src/app/(app)/doctor-profile/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/useApi";
import { api, ApiError } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";

export default function DoctorProfilePage() {
  const { data: doctor, loading, error, reload } = useApi(() => api.doctors.me(), []);

  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [bio, setBio] = useState("");
  const [fee, setFee] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!doctor) return;
    setClinicName(doctor.clinic_name ?? "");
    setClinicAddress(doctor.clinic_address ?? "");
    setMeetingLink(doctor.default_meeting_link ?? "");
    setBio(doctor.bio ?? "");
    setFee(String(doctor.consultation_fee ?? 0));
  }, [doctor]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await api.doctors.updateMe({
        clinic_name: clinicName || undefined,
        clinic_address: clinicAddress || undefined,
        default_meeting_link: meetingLink || undefined,
        bio: bio || undefined,
        consultation_fee: fee ? Number(fee) : undefined,
      });
      setSaved(true);
      reload();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (error || !doctor) {
    return (
      <p className="rounded-xl bg-error-container px-5 py-4 text-body-md text-on-error-container">
        {error ?? "Could not load your profile."}
      </p>
    );
  }

  const missingAddress = !doctor.clinic_address;
  const missingLink = !doctor.default_meeting_link;

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <h1 className="text-headline-lg text-on-surface">My Profile</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Patients see this before they request you.
        </p>
      </header>

      {(missingAddress || missingLink) && (
        <p className="mb-6 flex items-start gap-2 rounded-xl bg-warning-container px-5 py-4 text-body-md text-on-warning-container">
          <Icon name="error" className="mt-0.5 text-[20px]" />
          <span>
            {missingAddress && missingLink
              ? "You can't offer any slots yet — add a clinic address for in-person visits, or a meeting link for video ones."
              : missingAddress
                ? "Add a clinic address before offering in-person slots. Patients need to know where to go."
                : "Add a meeting link before offering video slots."}
          </span>
        </p>
      )}

      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <Avatar name={doctor.full_name} size={72} />
          <div>
            <p className="text-headline-md text-on-surface">{doctor.full_name}</p>
            <p className="text-body-md text-on-surface-variant">{doctor.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge tone={doctor.verification_status === "verified" ? "success" : "neutral"}>
                {doctor.verification_status}
              </StatusBadge>
              {doctor.avg_response_minutes != null && (
                <StatusBadge tone="secondary">
                  Replies in ~{Math.round(doctor.avg_response_minutes / 60)}h
                </StatusBadge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div>
            <h2 className="text-headline-md text-on-surface">Practice</h2>
            <p className="mt-1 text-caption text-on-surface-variant">
              The clinic address is copied onto each appointment when you accept it, so a
              patient always sees where they went — even if you move practice later.
            </p>
          </div>

          <Input
            label="Clinic name"
            placeholder="Eze Heart Clinic"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
          />
          <Input
            label="Clinic address"
            placeholder="12 Awolowo Road, Ikoyi, Lagos"
            value={clinicAddress}
            onChange={(e) => setClinicAddress(e.target.value)}
          />
          <Input
            label="Default meeting link (for video slots)"
            placeholder="https://meet.google.com/abc-defg-hij"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
          />
          <Input
            label="Consultation fee (₦)"
            type="number"
            min="0"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
          <Textarea
            label="About you"
            placeholder="Consultant cardiologist with 14 years of experience…"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          {saveError && (
            <p className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
              {saveError}
            </p>
          )}
          {saved && (
            <p className="rounded-lg bg-success-container px-4 py-3 text-body-md text-on-success-container">
              Profile saved.
            </p>
          )}

          <Button type="submit" loading={saving} full>
            Save profile
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Add the mode toggle to the availability form**

Replace `src/components/app/AvailabilityForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import type { SlotMode } from "@/lib/types";

interface AvailabilityFormProps {
  onAdded: () => void;
  clinicAddress?: string | null;
  meetingLink?: string | null;
}

export function AvailabilityForm({ onAdded, clinicAddress, meetingLink }: AvailabilityFormProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState<SlotMode>("in_person");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fail here, where it's cheap to fix — not when a patient is already waiting.
  const blocked =
    (mode === "in_person" && !clinicAddress) || (mode === "video" && !meetingLink);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !end) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await api.doctors.addAvailability({
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        mode,
      });
      setSuccess(true);
      setStart("");
      setEnd("");
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add availability slot.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-label-md text-on-surface">How will you see the patient?</p>
        <div className="flex gap-2">
          <Chip active={mode === "in_person"} onClick={() => setMode("in_person")}>
            <Icon name="location_on" className="text-[18px]" />
            In-person
          </Chip>
          <Chip active={mode === "video"} onClick={() => setMode("video")}>
            <Icon name="videocam" className="text-[18px]" />
            Video
          </Chip>
        </div>
      </div>

      {blocked && (
        <p className="flex items-start gap-2 rounded-lg bg-warning-container px-4 py-3 text-caption text-on-warning-container">
          <Icon name="error" className="mt-0.5 text-[18px]" />
          <span>
            {mode === "in_person"
              ? "Add a clinic address to your profile before offering in-person slots."
              : "Add a meeting link to your profile before offering video slots."}{" "}
            <Link href="/doctor-profile" className="font-semibold underline">
              Go to profile
            </Link>
          </span>
        </p>
      )}

      <Input
        label="Start time"
        type="datetime-local"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        required
      />
      <Input
        label="End time"
        type="datetime-local"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        required
      />

      {error && (
        <p className="rounded-lg bg-error-container px-4 py-3 text-label-md text-on-error-container">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-success-container px-4 py-3 text-label-md text-on-success-container">
          Availability slot added.
        </p>
      )}

      <Button type="submit" loading={loading} disabled={!start || !end || blocked} full>
        Add availability
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Pass the doctor's profile into the form**

In `src/app/(app)/doctor-portal/page.tsx`, update the `AvailabilityForm` usage inside the availability modal:

```tsx
        <AvailabilityForm
          clinicAddress={doctor.data?.clinic_address}
          meetingLink={doctor.data?.default_meeting_link}
          onAdded={() => {
            setAvailOpen(false);
            reloadAll();
          }}
        />
```

- [ ] **Step 5: Typecheck and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/doctor-profile/page.tsx" "src/app/(app)/layout.tsx" \
        src/components/app/AvailabilityForm.tsx "src/app/(app)/doctor-portal/page.tsx"
git commit -m "feat(doctors): profile page and in-person/video slot modes"
```

---

## Task 16: End-to-end verification

**Files:** none — this task runs the software.

**Interfaces:** consumes everything.

- [ ] **Step 1: Full backend suite**

```bash
cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system"
venv/bin/python -m pytest -q
```

Expected: **62 passed** (21 pre-existing + 41 new). Any failure blocks this task — do not proceed.

- [ ] **Step 2: Migrate and seed**

```bash
venv/bin/alembic upgrade head
venv/bin/python seed_data.py
```

Then give the seeded doctors a clinic, or they cannot accept anything:

```bash
venv/bin/python -c "
from app.database import SessionLocal
from app.models import Doctor
db = SessionLocal()
for d in db.query(Doctor).all():
    d.clinic_name = d.clinic_name or f'{d.full_name.split()[-1]} Clinic'
    d.clinic_address = d.clinic_address or '12 Awolowo Road, Ikoyi, Lagos'
    d.default_meeting_link = d.default_meeting_link or 'https://meet.example.com/medilink'
db.commit()
print('clinics set on', db.query(Doctor).count(), 'doctors')
"
```

- [ ] **Step 3: Run both servers**

```bash
# terminal 1
cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system"
venv/bin/uvicorn app.main:app --reload

# terminal 2
cd "/home/shephard/Desktop/Work/Web Apps/medilink-frontend"
npm run dev
```

The backend `.env` must carry Paystack **test** keys (`sk_test_…` / `pk_test_…`) and `FRONTEND_URL=http://localhost:3000`.

- [ ] **Step 4: Walk the whole journey**

As a **patient**:
1. Log in, complete `/intake` reporting **severe** symptoms.
2. On `/recommendations`, open the top match and click **Request appointment**. Confirm the copy says *request*, not *confirm*, and shows the slot's real mode — **not** "Telehealth consultation".
3. Land on **"Request sent!"**. Go to **My Appointments**: the card reads **Awaiting doctor** with a **Severe** badge and a countdown of roughly **2 hours** (not 12 — severity drove the deadline).
4. Try to request a second doctor. It must be refused: one pending request at a time.

As the **doctor** (a second browser or a private window):
5. `/doctor-profile` exists and shows the clinic address. `/doctor-portal` shows **Patient Requests** above the queue, with the severe request first and a countdown.
6. Click **Decline** with a reason.

Back as the **patient**:
7. The card now shows **Declined** with the doctor's reason, and beneath it the **next-best doctor** — their rank, match score, response stats, and next open slot. Click **Request Dr. X**. No intake is redone.

As the **doctor**:
8. **Accept** the new request.

Back as the **patient**:
9. The card flips to **Accepted** with "Pay within 2h". Click **Pay ₦X** → Paystack → test card `4084 0840 8408 4081`, any future expiry, any CVV.
10. Return via `/payments/callback`, then **My Appointments**: the card is **Confirmed · Paid** and shows the **clinic address** with a working **Directions** link.

As the **doctor**:
11. The queue shows the consultation as Confirmed · Paid. (To exercise completion, temporarily move `scheduled_datetime` into the past in the DB.) Click **Consultation done**.

Back as the **patient**:
12. The card reads **Completed** and shows the **duration in minutes taken from the slot** — nobody typed it. **Leave feedback** is now available.

- [ ] **Step 5: Verify the expiry sweep**

Force a lapsed deadline and confirm the slot comes back:

```bash
cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system"
venv/bin/python -c "
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import Consultation, ConsultationStatus
from app.services.appointments import expire_stale
db = SessionLocal()
c = db.query(Consultation).filter(
    Consultation.status == ConsultationStatus.requested).first()
assert c, 'create a pending request in the UI first'
c.respond_by = datetime.utcnow() - timedelta(minutes=1)
db.commit()
print('expired:', expire_stale(db))
db.refresh(c)
print('status is now:', c.status.value)
"
```

Expected: `expired: 1` and `status is now: expired`. Reload the doctor's availability in the UI — the slot must be bookable again.

- [ ] **Step 6: Commit and push both branches**

```bash
cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system"
git push -u origin feature/appointment-lifecycle

cd "/home/shephard/Desktop/Work/Web Apps/medilink-frontend"
git push -u origin feature/appointment-lifecycle
```

---

## Self-Review

**Spec coverage.** Every section of the design maps to a task. State machine → Tasks 1, 4–7. Data model → Tasks 1–2. API → Tasks 4–9 (accept/decline/withdraw T5, payment gate T6, completion T7, next-best T8, `PUT /doctors/me` + inbox + slot modes T9). Frontend → Tasks 10–15 (types/api/format T10, patient card states + countdown T11, next-best block T12, request-not-book T13, doctor inbox T14, doctor profile + slot modes T15). Error handling → the concurrency lock (T4), the expired-accept guard (T5), the late-payment refund (T6), completion guards and cancel-by-state (T7), exhausted next-best (T8), slot-mode prerequisites (T9). Testing → Tasks 1–9 inline, plus the end-to-end walk in T16. The spec's "out of scope" items (notifications, mandatory outcome review, rescheduling, video hosting, the Redis cache-key bug) are correctly absent.

**Placeholders.** None. Every code step carries real code; every command carries its expected output. No "add error handling", no "similar to Task N".

**Type consistency.** `expire_stale(db) -> int` is defined in Task 3 and called identically in Tasks 4, 5, 6, 8, 9. `compute_respond_by(requested_at, severity, slot_start)` and `compute_pay_by(accepted_at, slot_start)` keep their signatures across Tasks 3, 4, 5. `recompute_doctor_stats(db, doctor)` likewise. `PENDING_STATES` (T4) and `_release_slot` (T5) live in the consultations router and are used by both. The backend's `NextBestOut` field names match the frontend's `NextBest` interface one-for-one (T8 ↔ T10), and `RequestOut` matches `DoctorRequest`. `statusTone`/`statusLabel`/`severityTone`/`formatCountdown`/`formatResponseTime` are defined once in T10 and consumed in T11, T12, T13, T14. `AvailabilityForm` gains `clinicAddress`/`meetingLink` props in T15 and both call sites are updated in the same task.

**One deliberate naming note.** The backend status is `scheduled`; the patient-facing label is **"Confirmed"** (via `statusLabel`). This is intentional — the enum is our vocabulary, not the user's — and is confined to one function so it cannot drift.
