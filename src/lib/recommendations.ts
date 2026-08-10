import { api } from "./api";
import type { RecommendationItem, RecommendationResponse } from "./types";

export const RECOMMENDATION_KEY = "telemed:lastRecommendation";

/**
 * Sentinel `recommendation_id` for a list rebuilt from the server.
 *
 * `GET /me/recommendations/latest` does not return the recommendation's id, so
 * a rebuilt list cannot carry booking attribution. Booking already treats a
 * missing `medilink:recommendationId` as `null` (see doctors/[id]/book), so the
 * only consequence is that the visit is not linked back to the ranked list.
 */
export const REBUILT_RECOMMENDATION_ID = 0;

function fromSession(): RecommendationResponse | null {
  try {
    const raw = sessionStorage.getItem(RECOMMENDATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecommendationResponse;
    return parsed?.results?.length ? parsed : null;
  } catch {
    return null; // malformed JSON — treat as absent
  }
}

/**
 * Rebuild the recommendation from the server for a tab that never ran intake.
 *
 * `LatestRecommendation` is a thinner shape than the one `POST /recommend`
 * returns — it lacks the rating, fee and experience the match cards render — so
 * enrich each entry from the public doctor directory. The explanation does come
 * back from the server and is passed straight through.
 */
async function fromServer(): Promise<RecommendationResponse | null> {
  const [latest, doctors] = await Promise.all([
    api.patients.latestRecommendation(),
    api.doctors.list(),
  ]);
  if (!latest?.results?.length) return null;

  const byId = new Map(doctors.map((d) => [d.id, d]));
  const results: RecommendationItem[] = latest.results.map((r) => {
    const doc = byId.get(r.doctor_id);
    return {
      doctor_id: r.doctor_id,
      doctor_name: r.doctor_name,
      specialization: r.specialization,
      score: r.score,
      // The server now persists the per-doctor explanation, so a rebuilt list
      // keeps its rationale. Recommendations logged before that change have no
      // stored explanation and fall back to "", which the cards treat as absent.
      explanation: r.explanation ?? "",
      average_rating: doc?.average_rating ?? 0,
      years_experience: doc?.years_experience ?? 0,
      consultation_fee: doc?.consultation_fee ?? 0,
      // Availability is not exposed on the public doctor payload. Claiming
      // "free today" without knowing would be a fabrication, so assume not.
      is_available: false,
    };
  });

  return {
    recommendation_id: REBUILT_RECOMMENDATION_ID,
    cold_start: latest.cold_start,
    weights: {},
    results,
  };
}

/**
 * The patient's current recommendation.
 *
 * Prefers this tab's cached copy (richer: real explanations and attribution),
 * and falls back to the server so a new tab, a restart or a shared link does
 * not dead-end on "No doctors yet". Returns `null` when the patient has never
 * asked for a recommendation.
 */
export async function loadRecommendation(): Promise<RecommendationResponse | null> {
  if (typeof window === "undefined") return null;
  const cached = fromSession();
  if (cached) return cached;
  try {
    return await fromServer();
  } catch {
    return null; // never block the page on the fallback
  }
}
