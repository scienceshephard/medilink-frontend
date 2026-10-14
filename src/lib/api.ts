import type {
  ActivityItem,
  AdminStats,
  AvailabilitySlotCreate,
  AvailabilitySlotOut,
  BookConsultation,
  CancelResult,
  LatestRecommendation,
  ConsultationOut,
  ConsultationSummary,
  DoctorMetrics,
  DoctorOut,
  DoctorProfileUpdate,
  DoctorPublicOut,
  DoctorRegister,
  DoctorRequest,
  FeedbackCreate,
  FeedbackOut,
  LoginRequest,
  ModelStatus,
  NextBest,
  PatientOut,
  PatientProfileUpdate,
  PatientRegister,
  PaymentInitOut,
  PaymentOut,
  PendingDoctor,
  RecommendationResponse,
  RetrainResult,
  Specialization,
  SymptomInput,
  Token,
  UpdateConsultation,
} from "./types";

/**
 * Base URL of the HPTRS backend — origin only, no trailing slash and no path
 * (every call below appends its own `/api/...` or `/health`).
 *
 * The NEXT_PUBLIC_ prefix is mandatory, not stylistic. This module runs in the
 * browser (see `tokenStore` below), and Next.js inlines ONLY `NEXT_PUBLIC_*`
 * variables into the client bundle. This previously read `NEXT_API_BASE_URL`,
 * which is `undefined` in the browser however it is configured — so every
 * deployed build silently fell back to localhost and failed with network
 * errors that read like a CORS problem.
 *
 * Inlined at BUILD time: changing it in a hosting dashboard requires a
 * redeploy, not a restart.
 */
const CONFIGURED_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(
  /\/+$/,
  "",
);

export const API_BASE = CONFIGURED_API_BASE || "http://localhost:8000";

if (!CONFIGURED_API_BASE && typeof window !== "undefined") {
  // Warn rather than fall back silently: the silent fallback is exactly what
  // hid the misconfiguration described above, because localhost is a plausible
  // value that fails only at request time.
  console.warn(
    `[medilink] NEXT_PUBLIC_API_BASE_URL is not set — using ${API_BASE}. ` +
      `A deployed build must set it at build time, then redeploy.`,
  );
}

const TOKEN_KEY = "medilink_token";
const ROLE_KEY = "medilink_role";
const LEGACY_TOKEN_KEY = "medilink_token";
const LEGACY_ROLE_KEY = "medilink_role";

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_ROLE_KEY);
    return window.sessionStorage.getItem(TOKEN_KEY);
  },
  getRole(): string | null {
    if (typeof window === "undefined") return null;
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_ROLE_KEY);
    return window.sessionStorage.getItem(ROLE_KEY);
  },
  set(token: string, role: string) {
    window.sessionStorage.setItem(TOKEN_KEY, token);
    window.sessionStorage.setItem(ROLE_KEY, role);
  },
  clear() {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(ROLE_KEY);
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_ROLE_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };
  if (auth) {
    const token = tokenStore.get();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...rest, headers: finalHeaders });
  } catch {
    // fetch() rejects with an opaque TypeError for every network-layer
    // failure — server down, mixed content, blocked CORS preflight — and the
    // spec deliberately hides which, so we infer what we can from the URLs.
    throw new ApiError(0, networkFailureMessage());
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    // An expired or revoked token would otherwise leave the user inside a
    // logged-in-looking shell where every panel shows an error. Only act when
    // we actually sent a token — /auth/login answers 401 for bad credentials,
    // and bouncing that back to /login would swallow the error message.
    if (res.status === 401 && auth && tokenStore.get()) {
      tokenStore.clear();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    const detail =
      (data && (data.detail || data.message)) || res.statusText || "Request failed";
    throw new ApiError(
      res.status,
      typeof detail === "string" ? detail : JSON.stringify(detail),
    );
  }
  return data as T;
}

function networkFailureMessage(): string {
  if (typeof window !== "undefined") {
    const pageIsSecure = window.location.protocol === "https:";
    const apiIsPlainHttp = API_BASE.startsWith("http://");
    // Browsers treat http://localhost and loopback as "potentially trustworthy"
    // origins, so those are exempt from mixed-content blocking even on HTTPS.
    const apiIsLoopback = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(
      API_BASE,
    );
    if (pageIsSecure && apiIsPlainHttp && !apiIsLoopback) {
      return (
        `This page is served over HTTPS but the API at ${API_BASE} is plain HTTP. ` +
        `Browsers block such requests as mixed content — the API must be served over HTTPS.`
      );
    }
  }
  return (
    `Cannot reach the API at ${API_BASE}. The server may be down or unreachable, ` +
    `or it may be rejecting this origin via CORS. Check the browser console for the underlying error.`
  );
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  // ── Health ────────────────────────────────────────────────────────────
  health: () =>
    request<{ status: string; version: string }>("/health", { auth: false }),

  // ── Auth ──────────────────────────────────────────────────────────────
  auth: {
    registerPatient: (payload: PatientRegister) =>
      request<Token>("/api/auth/register/patient", {
        method: "POST",
        body: JSON.stringify(payload),
        auth: false,
      }),
    registerDoctor: (payload: DoctorRegister) =>
      request<Token>("/api/auth/register/doctor", {
        method: "POST",
        body: JSON.stringify(payload),
        auth: false,
      }),
    login: (payload: LoginRequest) =>
      request<Token>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
        auth: false,
      }),
    logout: () => request<{ detail: string; revoked: boolean }>("/api/auth/logout", { method: "POST" }),
  },

  // ── Patients ──────────────────────────────────────────────────────────
  patients: {
    me: () => request<PatientOut>("/api/patients/me"),
    updateMe: (payload: PatientProfileUpdate) =>
      request<PatientOut>("/api/patients/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    recommend: (payload: SymptomInput) =>
      request<RecommendationResponse>("/api/patients/recommend", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    consultations: () =>
      request<ConsultationSummary[]>("/api/patients/consultations"),
    activity: () => request<ActivityItem[]>("/api/patients/me/activity"),
    latestRecommendation: () =>
      request<LatestRecommendation>("/api/patients/me/recommendations/latest"),
  },

  // ── Doctors ───────────────────────────────────────────────────────────
  doctors: {
    list: () => request<DoctorPublicOut[]>("/api/doctors/", { auth: false }),
    specializations: () => request<Specialization[]>("/api/doctors/specializations", { auth: false }),
    me: () => request<DoctorOut>("/api/doctors/me"),
    get: (id: number) =>
      request<DoctorPublicOut>(`/api/doctors/${id}`, { auth: false }),
    availability: (id: number) =>
      request<AvailabilitySlotOut[]>(`/api/doctors/${id}/availability`, {
        auth: false,
      }),
    addAvailability: (payload: AvailabilitySlotCreate) =>
      request<AvailabilitySlotOut>("/api/doctors/availability", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    myConsultations: () =>
      request<ConsultationSummary[]>("/api/doctors/me/consultations"),
    myMetrics: () => request<DoctorMetrics>("/api/doctors/me/metrics"),
    updateMe: (payload: DoctorProfileUpdate) =>
      request<DoctorOut>("/api/doctors/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    myRequests: () => request<DoctorRequest[]>("/api/doctors/me/requests"),
  },

  // ── Consultations ─────────────────────────────────────────────────────
  consultations: {
    book: (payload: BookConsultation) =>
      request<ConsultationOut>("/api/consultations/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    get: (id: number) => request<ConsultationOut>(`/api/consultations/${id}`),
    update: (id: number, payload: UpdateConsultation) =>
      request<{ detail: string }>(`/api/consultations/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    feedback: (payload: FeedbackCreate) =>
      request<FeedbackOut>("/api/consultations/feedback", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    cancel: (id: number) =>
      request<CancelResult>(`/api/consultations/${id}/cancel`, {
        method: "POST",
      }),
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
  },

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

  // ── Admin ─────────────────────────────────────────────────────────────
  admin: {
    stats: () => request<AdminStats>("/api/admin/stats"),
    modelStatus: () => request<ModelStatus>("/api/admin/model-status"),
    pendingDoctors: () =>
      request<PendingDoctor[]>("/api/admin/doctors/pending"),
    verifyDoctor: (id: number) =>
      request<{ detail: string }>(`/api/admin/doctors/${id}/verify`, {
        method: "POST",
      }),
    suspendDoctor: (id: number) =>
      request<{ detail: string }>(`/api/admin/doctors/${id}/suspend`, {
        method: "POST",
      }),
    retrain: (force = false) =>
      request<RetrainResult>(`/api/admin/retrain?force=${force}`, {
        method: "POST",
      }),
  },
};
