// Voice chat uses Supabase Realtime presence for PeerJS discovery.
// It intentionally does not declare or replace the page alert system.
(() => {
  "use strict";

  if (window.voiceChatInitialized) return;
  window.voiceChatInitialized = true;

  const code = new URLSearchParams(window.location.search).get("code");
  const micBtn = document.getElementById("micBtn");
  const micIcon = document.getElementById("micIcon");
  const speakerBtn = document.getElementById("speakerBtn");
  const speakerIcon = document.getElementById("speakerIcon");
  if (!code || !micBtn || !micIcon || typeof Peer === "undefined") return;

  let localStream = null;
  let peer = null;
  let stopPresence = null;
  let muted = true;
  let speakerMuted = true;
  const calls = new Map();
  const remoteAudio = new Map();
  const knownPeers = new Set();

  micIcon.className = "bi bi-mic-mute-fill";
  micBtn.classList.add("voice-disabled");
  if (speakerIcon) speakerIcon.className = "bi bi-volume-mute-fill";
  speakerBtn?.classList.add("voice-disabled");

  function report(error) {
    console.error("Voice chat error:", error);
  }

  function playRemoteStream(id, stream) {
    let audio = remoteAudio.get(id);
    if (!audio) {
      audio = document.createElement("audio");
      audio.autoplay = true;
      audio.controls = false;
      audio.style.display = "none";
      document.body.appendChild(audio);
      remoteAudio.set(id, audio);
    }
    audio.srcObject = stream;
    audio.muted = speakerMuted;
    audio.play().catch(() => {
      document.body.addEventListener("click", () => audio.play(), { once: true });
    });
  }

  async function initializeMicrophone() {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    window.localStream = localStream;
    localStream.getAudioTracks().forEach((track) => { track.enabled = !muted; });
    micBtn.disabled = false;
    micIcon.className = muted ? "bi bi-mic-mute-fill" : "bi bi-mic-fill";
  }

  function connectToPeer(peerId) {
    if (!peerId || peerId === peer.id || calls.has(peerId) || !localStream) return;
    const call = peer.call(peerId, localStream);
    calls.set(peerId, call);
    call.on("stream", (stream) => playRemoteStream(peerId, stream));
    call.on("close", () => {
      calls.delete(peerId);
      remoteAudio.get(peerId)?.remove();
      remoteAudio.delete(peerId);
    });
    call.on("error", report);
  }

  async function initializePeer() {
    if (peer) return;
    peer = new Peer({
      config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
    });

    peer.on("call", (call) => {
      call.answer(localStream || undefined);
      calls.set(call.peer, call);
      call.on("stream", (stream) => playRemoteStream(call.peer, stream));
      call.on("close", () => calls.delete(call.peer));
      call.on("error", report);
    });

    peer.on("error", report);
    peer.on("open", async (id) => {
      try {
        stopPresence = await window.tfadhloonApi.createPresenceChannel(
          code,
          id,
          (peers) => {
            knownPeers.clear();
            for (const peerId of peers) {
              knownPeers.add(peerId);
              connectToPeer(peerId);
            }
            for (const [peerId, call] of calls) {
              if (!peers.includes(peerId)) {
                call.close();
                calls.delete(peerId);
              }
            }
          },
          report,
        );
      } catch (error) {
        report(error);
      }
    });
  }

  micBtn.disabled = false;
  micBtn.addEventListener("click", async () => {
    try {
      if (!localStream) {
        muted = false;
        await initializeMicrophone();
        await initializePeer();
        for (const peerId of knownPeers) connectToPeer(peerId);
      } else {
        muted = !muted;
        localStream.getAudioTracks().forEach((track) => { track.enabled = !muted; });
      }
      micIcon.className = muted ? "bi bi-mic-mute-fill" : "bi bi-mic-fill";
      micBtn.classList.toggle("voice-disabled", muted);
    } catch (error) {
      muted = true;
      micIcon.className = "bi bi-mic-mute-fill";
      micBtn.classList.add("voice-disabled");
      report(error);
    }
  });

  speakerBtn?.addEventListener("click", async () => {
    speakerMuted = !speakerMuted;
    if (speakerIcon) speakerIcon.className = speakerMuted ? "bi bi-volume-mute-fill" : "bi bi-volume-up-fill";
    speakerBtn.classList.toggle("voice-disabled", speakerMuted);
    for (const audio of remoteAudio.values()) audio.muted = speakerMuted;
    if (!speakerMuted) {
      try {
        await initializePeer();
      } catch (error) {
        speakerMuted = true;
        if (speakerIcon) speakerIcon.className = "bi bi-volume-mute-fill";
        speakerBtn.classList.add("voice-disabled");
        report(error);
      }
    }
  });

  window.addEventListener("beforeunload", () => {
    if (stopPresence) stopPresence();
    for (const call of calls.values()) call.close();
    peer?.destroy();
    localStream?.getTracks().forEach((track) => track.stop());
  });
})();
