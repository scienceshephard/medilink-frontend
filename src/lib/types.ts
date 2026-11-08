// Types mirror the Pydantic schemas in app/schemas/__init__.py

export type Role = "patient" | "doctor" | "admin" | "clinic";

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
  preferred_languages?: string[];
}

export interface PatientProfileUpdate {
  full_name?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string;
  preferred_languages?: string[];
  medical_history?: string[];
  chronic_conditions?: string[];
  current_medications?: string[];
  allergies?: string[];
  lifestyle_factors?: Record<string, unknown>;
  travel_km?: number;
  preferred_care_mode?: "home_visit" | "clinic" | "video";
  home_address?: string;
}

export interface PatientOut {
  id: number;
  full_name: string;
  email: string;
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone: string | null;
  preferred_languages: string[];
  date_of_birth: string | null;
  gender: string | null;
  medical_history: string[];
  chronic_conditions: string[];
  current_medications: string[];
  allergies: string[];
  lifestyle_factors: Record<string, unknown>;
  consultation_count: number;
  profile_completion_score: number;
  travel_km?: number | null;
  preferred_care_mode?: "home_visit" | "clinic" | "video" | null;
  home_address?: string | null;
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
  explanation: string;
}

export interface LatestRecommendation {
  created_at: string | null;
  cold_start: boolean;
  results: LatestRecommendationDoctor[];
  facility_results?: FacilityRecommendationItem[];
}

export interface DoctorRegister {
  full_name: string;
  email: string;
  password: string;
  phone?: string | null;
  location?: string | null;
  years_experience: number;
  qualifications?: string | null;
  licensing_authority?: string | null;
  license_number?: string | null;
  license_expiry?: string | null;
  bio?: string | null;
  languages: string[];
  consultation_fee: number;
  specialization_ids: number[];
}

export interface Specialization {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export interface DoctorOut {
  id: number;
  full_name: string;
  email: string;
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
  years_experience: number;
  languages: string[];
  average_rating: number;
  rating_count?: number;
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
  licensing_authority?: string | null;
  license_number?: string | null;
  license_expiry?: string | null;
  credentials_verified_at?: string | null;
  specialization_names?: string[];
}

export interface DoctorPublicOut {
  id: number;
  full_name: string;
  location: string | null;
  years_experience: number;
  languages: string[];
  average_rating: number;
  rating_count?: number;
  total_consultations: number;
  consultation_fee: number;
  bio: string | null;
  clinic_name?: string | null;
  clinic_address?: string | null;
  avg_response_minutes?: number | null;
  recommendation_acceptance_rate?: number;
  specialization_names?: string[];
  next_available_at?: string | null;
  payment_required?: boolean;
  is_demo?: boolean;
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
  rating_count?: number;
  years_experience: number;
  consultation_fee: number;
  is_available: boolean;
  location?: string | null;
  location_match?: boolean;
  distance_km?: number | null;
  next_available_at?: string | null;
  payment_required?: boolean;
  is_demo?: boolean;
}

export interface RecommendationResponse {
  recommendation_id: number;
  cold_start: boolean;
  weights: Record<string, number>;
  results: RecommendationItem[];
  facility_results?: FacilityRecommendationItem[];
  urgent_care?: boolean;
  urgent_care_message?: string | null;
  no_doctors_available?: boolean;
}

export interface FacilityRecommendationItem {
  facility_id: number;
  name: string;
  state: string;
  lga: string;
  ward?: string | null;
  facility_level?: string | null;
  facility_type?: string | null;
  ownership?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  services: string[];
  equipment: string[];
  capabilities_verified: boolean;
  source_name: string;
  listed_updated_at?: string | null;
  match_basis: string;
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

export type SlotMode = "in_person" | "video" | "home_visit";

export type Severity = "mild" | "moderate" | "severe";

export interface BookConsultation {
  doctor_id: number;
  slot_id: number;
  symptom_input?: string | null;
  recommendation_rank?: number | null;
  recommendation_id?: number | null;
  home_address?: string | null;
}

export interface ConsultationOut {
  id: number;
  patient_id: number;
  doctor_id: number;
  scheduled_datetime: string;
  status: string;
  symptom_input: string | null;
  clinical_notes?: string | null;
  patient_summary?: string | null;
  mode?: SlotMode;
  location?: string | null;
  meeting_link?: string | null;
  visit_status?: "en_route" | "arrived" | "done" | null;
  created_at: string;
}

export interface ConsultationSummary {
  id: number;
  doctor_id?: number;
  doctor_name?: string | null;
  patient_id?: number;
  scheduled_datetime: string;
  status: ConsultationStatus;
  symptom_input: string | null;
  clinical_notes?: string | null;
  payment_status?: "unpaid" | "pending" | "success" | "failed" | "refunded";
  amount?: number;
  // ── lifecycle (SP3) ──
  severity?: Severity | null;
  mode?: SlotMode;
  location?: string | null;
  meeting_link?: string | null;
  visit_status?: "en_route" | "arrived" | "done" | null;
  respond_by?: string | null;
  pay_by?: string | null;
  duration_minutes?: number | null;
  decline_reason?: string | null;
  feedback_submitted?: boolean;
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
  location?: string | null;
  requested_at: string;
  respond_by: string;
}

export interface DoctorProfileUpdate {
  full_name?: string;
  phone?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  bio?: string;
  qualifications?: string;
  licensing_authority?: string;
  license_number?: string;
  license_expiry?: string;
  languages?: string[];
  consultation_fee?: number;
  is_available?: boolean;
  clinic_name?: string;
  clinic_address?: string;
  default_meeting_link?: string;
  specialization_ids?: number[];
}

export interface UpdateConsultation {
  status?: string;
  clinical_notes?: string;
  patient_summary?: string;
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
  treatment_outcome?: "better" | "same" | "worse" | null;
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
  rating_count?: number;
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

export interface AdminAuditEntry {
  id: number;
  actor: string;
  action: string;
  target_type: string;
  target_id: string | null;
  summary: string;
  created_at: string;
}

export interface AdminAccessPolicy {
  configured_admin_email: string;
  admin_account_mode: string;
  supported_roles: string[];
  doctor_approval_required: boolean;
  role_management_available: boolean;
}

export interface MatchingSettings {
  top_n_recommendations: number;
  cold_start_threshold: number;
  cold_start_weights: { collaborative: number; symptom: number; profile: number };
  mature_weights: { collaborative: number; symptom: number; profile: number };
  low_symptom_similarity_threshold: number;
  primary_care_fallback: boolean;
  red_flag_screening: boolean;
  settings_source: string;
}

export interface RecommendationCoverage {
  recommendation_count: number;
  items: Array<{
    specialty: string;
    active_doctors: number;
    first_choice_count: number;
    recommended_count: number;
    first_choice_share: number;
  }>;
}

export interface FacilityDirectoryCoverage {
  facility_count: number;
  state_count: number;
  lga_count: number;
  coordinate_coverage: number;
  facilities_with_service_data: number;
  facilities_with_equipment_data: number;
  facilities_with_verified_capabilities: number;
  facility_level_counts: Record<string, number>;
  facility_recommendation_count: number;
  facility_exposure_count: number;
  distinct_facilities_recommended: number;
  top_first_choice_facilities: Array<{ facility_id: number; name: string; first_choice_count: number }>;
  interpretation: string;
}

export interface AdminFacility {
  id: number;
  name: string;
  state: string;
  lga: string;
  ward: string | null;
  facility_level: string | null;
  facility_type: string | null;
  ownership: string | null;
  services: string[];
  equipment: string[];
  capabilities_verified: boolean;
  capabilities_verified_at: string | null;
  capabilities_verified_by: string | null;
  capabilities_evidence: string | null;
  source_name: string;
  listed_updated_at: string | null;
}

export interface ModelStatus {
  cbf_fitted: boolean;
  cf_fitted: boolean;
  model_dir: string;
  cbf_doctors: number;
  cf_patients: number;
  cf_usable?: boolean;
  cbf_source?: string;
}

export interface PendingDoctor {
  id: number;
  name: string;
  email: string;
  qualifications: string | null;
  licensing_authority: string | null;
  license_number: string | null;
  license_expiry: string | null;
  credentials_complete: boolean;
}

export interface RetrainResult {
  message?: string;
  model_status: ModelStatus;
  [key: string]: unknown;
}

// ── Messaging ─────────────────────────────────────────────────────────────────
export interface Message {
  id: number;
  sender_role: "patient" | "doctor";
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface Conversation {
  patient_id: number;
  doctor_id: number;
  partner_name: string;
  partner_role: "patient" | "doctor";
  last_message: string;
  last_at: string;
  unread: number;
  consultation_id: number | null;
}

// ── Care plans ────────────────────────────────────────────────────────────────
export interface CarePlanStep {
  icon?: string;
  text: string;
}

export interface CarePlan {
  id: number;
  consultation_id: number;
  patient_id: number;
  doctor_id: number;
  doctor_name: string | null;
  patient_name: string | null;
  summary: string;
  steps: CarePlanStep[];
  follow_up: string | null;
  created_at: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export interface Notification {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

// ── Admin invites ─────────────────────────────────────────────────────────────
export interface AdminUser {
  id: number;
  email: string;
  role: "admin" | "reviewer";
  invited_by: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Doctor directory (admin) ──────────────────────────────────────────────────
export interface AdminDoctorRow {
  id: number;
  name: string;
  email: string;
  specializations: string[];
  location: string | null;
  verification_status: "pending" | "verified" | "suspended";
  is_demo: boolean;
  is_available: boolean;
  average_rating: number;
  total_consultations: number;
  created_at: string;
}

// ── Clinics ───────────────────────────────────────────────────────────────────
export interface ClinicOut {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  specialties_offered: string[];
  coverage_areas: string[];
  verification_status: "pending" | "verified" | "suspended";
  is_active: boolean;
  created_at: string;
}

export interface ClinicDoctor {
  id: number;
  doctor_id: number;
  doctor_name: string | null;
  specialization: string | null;
  role: "clinician" | "nurse";
  invite_pending: boolean;
  added_at: string;
}

export interface ClinicInvite {
  id: number;
  clinic_id: number;
  clinic_name: string;
  role: "clinician" | "nurse";
  added_at: string;
}

export interface ClinicRequest {
  id: number;
  patient_id: number;
  patient_name: string | null;
  symptom_input: string | null;
  severity: string | null;
  visit_mode: string;
  status: "new" | "assigned" | "done" | "withdrawn";
  assigned_doctor_id: number | null;
  assigned_doctor_name: string | null;
  note: string | null;
  created_at: string;
}

export interface ClinicRegister {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}
