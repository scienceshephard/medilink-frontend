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
  SymptomInput,
  Token,
  UpdateConsultation,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

const TOKEN_KEY = "medilink_token";
const ROLE_KEY = "medilink_role";

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  getRole(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ROLE_KEY);
  },
  set(token: string, role: string) {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(ROLE_KEY, role);
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(ROLE_KEY);
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
    throw new ApiError(
      0,
      `Cannot reach the API at ${API_BASE}. Is the backend running?`,
    );
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const detail =
      (data && (data.detail || data.message)) || res.statusText || "Request failed";
    throw new ApiError(
      res.status,
      typeof detail === "string" ? detail : JSON.stringify(detail),
    );
  }
  return data as T;
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
