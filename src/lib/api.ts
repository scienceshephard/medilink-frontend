import type {
  ActivityItem,
  AdminAuditEntry,
  AdminAccessPolicy,
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
  RecommendationCoverage,
  FacilityDirectoryCoverage,
  AdminFacility,
  MatchingSettings,
  RetrainResult,
  Specialization,
  SymptomInput,
  Token,
  UpdateConsultation,
  Message,
  Conversation,
  CarePlan,
  CarePlanStep,
  Notification,
  AdminUser,
  AdminDoctorRow,
  ClinicOut,
  ClinicDoctor,
  ClinicRequest,
  ClinicRegister,
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

type ReadResponse = { status: number; statusText: string; text: string };
const inFlightGets = new Map<string, Promise<ReadResponse>>();

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };
  // Content-Type is not needed on a bodyless GET. Sending application/json on
  // cross-origin public reads forces an avoidable CORS preflight round trip.
  if (rest.body !== undefined && !Object.keys(finalHeaders).some(
    (name) => name.toLowerCase() === "content-type",
  )) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = tokenStore.get();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const method = (rest.method || "GET").toUpperCase();
  let result: ReadResponse;
  try {
    const url = `${API_BASE}${path}`;
    if (method === "GET") {
      // React Strict Mode intentionally replays effects in development. Share
      // an in-flight GET between the first mount and its replay so a page does
      // not make duplicate backend requests while developing (or on fast
      // remounts in production). Cache the body text, not Response, because a
      // Response body can only be consumed once.
      const key = `${url}|${finalHeaders.Authorization || "anonymous"}`;
      let pending = inFlightGets.get(key);
      if (!pending) {
        pending = fetch(url, { ...rest, headers: finalHeaders }).then(async (res) => ({
          status: res.status,
          statusText: res.statusText,
          text: await res.text(),
        }));
        inFlightGets.set(key, pending);
        void pending.then(
          () => { if (inFlightGets.get(key) === pending) inFlightGets.delete(key); },
          () => { if (inFlightGets.get(key) === pending) inFlightGets.delete(key); },
        );
      }
      result = await pending;
    } else {
      const res = await fetch(url, { ...rest, headers: finalHeaders });
      result = { status: res.status, statusText: res.statusText, text: await res.text() };
    }
  } catch {
    // fetch() rejects with an opaque TypeError for every network-layer
    // failure — server down, mixed content, blocked CORS preflight — and the
    // spec deliberately hides which, so we infer what we can from the URLs.
    throw new ApiError(0, networkFailureMessage());
  }

  if (result.status === 204) return undefined as T;

  const data = result.text ? safeJson(result.text) : null;

  if (result.status < 200 || result.status >= 300) {
    // An expired or revoked token would otherwise leave the user inside a
    // logged-in-looking shell where every panel shows an error. Only act when
    // we actually sent a token — /auth/login answers 401 for bad credentials,
    // and bouncing that back to /login would swallow the error message.
    if (result.status === 401 && auth && tokenStore.get()) {
      tokenStore.clear();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    const detail =
      (data && (data.detail || data.message)) || result.statusText || "Request failed";
    throw new ApiError(
      result.status,
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
    registerClinic: (payload: ClinicRegister) =>
      request<Token>("/api/auth/register/clinic", {
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
    forgotPassword: (email: string) =>
      request<{ detail: string; reset_token?: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        auth: false,
      }),
    resetPassword: (token: string, new_password: string) =>
      request<{ detail: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password }),
        auth: false,
      }),
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
    setVisitStatus: (id: number, visit_status: "en_route" | "arrived" | "done") =>
      request<ConsultationOut>(`/api/consultations/${id}/visit-status`, {
        method: "POST",
        body: JSON.stringify({ visit_status }),
      }),
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
    auditLogs: (limit = 50, offset = 0) =>
      request<{ items: AdminAuditEntry[]; total: number; limit: number; offset: number }>(`/api/admin/audit-logs?limit=${limit}&offset=${offset}`),
    accessPolicy: () => request<AdminAccessPolicy>("/api/admin/access-policy"),
    modelStatus: () => request<ModelStatus>("/api/admin/model-status"),
    recommendationCoverage: () => request<RecommendationCoverage>("/api/admin/recommendation-coverage"),
    facilityDirectoryCoverage: () => request<FacilityDirectoryCoverage>("/api/admin/facility-directory-coverage"),
    facilities: (q = "") => request<{ items: AdminFacility[]; total: number; limit: number; offset: number }>(`/api/admin/facilities?limit=100${q ? `&q=${encodeURIComponent(q)}` : ""}`),
    verifyFacilityCapabilities: (id: number, payload: { services: string[]; equipment: string[]; evidence: string }) =>
      request<{ detail: string; facility_id: number }>(`/api/admin/facilities/${id}/capabilities`, { method: "PUT", body: JSON.stringify(payload) }),
    matchingSettings: () => request<MatchingSettings>("/api/admin/matching-settings"),
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
    rejectDoctor: (id: number, reason?: string) =>
      request<{ detail: string }>(`/api/admin/doctors/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason ?? null }),
      }),
    allDoctors: (status?: string) =>
      request<AdminDoctorRow[]>(`/api/admin/doctors${status ? `?status=${status}` : ""}`),
    admins: () => request<AdminUser[]>("/api/admin/admins"),
    inviteAdmin: (payload: { email: string; password: string; role: "admin" | "reviewer" }) =>
      request<AdminUser>("/api/admin/admins/invite", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  // ── Messages ──────────────────────────────────────────────────────────
  messages: {
    conversations: () => request<Conversation[]>("/api/messages/conversations"),
    thread: (partner: { patient_id?: number; doctor_id?: number }) => {
      const params = new URLSearchParams();
      if (partner.patient_id) params.set("patient_id", String(partner.patient_id));
      if (partner.doctor_id) params.set("doctor_id", String(partner.doctor_id));
      return request<Message[]>(`/api/messages/thread?${params}`);
    },
    send: (payload: { body: string; patient_id?: number; doctor_id?: number; consultation_id?: number }) =>
      request<Message>("/api/messages/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  // ── Notifications ─────────────────────────────────────────────────────
  notifications: {
    list: () => request<Notification[]>("/api/notifications/"),
    unreadCount: () => request<{ unread: number }>("/api/notifications/unread-count"),
    readAll: () => request<{ detail: string }>("/api/notifications/read-all", { method: "POST" }),
  },

  // ── Clinics ───────────────────────────────────────────────────────────
  clinics: {
    me: () => request<ClinicOut>("/api/clinics/me"),
    updateMe: (payload: Partial<ClinicOut>) =>
      request<ClinicOut>("/api/clinics/me", { method: "PUT", body: JSON.stringify(payload) }),
    team: () => request<ClinicDoctor[]>("/api/clinics/team"),
    invite: (payload: { doctor_email: string; role: "clinician" | "nurse" }) =>
      request<ClinicDoctor>("/api/clinics/team/invite", { method: "POST", body: JSON.stringify(payload) }),
    requests: (status?: string) =>
      request<ClinicRequest[]>(`/api/clinics/requests${status ? `?status=${status}` : ""}`),
    assign: (id: number, payload: { doctor_id: number; note?: string }) =>
      request<ClinicRequest>(`/api/clinics/requests/${id}/assign`, { method: "POST", body: JSON.stringify(payload) }),
  },

  // ── Care plans ────────────────────────────────────────────────────────
  carePlans: {
    mine: () => request<CarePlan[]>("/api/care-plans/me"),
    get: (id: number) => request<CarePlan>(`/api/care-plans/${id}`),
    create: (payload: { consultation_id: number; summary: string; steps: CarePlanStep[]; follow_up?: string }) =>
      request<CarePlan>("/api/care-plans/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
};
