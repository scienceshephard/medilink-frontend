"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, tokenStore } from "./api";

export interface VideoSession {
  consultation_id: number;
  role: "doctor" | "patient";
  display_name: string;
  ice_servers: RTCIceServer[];
}

export type CallState = "idle" | "joining" | "waiting" | "connecting" | "connected" | "reconnecting" | "ended" | "error";
type Signal = { type: string; message?: string; peer_id?: string | null; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

// Signaling reconnect delays. A phone switching from Wi-Fi to mobile data drops
// the socket for a few seconds; the media link usually survives that.
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 8000, 8000, 8000];

function mediaError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") return "Allow camera and microphone access in your browser, then try again.";
    if (error.name === "NotFoundError") return "No camera or microphone was found. Connect them and try again.";
    if (error.name === "NotReadableError") return "Your camera or microphone is being used by another app. Close it and try again.";
  }
  return error instanceof Error ? error.message : "Could not start the call. Please try again.";
}

export function useVideoCall() {
  const [state, setState] = useState<CallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const cleanupRef = useRef<(() => void) | null>(null);
  const switchRef = useRef<(() => Promise<void>) | null>(null);
  const generation = useRef(0);
  const joiningRef = useRef(false);
  const leaveRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    generation.current += 1;
    joiningRef.current = false;
    cleanupRef.current?.();
    cleanupRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  useEffect(() => () => {
    // Navigating away is leaving, so the other person is not left waiting for
    // a reconnect that will not come.
    leaveRef.current?.();
    generation.current += 1;
    cleanupRef.current?.();
  }, []);

  const leave = useCallback(() => {
    leaveRef.current?.();
    stop();
    setState("ended");
    setError(null);
  }, [stop]);

  // `devices` carries the mic and camera choices made before joining.
  const join = useCallback(async (session: VideoSession, devices: { mic?: boolean; camera?: boolean } = {}) => {
    if (joiningRef.current) return;
    stop();
    joiningRef.current = true;
    const run = generation.current;
    const current = () => generation.current === run;
    const micEnabled = devices.mic ?? true;
    const cameraEnabled = devices.camera ?? true;
    setError(null);
    setState("joining");
    setMicOn(micEnabled);
    setCameraOn(cameraEnabled);
    setFacing("user");

    let stream: MediaStream | null = null;
    let socket: WebSocket | null = null;
    let peer: RTCPeerConnection | null = null;
    let candidates: RTCIceCandidateInit[] = [];
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let connectTimeout: ReturnType<typeof setTimeout> | null = null;
    let authTimeout: ReturnType<typeof setTimeout> | null = null;
    let messages = Promise.resolve();
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let connectedOnce = false;
    // This browser's call session, stable across signaling reconnects.
    const peerId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    // The other side's call session that `peer` is negotiated with.
    let remotePeerId: string | null | undefined;
    // Whether the other person is currently connected to MediLink's server.
    let peerPresent = false;
    const token = tokenStore.get();

    const clearConnectTimeout = () => {
      if (connectTimeout) clearTimeout(connectTimeout);
      connectTimeout = null;
    };
    const closePeer = () => {
      clearConnectTimeout();
      if (peer) {
        peer.ontrack = null;
        peer.onicecandidate = null;
        peer.onconnectionstatechange = null;
        peer.close();
        peer = null;
      }
      candidates = [];
      setRemoteStream(null);
    };
    const closeSocket = () => {
      if (heartbeat) clearInterval(heartbeat);
      if (authTimeout) clearTimeout(authTimeout);
      heartbeat = null;
      authTimeout = null;
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
        socket = null;
      }
    };
    cleanupRef.current = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (restartTimer) clearTimeout(restartTimer);
      leaveRef.current = null;
      switchRef.current = null;
      closeSocket();
      closePeer();
      stream?.getTracks().forEach((track) => track.stop());
    };
    leaveRef.current = () => send({ type: "leave" });
    const fail = (message: string) => {
      if (!current()) return;
      stop();
      setError(message);
      setState("error");
    };
    const send = (signal: Signal | { type: string; token: string; peer_id: string }) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(signal));
    };
    const startConnectTimeout = () => {
      if (connectTimeout) return;
      connectTimeout = setTimeout(() => {
        connectTimeout = null;
        if (!current()) return;
        if (!peerPresent && socket?.readyState === WebSocket.OPEN) {
          // They closed the page or lost signal for good. Keep this side in
          // the room so the call restarts when they rejoin.
          closePeer();
          remotePeerId = undefined;
          setState("waiting");
          return;
        }
        fail("The call could not connect on this network. Try another connection, or contact MediLink support.");
      }, 30000);
    };
    const createPeer = () => {
      if (peer) return peer;
      const connection = new RTCPeerConnection({ iceServers: session.ice_servers });
      peer = connection;
      const remote = new MediaStream();
      stream?.getTracks().forEach((track) => connection.addTrack(track, stream!));
      connection.ontrack = ({ track }) => {
        if (!current() || peer !== connection) return;
        if (!remote.getTracks().some((existing) => existing.id === track.id)) remote.addTrack(track);
        setRemoteStream(remote);
      };
      connection.onicecandidate = ({ candidate }) => {
        if (current() && peer === connection && candidate) send({ type: "ice", candidate: candidate.toJSON() });
      };
      connection.onconnectionstatechange = () => {
        if (!current() || peer !== connection) return;
        if (connection.connectionState === "connected") {
          clearConnectTimeout();
          if (restartTimer) clearTimeout(restartTimer);
          restartTimer = null;
          connectedOnce = true;
          setState("connected");
        } else if (connection.connectionState === "failed" || connection.connectionState === "disconnected") {
          // Try to recover the media path (new network, relay instead of
          // direct) before giving up. Only the doctor sends offers, so the
          // patient waits for the restart offer.
          setState(connectedOnce ? "reconnecting" : "connecting");
          startConnectTimeout();
          if (session.role === "doctor" && !restartTimer) {
            const delay = connection.connectionState === "failed" ? 0 : 2000;
            restartTimer = setTimeout(() => {
              restartTimer = null;
              if (current() && peer === connection && connection.connectionState !== "connected") void offer(connection, true);
            }, delay);
          }
        }
      };
      return connection;
    };
    const offer = async (connection: RTCPeerConnection, iceRestart: boolean) => {
      // An offer can be left unanswered when the patient dropped mid-negotiation.
      if (connection.signalingState === "have-local-offer") await connection.setLocalDescription({ type: "rollback" });
      if (connection.signalingState !== "stable") return;
      await connection.setLocalDescription(await connection.createOffer({ iceRestart }));
      if (current() && peer === connection) send({ type: "offer", sdp: connection.localDescription!.toJSON() });
    };
    const applyCandidates = async (connection: RTCPeerConnection) => {
      for (const candidate of candidates) await connection.addIceCandidate(candidate);
      candidates = [];
    };
    const handle = async (signal: Signal) => {
      if (!current()) return;
      if (signal.type === "error") {
        fail(signal.message || "Could not join the call.");
      } else if (signal.type === "replaced") {
        fail("This visit was opened in another tab or window. Continue there, or join again here.");
      } else if (signal.type === "ready") {
        if (authTimeout) clearTimeout(authTimeout);
        authTimeout = null;
        reconnectAttempt = 0;
        // After a signaling reconnect the media link may still be up.
        if (peer?.connectionState !== "connected") setState(peer ? "reconnecting" : "waiting");
      } else if (signal.type === "peer-ready") {
        // A different session id means the other person reloaded or rejoined
        // from a fresh page, so the old media link cannot be renegotiated.
        if (peer && signal.peer_id !== remotePeerId) closePeer();
        remotePeerId = signal.peer_id;
        peerPresent = true;
        const reconnecting = Boolean(peer);
        // Their signaling dropped but the media link held: nothing to redo.
        if (peer?.connectionState === "connected") return;
        setState(reconnecting ? "reconnecting" : "connecting");
        startConnectTimeout();
        if (session.role === "doctor") {
          const connection = createPeer();
          // Renegotiate an existing link with an ICE restart so it can move
          // to whichever network path works now.
          await offer(connection, reconnecting);
        }
      } else if (signal.type === "offer" && session.role === "patient" && signal.sdp) {
        const connection = createPeer();
        await connection.setRemoteDescription(signal.sdp);
        await applyCandidates(connection);
        await connection.setLocalDescription(await connection.createAnswer());
        if (current() && peer === connection) send({ type: "answer", sdp: connection.localDescription!.toJSON() });
      } else if (signal.type === "answer" && session.role === "doctor" && signal.sdp && peer) {
        await peer.setRemoteDescription(signal.sdp);
        await applyCandidates(peer);
      } else if (signal.type === "ice" && signal.candidate) {
        if (peer?.remoteDescription) await peer.addIceCandidate(signal.candidate);
        else candidates.push(signal.candidate);
      } else if (signal.type === "peer-left") {
        peerPresent = false;
        closePeer();
        remotePeerId = undefined;
        setState("waiting");
      } else if (signal.type === "peer-disconnected") {
        peerPresent = false;
        // Their connection to MediLink dropped. Media travels directly between
        // the two browsers, so keep the call while they reconnect; if the
        // media link fails too, the connection timeout ends it.
        if (peer?.connectionState === "connected") return;
        if (peer) {
          setState("reconnecting");
          startConnectTimeout();
        } else {
          setState("waiting");
        }
      }
    };

    const connectSignaling = () => {
      if (!current()) return;
      const url = new URL(`${API_BASE}/api/consultations/${session.consultation_id}/video`);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(url);
      socket = ws;
      authTimeout = setTimeout(() => ws.close(), 15000);
      ws.onopen = () => {
        if (current()) send({ type: "authenticate", token: token!, peer_id: peerId });
      };
      ws.onmessage = (event) => {
        messages = messages.then(() => handle(JSON.parse(event.data))).catch(() => {
          if (current()) fail("Could not connect the call. Please join again.");
        });
      };
      // onclose always follows onerror, so reconnecting is handled once there.
      ws.onerror = () => undefined;
      ws.onclose = (event) => {
        if (!current() || socket !== ws) return;
        closeSocket();
        // 1008 is a refused origin; retrying cannot help.
        if (event.code === 1008 || reconnectAttempt >= RECONNECT_DELAYS_MS.length) {
          fail("You have disconnected from the call. Check your internet connection and join again.");
          return;
        }
        if (peer?.connectionState !== "connected") setState("reconnecting");
        reconnectTimer = setTimeout(connectSignaling, RECONNECT_DELAYS_MS[reconnectAttempt]);
        reconnectAttempt += 1;
      };
      heartbeat = setInterval(() => send({ type: "ping" }), 15000);
    };

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Open MediLink over HTTPS to use your camera and microphone.");
      }
      if (typeof RTCPeerConnection === "undefined") throw new Error("This browser does not support video calls. Open MediLink in a current Chrome, Safari, Firefox or Edge browser.");
      if (!token) throw new Error("Sign in to MediLink again to join this call.");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (!current()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.getAudioTracks().forEach((track) => { track.enabled = micEnabled; });
      stream.getVideoTracks().forEach((track) => { track.enabled = cameraEnabled; });
      // Swap between the front and back camera on a phone. The new track
      // replaces the old one in the call without renegotiating.
      switchRef.current = async () => {
        const local = stream;
        const old = local?.getVideoTracks()[0];
        if (!local || !old) return;
        const next = old.getSettings().facingMode === "environment" ? "user" : "environment";
        const fresh = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: next } } });
        const track = fresh.getVideoTracks()[0];
        if (!current()) { track.stop(); return; }
        track.enabled = old.enabled;
        await peer?.getSenders().find((sender) => sender.track?.kind === "video")?.replaceTrack(track);
        local.removeTrack(old);
        old.stop();
        local.addTrack(track);
        setFacing(next);
        setLocalStream(new MediaStream(local.getTracks()));
      };
      setLocalStream(stream);
      connectSignaling();
    } catch (err) {
      fail(mediaError(err));
    }
  }, [stop]);

  const toggleMic = useCallback(() => {
    const enabled = !micOn;
    localStream?.getAudioTracks().forEach((track) => { track.enabled = enabled; });
    setMicOn(enabled);
  }, [localStream, micOn]);
  const toggleCamera = useCallback(() => {
    const enabled = !cameraOn;
    localStream?.getVideoTracks().forEach((track) => { track.enabled = enabled; });
    setCameraOn(enabled);
  }, [localStream, cameraOn]);
  const switchCamera = useCallback(async () => {
    try {
      await switchRef.current?.();
    } catch {
      // The device has no camera facing the other way; keep the current one.
    }
  }, []);

  return { state, error, localStream, remoteStream, micOn, cameraOn, facing, join, leave, toggleMic, toggleCamera, switchCamera };
}
