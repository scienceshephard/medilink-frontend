import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";

type PhotoKey = "home" | "video" | "clinic";

const PHOTOS: Record<PhotoKey, { src: string; alt: string; label: string; icon: string }> = {
  home: { src: "/images/landing/photo-home.webp", alt: "A doctor laughing with an older patient during a home visit", label: "Home visit", icon: "home" },
  video: { src: "/images/landing/photo-video.webp", alt: "A doctor on a video consultation with a patient on her laptop", label: "Video call", icon: "videocam" },
  clinic: { src: "/images/landing/photo-clinic.webp", alt: "A clinician taking a patient's blood pressure", label: "At the clinic", icon: "stethoscope" },
};

/**
 * Sign-in, sign-up and password screens from medlink-v4 (Desktop/09–11, 55, 70):
 * a photo mosaic on desktop with a floating status card, and the form on the
 * paper background. Phones get the logo, the top link and the form only.
 */
export function AuthShell({
  photo,
  card,
  topText,
  topLink,
  eyebrow,
  title,
  subtitle,
  wide,
  children,
}: {
  /** Which photo leads the mosaic; the other two sit underneath. */
  photo: PhotoKey;
  card: { title: string; body: string; icon: string };
  topText?: string;
  topLink?: { label: string; href: string };
  eyebrow?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  /** Wider form column for multi-field steps. */
  wide?: boolean;
  children: ReactNode;
}) {
  const main = PHOTOS[photo];
  const rest = (Object.keys(PHOTOS) as PhotoKey[]).filter((k) => k !== photo).map((k) => PHOTOS[k]);

  return (
    <main className="min-h-screen bg-paper text-ink lg:flex lg:h-screen lg:min-h-[760px] lg:gap-0 lg:p-5">
      <aside className="hidden w-[640px] shrink-0 flex-col gap-3 lg:flex">
        <figure className="relative min-h-0 flex-1 overflow-hidden rounded-[24px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={main.src} alt={main.alt} className="h-full w-full object-cover" />
          <div className="absolute inset-x-[18px] top-[18px] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 rounded-full bg-warm-white/90 py-2 pl-2 pr-3.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-white"><Icon name="favorite" fill className="text-[16px]" /></span>
              <span className="font-display text-[18px] font-extrabold tracking-[-0.02em]">MediLink</span>
            </Link>
            <PhotoTag label={main.label} icon={main.icon} />
          </div>
          <div className="absolute bottom-[18px] right-[18px] flex w-[340px] items-center gap-3 rounded-[18px] bg-warm-white px-4 py-3.5 shadow-[0_16px_40px_rgba(31,27,23,0.25)]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Icon name={card.icon} className="text-[22px]" /></span>
            <span className="min-w-0">
              <span className="block text-[15px] font-extrabold">{card.title}</span>
              <span className="block text-[13px] text-ink-muted">{card.body}</span>
            </span>
          </div>
        </figure>
        <div className="grid h-[250px] shrink-0 grid-cols-2 gap-3">
          {rest.map((p) => (
            <figure key={p.src} className="relative overflow-hidden rounded-[24px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute left-[18px] top-[18px]"><PhotoTag label={p.label} icon={p.icon} /></span>
            </figure>
          ))}
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col px-5 lg:min-h-0 lg:pl-16 lg:pr-8">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 lg:h-14 lg:justify-end">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-white"><Icon name="favorite" fill className="text-[16px]" /></span>
            <span className="font-display text-[19px] font-extrabold tracking-[-0.02em]">MediLink</span>
          </Link>
          <div className="flex items-center gap-3.5">
            {topText && <span className="hidden text-[15px] text-ink-muted sm:inline">{topText}</span>}
            {topLink && (
              <Link href={topLink.href} className="rounded-full border-[1.5px] border-ink px-4 py-2 text-[14px] font-extrabold transition hover:bg-ink hover:text-white lg:px-[18px] lg:py-2.5 lg:text-[15px]">
                {topLink.label}
              </Link>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col py-6 lg:min-h-0 lg:overflow-y-auto">
          <div className={cn("my-auto flex w-full flex-col gap-5", wide ? "max-w-[540px]" : "max-w-[460px]")}>
            <div className="flex flex-col gap-3.5 pb-1">
              {eyebrow && <div className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-primary lg:text-[13px]">{eyebrow}</div>}
              <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] lg:text-[54px]">{title}</h1>
              {subtitle && <p className="text-[16px] leading-[1.55] text-ink-muted lg:text-[17px]">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>

        <footer className="flex shrink-0 flex-col gap-1 py-3 font-mono text-[11px] text-ink-muted sm:flex-row sm:justify-between lg:text-[12px]">
          <span>© {new Date().getFullYear()} MediLink</span>
          <span>Not for emergencies. If it&apos;s urgent, go to the nearest hospital.</span>
        </footer>
      </div>
    </main>
  );
}

function PhotoTag({ label, icon }: { label: string; icon: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-warm-white/90 px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.07em]">
      <Icon name={icon} className="text-[14px]" />{label}
    </span>
  );
}

/** The terracotta full-width submit button used across the auth screens. */
export function AuthSubmit({ children, loading, disabled }: { children: ReactNode; loading?: boolean; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-primary text-[17px] font-extrabold text-white transition hover:bg-primary-container disabled:opacity-50"
    >
      {loading && <span className="h-4 w-4 animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-current border-t-transparent" />}
      {children}
      {!loading && <Icon name="arrow_forward" className="text-[20px]" />}
    </button>
  );
}
