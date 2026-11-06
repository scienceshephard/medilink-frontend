import type { FacilityRecommendationItem } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

export function FacilityMatches({ items }: { items?: FacilityRecommendationItem[] }) {
  if (!items?.length) return null;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="facility-matches-title">
      <div className="border-b border-[#E4E9E5] pb-3">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#65756F]">Health facility directory</p>
        <h2 id="facility-matches-title" className="mt-1 font-serif text-[27px] text-[#19352E]">Nearby facility listings</h2>
        <p className="mt-1 text-[12px] leading-5 text-[#65756F]">Sorted by location and any relevant service an administrator has verified. The source directory does not include equipment inventories.</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((facility) => {
          const mapUrl = facility.latitude != null && facility.longitude != null
            ? `https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${facility.name}, ${facility.lga}, ${facility.state}, Nigeria}`)}`;
          return (
            <li key={facility.facility_id} className="rounded-[18px] border border-[#D7E1DB] bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold leading-5 text-[#19352E]">{facility.name}</h3>
                  <p className="mt-1 text-[12px] text-[#65756F]">{[facility.facility_type, facility.facility_level, facility.ownership].filter(Boolean).join(" · ") || "Health facility"}</p>
                </div>
                <Icon name="local_hospital" className="shrink-0 text-[22px] text-[#286653]" />
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#53655B]"><Icon name="location_on" />{facility.lga}, {facility.state}{facility.ward ? ` · ${facility.ward}` : ""}{facility.distance_km != null ? ` · ${facility.distance_km} km` : ""}</p>
              <p className="mt-2 rounded-xl bg-[#F5F4EF] px-3 py-2 text-[11px] leading-5 text-[#65756F]">{facility.match_basis}. Directory record is not confirmation that the facility is currently open or able to provide care.</p>
              {facility.capabilities_verified && (facility.services.length > 0 || facility.equipment.length > 0) && (
                <div className="mt-3 text-[11px] text-[#53655B]">
                  {facility.services.length > 0 && <p><strong>Verified services:</strong> {facility.services.join(", ")}</p>}
                  {facility.equipment.length > 0 && <p className="mt-1"><strong>Verified equipment:</strong> {facility.equipment.join(", ")}</p>}
                </div>
              )}
              <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-[#D7E1DB] px-4 text-[12px] font-bold text-[#286653] hover:bg-[#EAF3EE]">
                Open map <Icon name="arrow_up_right" />
              </a>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] leading-5 text-[#8B9691]">Directory source: {items[0].source_name}. Listing metadata may be stale; call the facility before travelling.</p>
    </section>
  );
}
