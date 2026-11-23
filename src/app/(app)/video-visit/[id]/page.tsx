"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, AudioLines, ChevronUp, CircleAlert, CircleCheck, ClipboardList, Heart, Lock, Maximize, MessageCircle,
  Mic, MicOff, Minimize, PhoneOff, SendHorizontal, Signal, SwitchCamera, Video, VideoOff, Volume2, Wifi, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { useVideoCall, type CallState, type VideoSession } from "@/lib/useVideoCall";
import { formatDateTime, formatTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { RoleGate } from "@/components/app/RoleGate";
import type { ConsultationOut, ConsultationSummary, Message, Severity } from "@/lib/types";

const SEVERITY_LABEL: Record<Severity, string> = { mild: "A little", moderate: "Medium", severe: "A lot" };
const ACTIVE: CallState[] = ["joining", "waiting", "connecting", "connected", "reconnecting"];

function VideoFeed({ stream, muted = false, mirror = false, label }: { stream: MediaStream | null; muted?: boolean; mirror?: boolean; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let active = true;
    setAudioBlocked(false);
    element.srcObject = stream;
    if (stream) void element.play().catch(() => { if (active && !muted) setAudioBlocked(true); });
    return () => { active = false; element.srcObject = null; };
  }, [stream, muted]);
  return (
    <>
      <video ref={ref} autoPlay playsInline muted={muted} aria-label={label} className={`absolute inset-0 h-full w-full object-cover ${mirror ? "[transform:scaleX(-1)]" : ""}`} />
      {audioBlocked && <button onClick={() => { void ref.current?.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true)); }} className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-ink"><Volume2 size={20} /> Play call audio</button>}
    </>
  );
}

function initials(name: string): string {
  return name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Keeps the full-screen call above the app shell and stops the page behind it scrolling. */
function useLockScroll() {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
}

export default function VideoVisitPage({ params }: { params: { id: string } }) {
  return <RoleGate allow={["doctor", "patient"]}><CallPage key={params.id} id={Number(params.id)} /></RoleGate>;
}

function CallPage({ id }: { id: number }) {
  const { role } = useAuth();
  const back = role === "doctor" ? "/doctor-portal" : "/appointments";
  const { data: session, error: sessionError, loading, reload } = useApi(() => api.consultations.videoSession(id), [id]);
  const { data: consultation } = useApi(() => api.consultations.get(id), [id]);
  // The visits list carries the other person's name and the severity, which
  // the single-visit endpoint does not return.
  const { data: visits } = useApi(
    () => (role === "doctor" ? api.doctors.myConsultations() : api.patients.consultations()),
    [role],
  );
  const summary = visits?.find((visit) => visit.id === id) ?? null;
  const call = useVideoCall();
  const active = ACTIVE.includes(call.state);

  if (loading) return <Skeleton className="mx-auto h-96 max-w-[1000px] rounded-[24px]" />;
  if (sessionError || !session) return (
    <div className="mx-auto max-w-xl rounded-[24px] border border-border bg-white p-8">
      <h1 className="text-2xl font-extrabold text-ink">Video visit</h1>
      <p role="alert" className="my-4 text-ink-muted">{sessionError ?? "This video visit could not be loaded."}</p>
      <div className="flex flex-wrap gap-3"><Button onClick={reload}>Try again</Button><Link href={back} className="self-center font-bold text-primary">Back to visits</Link></div>
    </div>
  );

  const peerName = (role === "doctor" ? summary?.patient_name : summary?.doctor_name) ?? (role === "doctor" ? "your patient" : "your clinician");
  const details = { role: session.role, peerName, back, consultation, summary };

  return active
    ? <CallRoom call={call} {...details} />
    : <Lobby session={session} call={call} {...details} />;
}

interface Details {
  role: "doctor" | "patient";
  peerName: string;
  back: string;
  consultation: ConsultationOut | null;
  summary: ConsultationSummary | null;
}
type Call = ReturnType<typeof useVideoCall>;

// ── Before the call ─────────────────────────────────────────────────────────

type Check = "checking" | "ok" | "blocked" | "missing";

function Lobby({ session, call, role, peerName, back, consultation }: Details & { session: VideoSession; call: Call }) {
  useLockScroll();
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [camera, setCamera] = useState<Check>("checking");
  const [mic, setMic] = useState<Check>("checking");
  const [online, setOnline] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const previewRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCamera("blocked");
      setMic("blocked");
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: "user" } }).then((stream) => {
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        previewRef.current = stream;
        setPreview(stream);
        setCamera(stream.getVideoTracks().length ? "ok" : "missing");
        setMic(stream.getAudioTracks().length ? "ok" : "missing");
      }).catch((error: unknown) => {
        if (cancelled) return;
        const missing = error instanceof DOMException && error.name === "NotFoundError";
        setCamera(missing ? "missing" : "blocked");
        setMic(missing ? "missing" : "blocked");
      });
    }
    return () => {
      cancelled = true;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      previewRef.current?.getTracks().forEach((track) => track.stop());
      previewRef.current = null;
    };
  }, []);

  const toggle = (kind: "audio" | "video") => {
    const next = kind === "audio" ? !micOn : !cameraOn;
    (kind === "audio" ? preview?.getAudioTracks() : preview?.getVideoTracks())?.forEach((track) => { track.enabled = next; });
    (kind === "audio" ? setMicOn : setCameraOn)(next);
  };

  const join = () => {
    // Release the preview so the call can open the camera itself.
    previewRef.current?.getTracks().forEach((track) => track.stop());
    previewRef.current = null;
    void call.join(session, { mic: micOn, camera: cameraOn });
  };

  const rejoin = call.state === "ended" || call.state === "error";
  const when = consultation ? formatDateTime(consultation.scheduled_datetime) : "";
  const checks: [typeof Video, string, Check | "online" | "offline"][] = [
    [Video, "Camera", camera],
    [Mic, "Microphone", mic],
    [Wifi, "Internet", online ? "online" : "offline"],
  ];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-sand px-5 py-5 text-ink md:px-10 md:py-6">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-on-primary"><Heart size={20} fill="currentColor" /></span>
          <span className="text-[22px] font-extrabold">MediLink</span>
        </span>
        <Link href={back} className="flex items-center gap-2 text-[15px] font-extrabold text-primary"><ArrowLeft size={18} />Back to visits</Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 py-8 lg:flex-row lg:gap-12">
        <div className="relative aspect-[3/2] w-full max-w-[720px] overflow-hidden rounded-[32px] bg-[#2A2320] text-white">
          {preview && cameraOn ? <VideoFeed stream={preview} muted mirror label="Your camera preview" /> : (
            <div className="absolute inset-0 grid place-items-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-white/10">{camera === "checking" ? <Video size={30} /> : <VideoOff size={30} />}</span>
            </div>
          )}
          <span className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-black/65 px-3.5 py-2 text-sm font-bold">
            <span className={`h-2 w-2 rounded-full ${camera === "ok" ? "bg-[#6FCF97]" : "bg-face-same"}`} />
            {camera === "ok" ? `This is how you look to ${peerName}` : camera === "checking" ? "Starting your camera…" : "Your camera is not available"}
          </span>
          <div className="absolute inset-x-0 bottom-5 flex justify-center gap-3">
            <button onClick={() => toggle("audio")} disabled={!preview} aria-pressed={!micOn} className="flex h-12 items-center gap-2 rounded-full bg-[#120E0C]/70 px-[18px] text-sm font-extrabold backdrop-blur-md disabled:opacity-60">
              {micOn ? <Mic size={20} /> : <MicOff size={20} />}{micOn ? "Mic on" : "Mic off"}
            </button>
            <button onClick={() => toggle("video")} disabled={!preview} aria-pressed={!cameraOn} className="flex h-12 items-center gap-2 rounded-full bg-[#120E0C]/70 px-[18px] text-sm font-extrabold backdrop-blur-md disabled:opacity-60">
              {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}{cameraOn ? "Camera on" : "Camera off"}
            </button>
          </div>
        </div>

        <div className="flex w-full max-w-[440px] flex-col gap-6">
          <div className="flex items-center gap-3.5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft text-lg font-extrabold text-accent">{initials(peerName)}</span>
            <div>
              <p className="text-lg font-extrabold">{peerName}</p>
              <p className="flex items-center gap-1.5 text-sm font-bold text-accent"><span className="h-2 w-2 rounded-full bg-face-better" />Video visit confirmed</p>
            </div>
          </div>
          <div>
            <h1 className="text-[34px] font-extrabold leading-[1.1] md:text-[40px]">{rejoin && call.state === "ended" ? "You left the call" : "Ready for your video visit?"}</h1>
            {when && <p className="mt-3 text-base text-ink-muted">{when}</p>}
          </div>
          <div className="rounded-[20px] border border-border bg-warm-white px-5 py-2">
            {checks.map(([IconC, label, status], index) => {
              const good = status === "ok" || status === "online";
              const text = { checking: "Checking…", ok: "Working", blocked: "Blocked", missing: "Not found", online: "Connected", offline: "Offline" }[status];
              return (
                <div key={label} className={`flex h-14 items-center gap-3.5 ${index < checks.length - 1 ? "border-b border-border" : ""}`}>
                  <IconC size={20} />
                  <span className="flex-1 text-base font-bold">{label}</span>
                  <span className={`flex items-center gap-1.5 text-sm font-bold ${good ? "text-accent" : status === "checking" ? "text-ink-muted" : "text-error"}`}>
                    {text}{good ? <CircleCheck size={18} className="text-face-better" /> : status !== "checking" && <CircleAlert size={18} />}
                  </span>
                </div>
              );
            })}
          </div>
          {(camera === "blocked" || mic === "blocked") && !call.error && (
            <p className="rounded-xl bg-amber-soft p-3.5 text-sm font-bold">Allow camera and microphone access in your browser&apos;s address bar, then reload this page.</p>
          )}
          {call.error && <p role="alert" className="rounded-xl bg-red-soft p-3.5 text-sm font-bold text-error">{call.error}</p>}
          <button onClick={join} className="flex h-[60px] w-full items-center justify-center gap-2.5 rounded-full bg-primary text-lg font-extrabold text-on-primary transition hover:bg-primary/90">
            <Video size={22} />{rejoin ? "Join again" : "Join now"}
          </button>
          <p className="text-sm leading-[1.4] text-ink-muted">
            No app or extra account needed. The call runs privately between your browser and {role === "doctor" ? "your patient's" : `${peerName}'s`}.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── During the call ─────────────────────────────────────────────────────────

type Panel = "chat" | "info" | null;

function CallRoom({ call, role, peerName, consultation, summary }: Details & { call: Call }) {
  useLockScroll();
  const [panel, setPanel] = useState<Panel>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [fullscreen, setFullscreen] = useState(false);
  const [canFlip, setCanFlip] = useState(false);
  const [unread, setUnread] = useState(0);

  // The panel starts open beside the video on wide screens; on phones it is a sheet.
  useEffect(() => { if (window.matchMedia("(min-width: 1024px)").matches) setPanel("chat"); }, []);
  useEffect(() => {
    if (call.state === "connected" && connectedAt === null) setConnectedAt(Date.now());
  }, [call.state, connectedAt]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  useEffect(() => {
    if (!call.localStream) return;
    void navigator.mediaDevices?.enumerateDevices().then((devices) => {
      setCanFlip(devices.filter((device) => device.kind === "videoinput").length > 1);
    }).catch(() => setCanFlip(false));
  }, [call.localStream]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };
  const toggle = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));

  const elapsed = connectedAt ? clock(Math.max(0, Math.floor((now - connectedAt) / 1000))) : null;
  const status = call.state === "connected" ? null
    : call.state === "waiting" ? `Waiting for ${peerName} to join`
    : call.state === "reconnecting" ? "Reconnecting… stay on this page"
    : call.state === "joining" ? "Starting your camera and microphone…"
    : "Connecting your call…";
  const connection = call.state === "connected" ? "Connected" : call.state === "reconnecting" ? "Reconnecting" : call.state === "waiting" ? "Waiting" : "Connecting";
  const when = consultation ? formatDateTime(consultation.scheduled_datetime) : "";
  const peerRole = role === "doctor" ? "Your patient" : "Your clinician";
  const severity = summary?.severity ? SEVERITY_LABEL[summary.severity] : null;
  const complaint = consultation?.symptom_input ?? summary?.symptom_input ?? null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col gap-4 bg-[#15110F] text-white lg:p-5">
      <header className="hidden h-14 items-center justify-between px-2 lg:flex">
        <div className="flex items-center gap-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary"><Heart size={20} fill="currentColor" /></span>
          <div>
            <p className="text-lg font-extrabold">Video visit with {peerName}</p>
            {when && <p className="text-sm text-white/65">{when}</p>}
          </div>
        </div>
        <span className="flex items-center gap-2.5 rounded-full bg-white/10 px-4 py-2 text-base font-extrabold" role="timer" aria-label="Call length">
          <span className={`h-2.5 w-2.5 rounded-full ${elapsed ? "bg-[#E5533B]" : "bg-face-same"}`} />
          {elapsed ?? "Not started"}
        </span>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-sm font-bold text-white/85"><Lock size={16} className="text-[#9FD3B4]" />Private call</span>
          <span className="flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-sm font-bold text-white/85">
            <Signal size={16} className={call.state === "connected" ? "text-[#9FD3B4]" : "text-face-same"} />{connection}
          </span>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 gap-4">
        <section className="relative min-w-0 flex-1 overflow-hidden bg-[#2A2320] lg:rounded-[28px]" aria-label="Call">
          {call.remoteStream ? <VideoFeed stream={call.remoteStream} label={`${peerName}'s video`} /> : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <span className="grid h-28 w-28 place-items-center rounded-full bg-white/10 text-4xl font-extrabold">{initials(peerName)}</span>
              <p className="text-xl font-bold">{status}</p>
              {call.state === "waiting" && <p className="max-w-md text-sm text-white/70">Keep this page open. Your call starts when you both join.</p>}
            </div>
          )}
          {call.remoteStream && status && (
            <span role="status" className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm font-bold lg:top-6">{status}</span>
          )}

          {/* Top: who you are talking to, and yourself */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] lg:bg-none lg:p-6">
            <div className="lg:hidden">
              <p className="text-lg font-extrabold">{peerName}</p>
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-white/80">
                <span className={`h-2 w-2 rounded-full ${elapsed ? "bg-[#E5533B]" : "bg-face-same"}`} />{elapsed ?? connection} · Private call
              </p>
            </div>
            <span className="hidden items-center gap-2.5 rounded-full bg-black/65 px-4 py-2.5 backdrop-blur-md lg:flex">
              <AudioLines size={18} className="text-[#9FD3B4]" />
              <span className="text-base font-extrabold">{peerName}</span>
              <span className="text-sm text-white/70">{peerRole}</span>
            </span>
            {call.localStream && (
              <div className="relative h-[140px] w-[104px] shrink-0 overflow-hidden rounded-[18px] border-2 border-white/40 bg-[#3A302B] shadow-[0_12px_32px_rgba(0,0,0,0.4)] lg:h-[160px] lg:w-[240px] lg:rounded-[20px]">
                <VideoFeed stream={call.localStream} muted mirror={call.facing === "user"} label="Your camera preview" />
                {!call.cameraOn && <div className="absolute inset-0 grid place-items-center bg-[#3A302B]"><VideoOff /></div>}
                <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-xs font-extrabold">
                  {call.micOn ? <Mic size={13} className="hidden lg:block" /> : <MicOff size={13} />}You
                </span>
              </div>
            )}
          </div>

          {/* Bottom: what you booked for (phones) and the controls */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3.5 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-12 lg:bg-none lg:p-6">
            {complaint && (
              <button onClick={() => toggle("info")} className="flex w-full items-center gap-2.5 rounded-2xl bg-white/15 px-3.5 py-2.5 text-left text-[13px] font-bold backdrop-blur-md lg:hidden">
                <ClipboardList size={18} className="shrink-0" />
                <span className="flex-1 truncate">{[severity, complaint].filter(Boolean).join(" · ")}</span>
                <ChevronUp size={18} className="text-white/70" />
              </button>
            )}
            <div className="flex w-full items-center justify-between lg:w-auto lg:gap-3 lg:rounded-full lg:bg-[#120E0C]/80 lg:p-3 lg:backdrop-blur-xl">
              <DockButton label={call.micOn ? "Mute" : "Unmute"} onClick={call.toggleMic} off={!call.micOn} pressed={!call.micOn}>
                {call.micOn ? <Mic size={24} /> : <MicOff size={24} />}
              </DockButton>
              <DockButton label={call.cameraOn ? "Camera" : "Camera off"} onClick={call.toggleCamera} off={!call.cameraOn} pressed={!call.cameraOn}>
                {call.cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
              </DockButton>
              <DockButton label="Chat" onClick={() => { toggle("chat"); setUnread(0); }} on={panel === "chat"} pressed={panel === "chat"} badge={panel === "chat" ? 0 : unread}>
                <MessageCircle size={24} />
              </DockButton>
              <DockButton label="Visit info" onClick={() => toggle("info")} on={panel === "info"} pressed={panel === "info"} className="hidden lg:flex">
                <ClipboardList size={24} />
              </DockButton>
              <DockButton label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen} className="hidden lg:flex">
                {fullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
              </DockButton>
              {canFlip && (
                <DockButton label="Flip camera" onClick={() => void call.switchCamera()} className="lg:hidden">
                  <SwitchCamera size={24} />
                </DockButton>
              )}
              <span className="hidden h-10 w-px bg-white/15 lg:block" />
              <button onClick={call.leave} aria-label="Leave call" className="grid h-16 w-16 place-items-center rounded-full bg-[#E5533B] font-extrabold transition hover:bg-[#d14a33] lg:flex lg:h-14 lg:w-auto lg:gap-2.5 lg:px-6">
                <PhoneOff size={22} /><span className="hidden text-base lg:inline">Leave call</span>
              </button>
            </div>
          </div>
        </section>

        <SidePanel
          panel={panel}
          setPanel={setPanel}
          consultationId={consultation?.id ?? summary?.id ?? null}
          role={role}
          peerName={peerName}
          partner={role === "doctor" ? { patient_id: consultation?.patient_id ?? summary?.patient_id } : { doctor_id: consultation?.doctor_id ?? summary?.doctor_id }}
          severity={severity}
          complaint={complaint}
          when={when}
          startedAt={connectedAt}
          onUnread={setUnread}
        />
      </div>
    </div>
  );
}

function DockButton({ label, onClick, children, on = false, off = false, pressed, badge = 0, className = "" }: {
  label: string; onClick: () => void; children: React.ReactNode; on?: boolean; off?: boolean; pressed?: boolean; badge?: number; className?: string;
}) {
  return (
    <button onClick={onClick} aria-label={label} aria-pressed={pressed} className={`flex flex-col items-center gap-1.5 ${className}`}>
      <span className={`relative grid h-14 w-14 place-items-center rounded-full transition ${on ? "bg-white text-[#15110F]" : off ? "bg-white/90 text-[#B9473E]" : "bg-white/[0.18] hover:bg-white/25 lg:bg-white/[0.12]"}`}>
        {children}
        {badge > 0 && <span className="absolute -right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[#15110F] bg-primary px-1 text-[11px] font-extrabold text-white">{badge}</span>}
      </span>
      <span className="hidden text-xs font-bold text-white/70 lg:block">{label}</span>
    </button>
  );
}

// ── Chat and visit details ──────────────────────────────────────────────────

function SidePanel({ panel, setPanel, consultationId, role, peerName, partner, severity, complaint, when, startedAt, onUnread }: {
  panel: Panel;
  setPanel: (panel: Panel) => void;
  consultationId: number | null;
  role: "doctor" | "patient";
  peerName: string;
  partner: { patient_id?: number; doctor_id?: number };
  severity: string | null;
  complaint: string | null;
  when: string;
  startedAt: number | null;
  onUnread: (count: number) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const seenRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const partnerKey = partner.patient_id ?? partner.doctor_id;

  const load = useCallback(async () => {
    if (!partnerKey) return;
    try { setMessages(await api.messages.thread(partner)); } catch { /* keep the last messages on a failed poll */ }
  }, [partnerKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll while the call is open so new messages appear without a reload.
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 4000);
    return () => clearInterval(timer);
  }, [load]);

  const latest = messages.length ? messages[messages.length - 1].id : 0;
  useEffect(() => {
    if (seenRef.current === null && messages.length) seenRef.current = latest;
    if (panel === "chat") {
      seenRef.current = latest;
      onUnread(0);
      bottomRef.current?.scrollIntoView({ block: "end" });
    } else {
      onUnread(messages.filter((message) => message.sender_role !== role && message.id > (seenRef.current ?? latest)).length);
    }
  }, [panel, latest]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await api.messages.send({ body, ...partner, consultation_id: consultationId ?? undefined });
      setDraft("");
      await load();
    } catch {
      setSendError("Your message did not send. Try again.");
    } finally {
      setSending(false);
    }
  }

  // "Dr. Ngozi Eze" → "Dr. Eze"; a patient is addressed by first name.
  const words = peerName.split(/\s+/).filter(Boolean);
  const firstName = /^dr\.?$/i.test(words[0] ?? "") && words.length > 1 ? `Dr. ${words[words.length - 1]}` : words[0] ?? peerName;

  // Stays mounted while closed so the thread keeps polling for the unread badge.
  return (
    <aside hidden={!panel} className="absolute inset-x-0 bottom-0 z-20 flex [&[hidden]]:hidden h-[72%] flex-col gap-4 rounded-t-[28px] bg-warm-white p-5 text-ink shadow-[0_-12px_40px_rgba(0,0,0,0.35)] lg:static lg:h-auto lg:w-[384px] lg:shrink-0 lg:rounded-[28px] lg:shadow-none">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1 rounded-full bg-sand p-1" role="tablist">
          {(["chat", "info"] as const).map((tab) => (
            <button key={tab} role="tab" aria-selected={panel === tab} onClick={() => setPanel(tab)}
              className={`flex h-10 flex-1 items-center justify-center rounded-full text-[15px] font-extrabold ${panel === tab ? "bg-white text-ink shadow-[0_2px_6px_rgba(43,38,33,0.1)]" : "text-ink-muted"}`}>
              {tab === "chat" ? "Chat" : "Visit info"}
            </button>
          ))}
        </div>
        <button onClick={() => setPanel(null)} aria-label="Close panel" className="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-sand"><X size={20} /></button>
      </div>

      {(complaint || severity) && (
        <div className="rounded-[20px] bg-primary-soft p-4">
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#A9472A]">{role === "doctor" ? "WHY THEY BOOKED" : "WHY YOU BOOKED"}</p>
          {severity && <span className="mt-2.5 inline-block rounded-full bg-white px-3 py-1 text-[13px] font-bold">How bad: {severity}</span>}
          {complaint && <p className="mt-2.5 text-sm italic leading-[1.35]">&ldquo;{complaint}&rdquo;</p>}
        </div>
      )}

      {panel === "chat" ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto thin-scroll">
            <div className="mt-auto" />
            {startedAt && <p className="pb-2 text-center text-xs font-bold text-ink-muted">Call started at {formatTime(new Date(startedAt).toISOString())} · messages are saved to this visit</p>}
            {messages.length === 0 && <p className="py-6 text-center text-sm text-ink-muted">No messages yet. Share a link or a note here.</p>}
            {messages.map((message) => {
              const mine = message.sender_role === role;
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[260px] px-3.5 py-2.5 ${mine ? "rounded-[18px] rounded-br-[4px] bg-primary text-white" : "rounded-[18px] rounded-bl-[4px] border border-border bg-white"}`}>
                    <p className="whitespace-pre-wrap break-words text-sm leading-[1.35]">{message.body}</p>
                    <p className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-ink-muted"}`}>{formatTime(message.created_at)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          {sendError && <p role="alert" className="text-sm font-bold text-error">{sendError}</p>}
          <form className="flex items-center gap-2.5" onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${firstName}…`} aria-label="Message"
              className="h-12 min-w-0 flex-1 rounded-full bg-sand px-[18px] text-sm text-ink outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-primary/40" />
            <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-white disabled:opacity-50">
              <SendHorizontal size={20} />
            </button>
          </form>
        </>
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          <dl className="rounded-[20px] border border-border bg-white px-4 py-1">
            {[["With", peerName], ["When", when || "—"], ["Type", "Video visit"]].map(([label, value], index) => (
              <div key={label} className={`flex items-center justify-between gap-4 py-3 ${index < 2 ? "border-b border-border" : ""}`}>
                <dt className="text-sm text-ink-muted">{label}</dt><dd className="text-right text-sm font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm leading-[1.4] text-ink-muted">
            Leaving the call keeps your appointment open. {role === "doctor" ? "Mark the visit complete from your visits page when you finish." : "Your clinician will close the visit when you finish."}
          </p>
        </div>
      )}
    </aside>
  );
}
