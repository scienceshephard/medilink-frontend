// Types mirror the Pydantic schemas in app/schemas/__init__.py

export type Role = "patient" | "doctor" | "admin";

export interface Token {
  access_token: string;
  token_type: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PatientRegister {
  full_name: string;
  email: string;
  password: string;
  date_of_birth?: string | null;
  gender?: string | null;
  location?: string | null;
  phone?: string | null;
}

export interface PatientProfileUpdate {
  full_name?: string;
  location?: string;
  phone?: string;
  medical_history?: string[];
  chronic_conditions?: string[];
  current_medications?: string[];
  allergies?: string[];
  lifestyle_factors?: Record<string, unknown>;
}

export interface PatientOut {
  id: number;
  full_name: string;
  email: string;
  location: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  medical_history: string[];
  chronic_conditions: string[];
  current_medications: string[];
  allergies: string[];
  lifestyle_factors: Record<string, unknown>;
  consultation_count: number;
  profile_completion_score: number;
  created_at: string;
}

export interface ActivityItem {
  type: "symptom" | "booking" | "completed" | "feedback" | string;
  title: string;
  description: string | null;
  timestamp: string;
}

export interface LatestRecommendationDoctor {
  doctor_id: number;
  doctor_name: string;
  specialization: string;
  score: number;
}

export interface LatestRecommendation {
  created_at: string | null;
  cold_start: boolean;
  results: LatestRecommendationDoctor[];
}

export interface DoctorRegister {
  full_name: string;
  email: string;
  password: string;
  phone?: string | null;
  location?: string | null;
  years_experience: number;
  qualifications?: string | null;
  bio?: string | null;
  languages: string[];
  consultation_fee: number;
  specialization_ids: number[];
}

export interface DoctorOut {
  id: number;
  full_name: string;
  email: string;
  location: string | null;
  years_experience: number;
  languages: string[];
  average_rating: number;
  total_consultations: number;
  verification_status: string;
  is_available: boolean;
  consultation_fee: number;
  clinic_name?: string | null;
  clinic_address?: string | null;
  avg_response_minutes?: number | null;
  recommendation_acceptance_rate?: number;
  default_meeting_link?: string | null;
  bio?: string | null;
}

export interface DoctorPublicOut {
  id: number;
  full_name: string;
  location: string | null;
  years_experience: number;
  languages: string[];
  average_rating: number;
  total_consultations: number;
  consultation_fee: number;
  bio: string | null;
  clinic_name?: string | null;
  clinic_address?: string | null;
  avg_response_minutes?: number | null;
  recommendation_acceptance_rate?: number;
}

export interface SymptomInput {
  symptoms: string[];
  duration_days?: number | null;
  severity?: string | null;
  additional_notes?: string | null;
}

export interface RecommendationItem {
  doctor_id: number;
  doctor_name: string;
  specialization: string;
  score: number;
  explanation: string;
  average_rating: number;
  years_experience: number;
  consultation_fee: number;
  is_available: boolean;
}

export interface RecommendationResponse {
  recommendation_id: number;
  cold_start: boolean;
  weights: Record<string, number>;
  results: RecommendationItem[];
}

export type ConsultationStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "expired"
  | "withdrawn"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export type SlotMode = "in_person" | "video";

export type Severity = "mild" | "moderate" | "severe";

export interface BookConsultation {
  doctor_id: number;
  slot_id: number;
  symptom_input?: string | null;
  recommendation_rank?: number | null;
  recommendation_id?: number | null;
}

export interface ConsultationOut {
  id: number;
  patient_id: number;
  doctor_id: number;
  scheduled_datetime: string;
  status: string;
  symptom_input: string | null;
  created_at: string;
}

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

export interface UpdateConsultation {
  status?: string;
  clinical_notes?: string;
}

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

export interface FeedbackCreate {
  consultation_id: number;
  satisfaction_rating: number;
  free_text_comments?: string | null;
  implicit_signals?: Record<string, unknown> | null;
}

export interface FeedbackOut {
  id: number;
  consultation_id: number;
  satisfaction_rating: number;
  submitted_at: string;
}

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

export interface CancelResult {
  detail: string;
  status: string;
  refunded: boolean;
}

export interface DoctorMetrics {
  average_rating: number;
  total_consultations: number;
  recommendation_acceptance_rate: number;
}

export interface AdminStats {
  total_patients: number;
  total_doctors: number;
  total_consultations: number;
  pending_verifications: number;
  avg_recommendation_score: number;
  cold_start_rate: number;
}

export interface ModelStatus {
  cbf_fitted: boolean;
  cf_fitted: boolean;
  model_dir: string;
  cbf_doctors: number;
  cf_patients: number;
}

export interface PendingDoctor {
  id: number;
  name: string;
  email: string;
  qualifications: string | null;
}

export interface RetrainResult {
  model_status: ModelStatus;
  [key: string]: unknown;
}
