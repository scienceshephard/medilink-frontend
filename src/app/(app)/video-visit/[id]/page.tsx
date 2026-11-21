"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2 } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { useVideoCall } from "@/lib/useVideoCall";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { RoleGate } from "@/components/app/RoleGate";

function VideoFeed({ stream, muted = false, label }: { stream: MediaStream | null; muted?: boolean; label: string }) {
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
      <video ref={ref} autoPlay playsInline muted={muted} aria-label={label} className={`h-full w-full object-cover ${muted ? "[transform:scaleX(-1)]" : ""}`} />
      {audioBlocked && <button onClick={() => { void ref.current?.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true)); }} className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-ink"><Volume2 size={20} /> Play call audio</button>}
    </>
  );
}

export default function VideoVisitPage({ params }: { params: { id: string } }) {
  return <RoleGate allow={["doctor", "patient"]}><CallPage key={params.id} id={Number(params.id)} /></RoleGate>;
}

function CallPage({ id }: { id: number }) {
  const { role } = useAuth();
  const back = role === "doctor" ? "/doctor-portal" : "/appointments";
  const { data: session, error: sessionError, loading, reload } = useApi(() => api.consultations.videoSession(id), [id]);
  const { data: consultation } = useApi(() => api.consultations.get(id), [id]);
  const call = useVideoCall();
  const active = ["joining", "waiting", "connecting", "connected", "reconnecting"].includes(call.state);
  const peerName = role === "doctor" ? "your patient" : "your clinician";
  const message = call.state === "connected" ? "You are connected"
    : call.state === "waiting" ? `Waiting for ${peerName} to join`
    : call.state === "connecting" ? "Connecting your call…"
    : call.state === "reconnecting" ? "Reconnecting… stay on this page"
    : call.state === "joining" ? "Starting your camera and microphone…"
    : call.state === "ended" ? "You have left the call"
    : "Ready for your video visit";

  if (loading) return <Skeleton className="mx-auto h-96 max-w-[1000px] rounded-[24px]" />;
  if (sessionError || !session) return (
    <div className="mx-auto max-w-xl rounded-[24px] border border-border bg-white p-8">
      <h1 className="text-2xl font-extrabold text-ink">Video visit</h1>
      <p role="alert" className="my-4 text-ink-muted">{sessionError ?? "This video visit could not be loaded."}</p>
      <div className="flex flex-wrap gap-3"><Button onClick={reload}>Try again</Button><Link href={back} className="self-center font-bold text-primary">Back to visits</Link></div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-extrabold text-[32px] text-ink">Your video visit</h1><p className="text-sm text-ink-muted">{consultation ? formatDateTime(consultation.scheduled_datetime) : ""}</p></div>
        <Link href={back} onClick={call.leave} className="font-bold text-primary">Back to visits</Link>
      </div>
      <div className="relative aspect-video min-h-[300px] overflow-hidden rounded-[24px] bg-[#172b23] text-white sm:min-h-[420px]">
        {call.remoteStream ? <VideoFeed stream={call.remoteStream} label={`${peerName}'s video`} /> : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-5 text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-white/10"><Video size={32} /></span>
            <p className="text-xl font-bold">{message}</p>
            {call.state === "waiting" && <p className="max-w-md text-sm text-white/75">Keep this page open. Your call starts when you both join.</p>}
            {call.state === "reconnecting" && <p className="max-w-md text-sm text-white/75">The connection dropped. MediLink is reconnecting automatically, so you do not need to join again.</p>}
            {!active && <p className="max-w-md text-sm text-white/75">Join here with your MediLink account. Allow your browser to use your camera and microphone.</p>}
          </div>
        )}
        {call.remoteStream && call.state === "reconnecting" && (
          <span role="status" className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1.5 text-sm font-bold">Reconnecting…</span>
        )}
        {call.localStream && (
          <div className="absolute bottom-4 right-4 aspect-[4/3] w-[30%] min-w-[110px] max-w-[240px] overflow-hidden rounded-2xl border-2 border-white/40 bg-[#253d32] shadow-lg">
            <VideoFeed stream={call.localStream} muted label="Your camera preview" />
            {!call.cameraOn && <div className="absolute inset-0 grid place-items-center bg-[#253d32]"><VideoOff /></div>}
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-xs font-bold">You{!call.micOn ? " · muted" : ""}</span>
          </div>
        )}
      </div>
      <p role="status" aria-live="polite" className="mt-4 text-center text-sm font-bold text-ink-muted">{message}</p>
      {call.error && <p role="alert" className="mx-auto mt-3 max-w-xl rounded-xl bg-red-soft p-4 text-center font-bold text-error">{call.error}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {active ? <>
          <Button variant="outline" onClick={call.toggleMic} disabled={!call.localStream} aria-pressed={!call.micOn}>{call.micOn ? <Mic size={20} /> : <MicOff size={20} />}{call.micOn ? "Mute" : "Unmute"}</Button>
          <Button variant="outline" onClick={call.toggleCamera} disabled={!call.localStream} aria-pressed={!call.cameraOn}>{call.cameraOn ? <Video size={20} /> : <VideoOff size={20} />}{call.cameraOn ? "Camera off" : "Camera on"}</Button>
          <Button onClick={call.leave} className="bg-error hover:bg-error/90"><PhoneOff size={20} />Leave call</Button>
        </> : <Button size="lg" onClick={() => call.join(session)}><Video size={20} />{call.state === "ended" || call.state === "error" ? "Join again" : "Join video visit"}</Button>}
      </div>
      <p className="mt-4 text-center text-xs text-ink-muted">Leaving the call keeps your appointment open. {role === "doctor" ? "Mark the visit complete from your visits page when you finish." : "Your clinician will close the visit when you finish."}</p>
    </div>
  );
}
