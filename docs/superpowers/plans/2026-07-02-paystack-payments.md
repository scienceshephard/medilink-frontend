# Paystack Book-Now-Pay-After Payments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let patients pay a doctor's consultation fee via Paystack after booking, with server-verified payment state surfaced in both patient and doctor views.

**Architecture:** Backend (FastAPI) gains a new `payments` table, a thin Paystack `httpx` client, and `initialize`/`verify`/`webhook` endpoints. Payment state lives entirely in the new table (no changes to existing tables), derived onto consultation responses via a join. Frontend (Next.js) adds a Pay button + payment badge in My Appointments and a `/payments/callback` page that verifies the transaction. The Paystack webhook is the source of truth; verify-on-callback is a fast confirmation. All Paystack keys stay server-side.

**Tech Stack:** FastAPI, SQLAlchemy, httpx, pytest (new), Next.js 14 App Router, TypeScript, Tailwind.

## Global Constraints

- Backend repo: `/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system`
- Frontend repo: `/home/shephard/Desktop/Work/Web Apps/medilink-frontend` (branch `feature/paystack-payments`)
- No new heavy dependencies: use `httpx` (present) for Paystack, `pytest`/`pytest-asyncio` (present in requirements) for tests. SQLite is used **only** for the test harness.
- Money: doctor `consultation_fee` is Naira (float). Paystack amounts are in **kobo** = `int(round(fee * 100))`.
- Currency string is always `"NGN"`.
- Payment statuses: `pending | success | failed | refunded`. Consultation-derived `payment_status` adds `unpaid` when no payment row exists.
- All development uses Paystack **test** keys (`sk_test_…`, `pk_test_…`) and test cards.
- Do not add columns to existing tables. Payment data lives only in the new `payments` table.
- Frontend has no test framework; verify frontend tasks with `npx tsc --noEmit` and/or `npm run build`.

---

## File Structure

**Backend (`hybrid-personalized-recommendation-system`):**
- `app/config.py` — MODIFY: add Paystack + frontend settings.
- `.env.example` — MODIFY: document new env vars.
- `app/models/__init__.py` — MODIFY: add `PaymentStatus` enum + `Payment` model.
- `app/schemas/__init__.py` — MODIFY: add payment schemas; extend consultation dicts are plain (no schema change needed there).
- `app/services/paystack.py` — CREATE: Paystack client (`initialize`, `verify`, `verify_signature`).
- `app/routers/payments.py` — CREATE: `/api/payments` router.
- `app/main.py` — MODIFY: register payments router.
- `app/routers/patients.py` — MODIFY: add `payment_status` + `amount` to consultation list.
- `app/routers/doctors.py` — MODIFY: add `payment_status` + `amount` to consultation list.
- `tests/conftest.py` — CREATE: SQLite test harness, client + auth fixtures.
- `tests/test_paystack_service.py` — CREATE.
- `tests/test_payments_router.py` — CREATE.
- `requirements.txt` — MODIFY: pin nothing new (all present); no change expected.

**Frontend (`medilink-frontend`):**
- `src/lib/types.ts` — MODIFY: payment types + consultation fields.
- `src/lib/api.ts` — MODIFY: `payments` group.
- `src/app/(app)/appointments/page.tsx` — MODIFY: Pay button + badge.
- `src/app/(app)/payments/callback/page.tsx` — CREATE: verify + result.
- `.env.local.example` — MODIFY: note backend Paystack requirement.

---

## Task 1: Backend config + env for Paystack

**Files:**
- Modify: `app/config.py`
- Modify: `.env.example`

**Interfaces:**
- Produces: `settings.PAYSTACK_SECRET_KEY`, `settings.PAYSTACK_PUBLIC_KEY`, `settings.PAYSTACK_BASE_URL`, `settings.FRONTEND_URL` (all `str`).

- [ ] **Step 1: Add settings fields**

In `app/config.py`, inside `class Settings`, after the `SECRET_KEY`/`ALGORITHM` block, add:

```python
    # Paystack
    PAYSTACK_SECRET_KEY: str = "sk_test_replace_me"
    PAYSTACK_PUBLIC_KEY: str = "pk_test_replace_me"
    PAYSTACK_BASE_URL: str = "https://api.paystack.co"

    # Frontend (for building Paystack callback URLs)
    FRONTEND_URL: str = "http://localhost:3000"
```

- [ ] **Step 2: Document env vars**

In `.env.example`, after the JWT block, add:

```bash
# Paystack (use test keys in development)
PAYSTACK_SECRET_KEY=sk_test_replace_me
PAYSTACK_PUBLIC_KEY=pk_test_replace_me
PAYSTACK_BASE_URL=https://api.paystack.co

# Frontend URL used to build the Paystack payment callback
FRONTEND_URL=http://localhost:3000
```

- [ ] **Step 3: Verify import still loads**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system" && python -c "from app.config import settings; print(settings.PAYSTACK_BASE_URL)"`
Expected: prints `https://api.paystack.co`

- [ ] **Step 4: Commit**

```bash
git add app/config.py .env.example
git commit -m "feat(payments): add Paystack config settings"
```

---

## Task 2: Payment model

**Files:**
- Modify: `app/models/__init__.py`

**Interfaces:**
- Produces: `PaymentStatus` enum (`pending|success|failed|refunded`); `Payment` model with columns
  `id, consultation_id (unique FK), patient_id, doctor_id, amount (Float), currency (String), status (Enum PaymentStatus), paystack_reference (String unique), authorization_url (Text), paid_at (DateTime), created_at, updated_at`.

- [ ] **Step 1: Add the enum**

In `app/models/__init__.py`, after `class ConsultationStatus`, add:

```python
class PaymentStatus(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"
    refunded = "refunded"
```

- [ ] **Step 2: Add the Payment model**

At the end of `app/models/__init__.py`, add:

```python
# ── Payments ──────────────────────────────────────────────────────────────────
class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), unique=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)

    amount = Column(Float, nullable=False)              # Naira
    currency = Column(String(3), default="NGN", nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)

    paystack_reference = Column(String(100), unique=True, index=True, nullable=False)
    authorization_url = Column(Text, nullable=True)
    paid_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

- [ ] **Step 3: Verify metadata builds**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system" && python -c "from app.models import Payment, PaymentStatus; print(Payment.__tablename__, [s.value for s in PaymentStatus])"`
Expected: prints `payments ['pending', 'success', 'failed', 'refunded']`

- [ ] **Step 4: Commit**

```bash
git add app/models/__init__.py
git commit -m "feat(payments): add Payment model and PaymentStatus enum"
```

---

## Task 3: Test harness (conftest)

**Files:**
- Create: `tests/conftest.py`
- Create: `tests/__init__.py` (empty)

**Interfaces:**
- Produces pytest fixtures: `db` (SQLAlchemy Session on SQLite), `client` (FastAPI `TestClient` with `get_db` overridden), `patient` (a persisted `Patient`), `doctor` (a persisted `Doctor` with `consultation_fee=5000.0`), `consultation` (a persisted scheduled `Consultation` linking them), `patient_auth` (dict `{"Authorization": "Bearer <token>"}`).

- [ ] **Step 1: Create the harness**

Create `tests/__init__.py` (empty file). Create `tests/conftest.py`:

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models import Patient, Doctor, Consultation
from app.core.security import create_access_token

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def patient(db):
    p = Patient(full_name="Test Patient", email="patient@test.com",
                hashed_password="x")
    db.add(p); db.commit(); db.refresh(p)
    return p


@pytest.fixture()
def doctor(db):
    d = Doctor(full_name="Dr Test", email="doctor@test.com",
               hashed_password="x", consultation_fee=5000.0)
    db.add(d); db.commit(); db.refresh(d)
    return d


@pytest.fixture()
def consultation(db, patient, doctor):
    from datetime import datetime
    c = Consultation(patient_id=patient.id, doctor_id=doctor.id,
                     scheduled_datetime=datetime(2026, 8, 1, 10, 0))
    db.add(c); db.commit(); db.refresh(c)
    return c


@pytest.fixture()
def patient_auth(patient):
    token = create_access_token({"sub": str(patient.id), "role": "patient"})
    return {"Authorization": f"Bearer {token}"}
```

- [ ] **Step 2: Verify collection works (no tests yet)**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system" && python -m pytest tests/ --collect-only -q`
Expected: exits cleanly with "no tests ran" (0 collected), no import errors.

- [ ] **Step 3: Commit**

```bash
git add tests/__init__.py tests/conftest.py
git commit -m "test(payments): add pytest harness with SQLite + auth fixtures"
```

---

## Task 4: Paystack service client

**Files:**
- Create: `app/services/paystack.py`
- Create: `tests/test_paystack_service.py`

**Interfaces:**
- Produces:
  - `initialize(email: str, amount_kobo: int, reference: str, callback_url: str, metadata: dict) -> dict` — returns Paystack `data` dict containing `authorization_url` and `reference`.
  - `verify(reference: str) -> dict` — returns Paystack `data` dict (contains `status`, `amount`).
  - `verify_signature(raw_body: bytes, signature: str) -> bool` — HMAC-SHA512 of body with `PAYSTACK_SECRET_KEY`.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_paystack_service.py`:

```python
import hashlib
import hmac
import httpx
import pytest

from app.services import paystack
from app.config import settings


def test_verify_signature_accepts_valid(monkeypatch):
    monkeypatch.setattr(settings, "PAYSTACK_SECRET_KEY", "sk_test_abc")
    body = b'{"event":"charge.success"}'
    sig = hmac.new(b"sk_test_abc", body, hashlib.sha512).hexdigest()
    assert paystack.verify_signature(body, sig) is True


def test_verify_signature_rejects_invalid(monkeypatch):
    monkeypatch.setattr(settings, "PAYSTACK_SECRET_KEY", "sk_test_abc")
    assert paystack.verify_signature(b'{"x":1}', "deadbeef") is False


def test_initialize_posts_and_returns_data(monkeypatch):
    captured = {}

    def fake_post(url, json=None, headers=None, timeout=None):
        captured["url"] = url
        captured["json"] = json
        return httpx.Response(
            200,
            json={"status": True,
                  "data": {"authorization_url": "https://paystack/x",
                           "reference": "ref123"}},
        )

    monkeypatch.setattr(paystack.httpx, "post", fake_post)
    data = paystack.initialize("a@b.com", 500000, "ref123",
                               "http://cb", {"consultation_id": 1})
    assert data["authorization_url"] == "https://paystack/x"
    assert captured["json"]["amount"] == 500000
    assert captured["json"]["reference"] == "ref123"


def test_verify_gets_and_returns_data(monkeypatch):
    def fake_get(url, headers=None, timeout=None):
        return httpx.Response(200, json={"status": True,
                                         "data": {"status": "success",
                                                  "amount": 500000}})

    monkeypatch.setattr(paystack.httpx, "get", fake_get)
    data = paystack.verify("ref123")
    assert data["status"] == "success"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system" && python -m pytest tests/test_paystack_service.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.paystack'`

- [ ] **Step 3: Implement the client**

Create `app/services/paystack.py`:

```python
import hashlib
import hmac
import httpx
from app.config import settings


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }


def initialize(email: str, amount_kobo: int, reference: str,
               callback_url: str, metadata: dict) -> dict:
    """Initialize a Paystack transaction. Returns the `data` object."""
    resp = httpx.post(
        f"{settings.PAYSTACK_BASE_URL}/transaction/initialize",
        json={
            "email": email,
            "amount": amount_kobo,
            "reference": reference,
            "callback_url": callback_url,
            "currency": "NGN",
            "metadata": metadata,
        },
        headers=_headers(),
        timeout=20.0,
    )
    resp.raise_for_status()
    payload = resp.json()
    if not payload.get("status"):
        raise RuntimeError(payload.get("message", "Paystack initialize failed"))
    return payload["data"]


def verify(reference: str) -> dict:
    """Verify a Paystack transaction. Returns the `data` object."""
    resp = httpx.get(
        f"{settings.PAYSTACK_BASE_URL}/transaction/verify/{reference}",
        headers=_headers(),
        timeout=20.0,
    )
    resp.raise_for_status()
    payload = resp.json()
    if not payload.get("status"):
        raise RuntimeError(payload.get("message", "Paystack verify failed"))
    return payload["data"]


def verify_signature(raw_body: bytes, signature: str) -> bool:
    """Validate a Paystack webhook signature (HMAC-SHA512)."""
    if not signature:
        return False
    expected = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode(),
        raw_body,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system" && python -m pytest tests/test_paystack_service.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add app/services/paystack.py tests/test_paystack_service.py
git commit -m "feat(payments): add Paystack service client with tests"
```

---

## Task 5: Payment schemas

**Files:**
- Modify: `app/schemas/__init__.py`

**Interfaces:**
- Produces: `PaymentInitiate { consultation_id: int }`, `PaymentInitOut { authorization_url: str, reference: str }`, `PaymentOut { status: str, amount: float, currency: str, reference: str, paid_at: Optional[datetime] }`.

- [ ] **Step 1: Add schemas**

In `app/schemas/__init__.py`, after the `FeedbackOut` class, add:

```python
# ── Payments ──────────────────────────────────────────────────────────────────
class PaymentInitiate(BaseModel):
    consultation_id: int

class PaymentInitOut(BaseModel):
    authorization_url: str
    reference: str

class PaymentOut(BaseModel):
    status: str
    amount: float
    currency: str
    reference: str
    paid_at: Optional[datetime] = None
```

- [ ] **Step 2: Verify import**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system" && python -c "from app.schemas import PaymentInitiate, PaymentInitOut, PaymentOut; print('ok')"`
Expected: prints `ok`

- [ ] **Step 3: Commit**

```bash
git add app/schemas/__init__.py
git commit -m "feat(payments): add payment request/response schemas"
```

---

## Task 6: Payments router (initialize / verify / webhook)

**Files:**
- Create: `app/routers/payments.py`
- Modify: `app/main.py`
- Create: `tests/test_payments_router.py`

**Interfaces:**
- Consumes: `app.services.paystack` (`initialize`, `verify`, `verify_signature`); schemas from Task 5; `require_patient`, `get_db`; `Payment`, `PaymentStatus`, `Consultation`, `Doctor` models.
- Produces routes on `prefix="/api/payments"`:
  - `POST /initialize` (patient) → `PaymentInitOut`
  - `GET /verify/{reference}` (patient) → `PaymentOut`
  - `POST /webhook` → `{"status": "ok"}`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_payments_router.py`:

```python
import hashlib
import hmac
import json

from app.config import settings
from app.models import Payment, PaymentStatus
from app.routers import payments as payments_router


def test_initialize_creates_pending_payment(client, db, consultation,
                                             patient_auth, monkeypatch):
    def fake_initialize(email, amount_kobo, reference, callback_url, metadata):
        assert amount_kobo == 500000  # 5000 NGN * 100
        return {"authorization_url": "https://paystack/pay", "reference": reference}

    monkeypatch.setattr(payments_router.paystack, "initialize", fake_initialize)

    res = client.post("/api/payments/initialize",
                      json={"consultation_id": consultation.id},
                      headers=patient_auth)
    assert res.status_code == 200
    assert res.json()["authorization_url"] == "https://paystack/pay"

    pay = db.query(Payment).filter(Payment.consultation_id == consultation.id).first()
    assert pay is not None
    assert pay.status == PaymentStatus.pending
    assert pay.amount == 5000.0


def test_initialize_rejects_when_already_paid(client, db, consultation,
                                              patient_auth, monkeypatch):
    db.add(Payment(consultation_id=consultation.id, patient_id=consultation.patient_id,
                   doctor_id=consultation.doctor_id, amount=5000.0, currency="NGN",
                   status=PaymentStatus.success, paystack_reference="ref-old"))
    db.commit()

    res = client.post("/api/payments/initialize",
                      json={"consultation_id": consultation.id},
                      headers=patient_auth)
    assert res.status_code == 409


def test_verify_marks_success(client, db, consultation, patient_auth, monkeypatch):
    db.add(Payment(consultation_id=consultation.id, patient_id=consultation.patient_id,
                   doctor_id=consultation.doctor_id, amount=5000.0, currency="NGN",
                   status=PaymentStatus.pending, paystack_reference="ref-v"))
    db.commit()

    monkeypatch.setattr(payments_router.paystack, "verify",
                        lambda ref: {"status": "success", "amount": 500000})

    res = client.get("/api/payments/verify/ref-v", headers=patient_auth)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    pay = db.query(Payment).filter(Payment.paystack_reference == "ref-v").first()
    assert pay.status == PaymentStatus.success
    assert pay.paid_at is not None


def test_webhook_rejects_bad_signature(client):
    res = client.post("/api/payments/webhook",
                      content=b'{"event":"charge.success"}',
                      headers={"x-paystack-signature": "bad"})
    assert res.status_code == 400


def test_webhook_marks_success_idempotently(client, db, consultation, monkeypatch):
    db.add(Payment(consultation_id=consultation.id, patient_id=consultation.patient_id,
                   doctor_id=consultation.doctor_id, amount=5000.0, currency="NGN",
                   status=PaymentStatus.pending, paystack_reference="ref-wh"))
    db.commit()
    monkeypatch.setattr(settings, "PAYSTACK_SECRET_KEY", "sk_test_wh")

    body = json.dumps({"event": "charge.success",
                       "data": {"reference": "ref-wh", "status": "success"}}).encode()
    sig = hmac.new(b"sk_test_wh", body, hashlib.sha512).hexdigest()

    for _ in range(2):  # idempotent
        res = client.post("/api/payments/webhook", content=body,
                          headers={"x-paystack-signature": sig})
        assert res.status_code == 200

    pay = db.query(Payment).filter(Payment.paystack_reference == "ref-wh").first()
    assert pay.status == PaymentStatus.success
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system" && python -m pytest tests/test_payments_router.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.routers.payments'`

- [ ] **Step 3: Implement the router**

Create `app/routers/payments.py`:

```python
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import Payment, PaymentStatus, Consultation, Doctor, Patient
from app.schemas import PaymentInitiate, PaymentInitOut, PaymentOut
from app.core.security import require_patient
from app.services import paystack

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/initialize", response_model=PaymentInitOut)
def initialize_payment(
    payload: PaymentInitiate,
    patient: Patient = Depends(require_patient),
    db: Session = Depends(get_db),
):
    consult = db.query(Consultation).filter(
        Consultation.id == payload.consultation_id,
        Consultation.patient_id == patient.id,
    ).first()
    if not consult:
        raise HTTPException(status_code=404, detail="Consultation not found")

    existing = db.query(Payment).filter(
        Payment.consultation_id == consult.id
    ).first()
    if existing and existing.status == PaymentStatus.success:
        raise HTTPException(status_code=409, detail="Consultation already paid")

    doctor = db.query(Doctor).filter(Doctor.id == consult.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    amount = float(doctor.consultation_fee or 0.0)
    reference = f"medilink-{consult.id}-{uuid.uuid4().hex[:12]}"
    callback_url = f"{settings.FRONTEND_URL}/payments/callback"

    try:
        data = paystack.initialize(
            email=patient.email,
            amount_kobo=int(round(amount * 100)),
            reference=reference,
            callback_url=callback_url,
            metadata={"consultation_id": consult.id,
                      "patient_id": patient.id,
                      "doctor_id": doctor.id},
        )
    except Exception as exc:  # network / Paystack failure
        raise HTTPException(status_code=502,
                            detail=f"Payment provider error: {exc}")

    if existing:
        existing.amount = amount
        existing.paystack_reference = reference
        existing.authorization_url = data["authorization_url"]
        existing.status = PaymentStatus.pending
    else:
        db.add(Payment(
            consultation_id=consult.id,
            patient_id=patient.id,
            doctor_id=doctor.id,
            amount=amount,
            currency="NGN",
            status=PaymentStatus.pending,
            paystack_reference=reference,
            authorization_url=data["authorization_url"],
        ))
    db.commit()

    return PaymentInitOut(authorization_url=data["authorization_url"],
                          reference=reference)


def _mark_success(db: Session, pay: Payment) -> None:
    if pay.status != PaymentStatus.success:
        pay.status = PaymentStatus.success
        pay.paid_at = datetime.utcnow()
        db.commit()


@router.get("/verify/{reference}", response_model=PaymentOut)
def verify_payment(
    reference: str,
    patient: Patient = Depends(require_patient),
    db: Session = Depends(get_db),
):
    pay = db.query(Payment).filter(
        Payment.paystack_reference == reference,
        Payment.patient_id == patient.id,
    ).first()
    if not pay:
        raise HTTPException(status_code=404, detail="Payment not found")

    try:
        data = paystack.verify(reference)
    except Exception as exc:
        raise HTTPException(status_code=502,
                            detail=f"Payment provider error: {exc}")

    if data.get("status") == "success":
        _mark_success(db, pay)
    elif pay.status != PaymentStatus.success:
        pay.status = PaymentStatus.failed
        db.commit()

    return PaymentOut(status=pay.status.value, amount=pay.amount,
                      currency=pay.currency, reference=pay.paystack_reference,
                      paid_at=pay.paid_at)


@router.post("/webhook")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    signature = request.headers.get("x-paystack-signature", "")
    if not paystack.verify_signature(raw, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    import json
    event = json.loads(raw or b"{}")
    if event.get("event") == "charge.success":
        reference = event.get("data", {}).get("reference")
        pay = db.query(Payment).filter(
            Payment.paystack_reference == reference
        ).first()
        if pay:
            _mark_success(db, pay)

    return {"status": "ok"}
```

- [ ] **Step 4: Register the router**

In `app/main.py`, update the import line and add the include. Change:

```python
from app.routers import auth, patients, doctors, consultations, admin
```
to:
```python
from app.routers import auth, patients, doctors, consultations, admin, payments
```

And after `app.include_router(admin.router)` add:

```python
app.include_router(payments.router)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system" && python -m pytest tests/test_payments_router.py -v`
Expected: 5 passed

- [ ] **Step 6: Commit**

```bash
git add app/routers/payments.py app/main.py tests/test_payments_router.py
git commit -m "feat(payments): add initialize/verify/webhook endpoints with tests"
```

---

## Task 7: Surface payment_status on consultation lists

**Files:**
- Modify: `app/routers/patients.py:49-64`
- Modify: `app/routers/doctors.py:58-71`
- Modify: `tests/test_payments_router.py` (add a coverage test)

**Interfaces:**
- Consumes: `Payment`, `PaymentStatus` models.
- Produces: each consultation dict in `GET /api/patients/consultations` and `GET /api/doctors/me/consultations` gains `"payment_status"` (str: `unpaid|pending|success|failed|refunded`) and `"amount"` (float, the payment amount if a payment row exists, else the doctor's `consultation_fee`).

- [ ] **Step 1: Write the failing test**

Append to `tests/test_payments_router.py`:

```python
def test_patient_consultations_include_payment_status(client, db, consultation,
                                                      patient_auth):
    db.add(Payment(consultation_id=consultation.id, patient_id=consultation.patient_id,
                   doctor_id=consultation.doctor_id, amount=5000.0, currency="NGN",
                   status=PaymentStatus.success, paystack_reference="ref-list"))
    db.commit()

    res = client.get("/api/patients/consultations", headers=patient_auth)
    assert res.status_code == 200
    row = res.json()[0]
    assert row["payment_status"] == "success"
    assert row["amount"] == 5000.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system" && python -m pytest tests/test_payments_router.py::test_patient_consultations_include_payment_status -v`
Expected: FAIL — `KeyError: 'payment_status'`

- [ ] **Step 3: Add a shared helper and use it in patients router**

In `app/routers/patients.py`, add near the top-level imports:

```python
from app.models import Payment, Doctor
```

(keep existing imports; add any missing names). Replace the list-comprehension return in `get_my_consultations` (lines 55-64) with:

```python
    fees = {d.id: d.consultation_fee for d in db.query(Doctor).all()}
    pays = {p.consultation_id: p for p in db.query(Payment).all()}
    result = []
    for c in consults:
        p = pays.get(c.id)
        result.append({
            "id": c.id,
            "doctor_id": c.doctor_id,
            "scheduled_datetime": c.scheduled_datetime,
            "status": c.status,
            "symptom_input": c.symptom_input,
            "payment_status": p.status.value if p else "unpaid",
            "amount": p.amount if p else fees.get(c.doctor_id, 0.0),
        })
    return result
```

- [ ] **Step 4: Mirror it in doctors router**

In `app/routers/doctors.py`, inside `my_consultations`, extend the existing `from app.models import Consultation` line to `from app.models import Consultation, Payment` and replace the return with:

```python
    pays = {p.consultation_id: p for p in db.query(Payment).all()}
    result = []
    for c in consults:
        p = pays.get(c.id)
        result.append({
            "id": c.id,
            "patient_id": c.patient_id,
            "scheduled_datetime": c.scheduled_datetime,
            "status": c.status,
            "symptom_input": c.symptom_input,
            "payment_status": p.status.value if p else "unpaid",
            "amount": p.amount if p else float(doctor.consultation_fee or 0.0),
        })
    return result
```

- [ ] **Step 5: Run the full backend suite**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/hybrid-personalized-recommendation-system" && python -m pytest tests/ -v`
Expected: all tests pass (11 total).

- [ ] **Step 6: Commit**

```bash
git add app/routers/patients.py app/routers/doctors.py tests/test_payments_router.py
git commit -m "feat(payments): expose payment_status + amount on consultation lists"
```

---

## Task 8: Frontend types + API client

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/api.ts`

**Interfaces:**
- Produces: `PaymentInitOut`, `PaymentOut` types; `ConsultationSummary`/`ConsultationOut` gain optional `payment_status?: string` and `amount?: number`; `api.payments.initialize(consultationId)` and `api.payments.verify(reference)`.

- [ ] **Step 1: Add types**

In `src/lib/types.ts`, add to `ConsultationSummary` (after `symptom_input`):

```typescript
  payment_status?: "unpaid" | "pending" | "success" | "failed" | "refunded";
  amount?: number;
```

And append two new interfaces after `FeedbackOut`:

```typescript
export interface PaymentInitOut {
  authorization_url: string;
  reference: string;
}

export interface PaymentOut {
  status: "unpaid" | "pending" | "success" | "failed" | "refunded";
  amount: number;
  currency: string;
  reference: string;
  paid_at: string | null;
}
```

- [ ] **Step 2: Add the API group**

In `src/lib/api.ts`, add `PaymentInitOut, PaymentOut` to the type imports from `"./types"`. Then, after the `consultations` group (before `admin`), add:

```typescript
  // ── Payments ──────────────────────────────────────────────────────────
  payments: {
    initialize: (consultationId: number) =>
      request<PaymentInitOut>("/api/payments/initialize", {
        method: "POST",
        body: JSON.stringify({ consultation_id: consultationId }),
      }),
    verify: (reference: string) =>
      request<PaymentOut>(`/api/payments/verify/${reference}`),
  },
```

- [ ] **Step 3: Typecheck**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/medilink-frontend" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/api.ts
git commit -m "feat(payments): add payment types and API client group"
```

---

## Task 9: Pay button + payment badge in My Appointments

**Files:**
- Modify: `src/app/(app)/appointments/page.tsx`

**Interfaces:**
- Consumes: `api.payments.initialize`, `ConsultationSummary.payment_status`, `ConsultationSummary.amount`, `formatNaira`.

- [ ] **Step 1: Add payment handler + imports**

In `src/app/(app)/appointments/page.tsx`, add `formatNaira` to the existing import from `@/lib/format`, and import `ApiError`:

```typescript
import { api, ApiError } from "@/lib/api";
```

Inside the component, add state and a handler (after the `feedbackId` state):

```typescript
  const [payingId, setPayingId] = useState<number | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  async function handlePay(consultId: number) {
    setPayingId(consultId);
    setPayError(null);
    try {
      const { authorization_url } = await api.payments.initialize(consultId);
      window.location.href = authorization_url;
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "Could not start payment.");
      setPayingId(null);
    }
  }
```

- [ ] **Step 2: Render badge + Pay button**

In the appointment card's actions area, alongside the existing "Leave feedback" block, add a payment badge under the status badge and a Pay button. Inside the info block, after the `StatusBadge`, add:

```tsx
                      {c.payment_status && c.payment_status !== "unpaid" ? (
                        <StatusBadge tone={c.payment_status === "success" ? "success" : c.payment_status === "failed" ? "error" : "neutral"}>
                          {c.payment_status === "success" ? "Paid" : "Payment " + c.payment_status}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">Payment due</StatusBadge>
                      )}
```

And in the actions area (the `shrink-0` block), before/alongside the feedback button, add:

```tsx
                  {c.status !== "cancelled" && c.payment_status !== "success" && (
                    <div className="shrink-0">
                      <Button
                        variant="primary"
                        loading={payingId === c.id}
                        onClick={() => handlePay(c.id)}
                      >
                        <Icon name="payments" className="text-base" />
                        Pay {c.amount != null ? formatNaira(c.amount) : ""}
                      </Button>
                    </div>
                  )}
```

- [ ] **Step 3: Show pay error (if any)**

Above the appointments list (near the header), add:

```tsx
      {payError && (
        <p className="mb-4 rounded-xl border border-error-container bg-error-container px-5 py-3 text-body-md text-on-error-container">
          {payError}
        </p>
      )}
```

- [ ] **Step 4: Typecheck + build**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/medilink-frontend" && npx tsc --noEmit`
Expected: no errors. (`StatusBadge` tone values `success`/`warning` already exist — confirm by reading `src/components/ui/StatusBadge.tsx`; if the prop names differ, match them.)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/appointments/page.tsx"
git commit -m "feat(payments): add Pay button and payment badge to appointments"
```

---

## Task 10: Payment callback page

**Files:**
- Create: `src/app/(app)/payments/callback/page.tsx`

**Interfaces:**
- Consumes: `api.payments.verify`, `useSearchParams`, UI components (`Card`, `Button`, `Icon`, `Loader`).

- [ ] **Step 1: Create the callback page**

Create `src/app/(app)/payments/callback/page.tsx`:

```tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { formatNaira } from "@/lib/format";
import type { PaymentOut } from "@/lib/types";

function CallbackInner() {
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");

  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [payment, setPayment] = useState<PaymentOut | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!reference) {
      setState("error");
      setMessage("Missing payment reference.");
      return;
    }
    api.payments
      .verify(reference)
      .then((p) => {
        setPayment(p);
        setState("done");
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof ApiError ? err.message : "Verification failed.");
      });
  }, [reference]);

  const ok = payment?.status === "success";

  return (
    <div className="mx-auto max-w-md">
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        {state === "loading" ? (
          <>
            <Loader />
            <p className="text-body-md text-on-surface-variant">Confirming your payment…</p>
          </>
        ) : state === "error" ? (
          <>
            <Icon name="error" className="text-[48px] text-error" />
            <h1 className="text-headline-md text-on-surface">Payment not confirmed</h1>
            <p className="text-body-md text-on-surface-variant">{message}</p>
          </>
        ) : (
          <>
            <Icon
              name={ok ? "check_circle" : "cancel"}
              fill
              className={`text-[48px] ${ok ? "text-secondary" : "text-error"}`}
            />
            <h1 className="text-headline-md text-on-surface">
              {ok ? "Payment successful" : "Payment not completed"}
            </h1>
            {payment && (
              <p className="text-body-md text-on-surface-variant">
                {ok
                  ? `You paid ${formatNaira(payment.amount)}. Your appointment is confirmed.`
                  : `Status: ${payment.status}.`}
              </p>
            )}
          </>
        )}

        <Link href="/appointments" className="mt-2 w-full">
          <Button full variant={ok ? "primary" : "outline"}>
            <Icon name="calendar_month" className="text-base" />
            Go to My Appointments
          </Button>
        </Link>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md p-8 text-center"><Loader /></div>}>
      <CallbackInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `cd "/home/shephard/Desktop/Work/Web Apps/medilink-frontend" && npx tsc --noEmit && npm run build`
Expected: typecheck clean; build succeeds and lists `/payments/callback` as a route. (If `Loader` export name differs, check `src/components/ui/index.ts` and adjust the import.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/payments/callback/page.tsx"
git commit -m "feat(payments): add Paystack callback verification page"
```

---

## Task 11: Env docs + manual end-to-end verification

**Files:**
- Modify: `.env.local.example` (frontend)

**Interfaces:** none (documentation + manual test).

- [ ] **Step 1: Document the payment dependency**

In `medilink-frontend/.env.local.example`, append:

```bash
# Payments are handled by the backend via Paystack. Ensure the backend has
# PAYSTACK_SECRET_KEY / PAYSTACK_PUBLIC_KEY set (test keys in development) and
# FRONTEND_URL pointing at this app so the payment callback returns here.
```

- [ ] **Step 2: Manual end-to-end test (Paystack test mode)**

With backend running (`uvicorn app.main:app --reload`) using **test** Paystack keys, and frontend (`npm run dev`):
1. Log in as a patient, book a consultation with a doctor that has a non-zero fee.
2. Go to **My Appointments** → the booking shows **"Payment due"** and a **Pay ₦X** button.
3. Click Pay → redirected to Paystack checkout → pay with test card `4084 0840 8408 4081`, any future expiry, any CVV.
4. Redirected to `/payments/callback` → shows **Payment successful**.
5. Back on **My Appointments**, the badge now reads **Paid**.
6. Log in as the doctor → the consultation appears in the queue with payment status.
7. Regression: confirm booking still marks the slot booked and the doctor sees the consult (existing flow unaffected).

- [ ] **Step 3: Commit**

```bash
git add .env.local.example
git commit -m "docs(payments): note backend Paystack env requirement"
```

---

## Self-Review notes

- **Spec coverage:** new `payments` table (T2), Paystack service (T4), initialize/verify/webhook (T6), schemas (T5), config/env (T1), derived `payment_status`+`amount` (T7), frontend api+types (T8), Pay button+badge (T9), callback page (T10), env docs + manual E2E incl. regression (T11). All spec sections covered.
- **No new columns on existing tables** — payment state is join-derived (T7). ✓
- **Idempotency** — `_mark_success` guards on current status; verify and webhook both converge (T6). ✓
- **Type consistency** — `payment_status` string values match between backend (`PaymentStatus.value` / `"unpaid"`) and frontend union type (T7/T8). `PaymentInitOut`/`PaymentOut` fields identical across schemas (T5) and TS types (T8).
