

window.voiceChatInitialized = window.voiceChatInitialized || false;

if (!window.voiceChatInitialized) {
  window.voiceChatInitialized = true;


  window.localStream = null;
  let peer = null;
  let callConnections = {};
  let isMuted = true; // Set to true by default


  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  if (!code) {
    console.warn("Voice chat disabled: no game code found in URL.");
  }
  const roomId = code;
  const db = firebase.database();


  const micBtn = document.getElementById("micBtn");
  const micIcon = document.getElementById("micIcon");

  if (!micBtn || !micIcon) {
    console.error("Mic button or icon element not found!");
  } else {
    micBtn.disabled = true;


    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        window.localStream = stream;

        window.localStream.getAudioTracks()[0].enabled = true;
        micBtn.disabled = false;
        micIcon.className = "bi bi-mic-fill";

        console.log("Mic ready:", window.localStream);


        micBtn.addEventListener("click", () => {
          if (!window.localStream) return;
          isMuted = !isMuted;
          window.localStream.getAudioTracks()[0].enabled = !isMuted;
          micIcon.className = isMuted ? "bi bi-mic-mute-fill" : "bi bi-mic-fill";
          console.log(
            "Mic muted:", isMuted,
            "Track enabled:", window.localStream.getAudioTracks()[0].enabled
          );
        });

      } catch (err) {
        console.error("Microphone access denied:", err);
      }
    }

    function initPeer() {
      peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            {
              urls: 'turn:numb.viagenie.ca',
              credential: 'muazkh',
              username: 'webrtc@live.com'
            }
          ]
        }
      });

      peer.on("open", id => {
        console.log("My Peer ID:", id);
        localStorage.setItem("myPeerId", id);

        const roomRef = db.ref("rooms/" + roomId + "/peers");


        roomRef.remove().then(() => {
          roomRef.child(id).set(true);
        });

        peer.on("disconnected", () => roomRef.child(id).remove());

        listenForPeers(roomRef, id);
      });

      peer.on("call", call => {
        console.log("📞 Incoming call from", call.peer);

        if (window.localStream) {
          call.answer(window.localStream);
        } else {
          initMic().then(() => call.answer(window.localStream));
        }

        callConnections[call.peer] = call;
        call.on("stream", playRemoteStream);

        call.on("close", () => {
          delete callConnections[call.peer];
        });
      });
    }


    function listenForPeers(roomRef, myId) {
      roomRef.on("value", snapshot => {
        const peers = snapshot.val() || {};

        Object.keys(callConnections).forEach(pid => {
          if (!peers[pid]) {
            callConnections[pid].close();
            delete callConnections[pid];
          }
        });


        Object.keys(peers).forEach(pid => {
          if (pid !== myId && !callConnections[pid]) {
            console.log(" Connecting to online peer:", pid);
            connectToPeer(pid);
          }
        });
      });
    }


    function connectToPeer(peerId) {
      if (!peerId || !window.localStream) return;

      console.log("Calling peer:", peerId);
      const call = peer.call(peerId, window.localStream);
      callConnections[peerId] = call;

      call.on("stream", stream => {
        console.log("Remote stream received from peer:", peerId, stream);
        playRemoteStream(stream);
      });

      call.on("close", () => {
        delete callConnections[peerId];
      });
    }

    function playRemoteStream(stream) {
      const audio = document.createElement("audio");
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.controls = false;
      audio.volume = 1.0;
      audio.muted = false;
      audio.style.display = "none";
      document.body.appendChild(audio);

      audio.play().catch(() => {
        console.log("Autoplay blocked. Tap anywhere to start audio.");
        document.body.addEventListener('click', () => audio.play(), { once: true });
      });
    }

    // ======== Cleanup old peer on tab close ========
    window.addEventListener("beforeunload", () => {
      const myId = localStorage.getItem("myPeerId");
      if (roomId && myId) db.ref("rooms/" + roomId + "/peers/" + myId).remove();
    });



    const speakerBtn = document.getElementById("speakerBtn");
    const speakerIcon = document.getElementById("speakerIcon");

    let isSpeakerMuted = false;
    const remoteAudios = [];

    function playRemoteStream(stream) {
      const audio = document.createElement("audio");
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.controls = false;
      audio.volume = 1.0;
      audio.muted = isSpeakerMuted;
      audio.style.display = "none";
      document.body.appendChild(audio);

      remoteAudios.push(audio);

      audio.play().catch(() => {
        document.body.addEventListener('click', () => audio.play(), { once: true });
      });
    }


    if (speakerBtn && speakerIcon) {
      speakerBtn.addEventListener("click", () => {
        isSpeakerMuted = !isSpeakerMuted;
        speakerIcon.className = isSpeakerMuted ? "bi bi-volume-mute-fill" : "bi bi-volume-up-fill";


        remoteAudios.forEach(a => a.muted = isSpeakerMuted);

        console.log("Speaker muted:", isSpeakerMuted);
      });
    }

    // ======== Initialize everything ========
    document.addEventListener("DOMContentLoaded", () => {
      if (!roomId) {
        return;
      }
      initMic().then(initPeer);
    });
  }
}



// alerts
// ===== UNIVERSAL BEAUTIFUL ALERT SYSTEM =====
class BeautifulAlert {
  constructor() {
    this.queue = [];
    this.isShowing = false;
    this.init();
  }

  init() {
    // Create alert queue container
    const queueContainer = document.createElement('div');
    queueContainer.className = 'alert-queue';
    document.body.appendChild(queueContainer);
  }

  show(options) {
    const config = {
      title: options.title || 'Alert',
      message: options.message || '',
      type: options.type || 'info', // success, error, warning, info, question
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Cancel',
      showCancel: options.showCancel || false,
      autoClose: options.autoClose || false,
      onConfirm: options.onConfirm || (() => { }),
      onCancel: options.onCancel || (() => { }),
      closeOnOverlay: options.closeOnOverlay !== false,
      showCloseButton: options.showCloseButton !== false
    };

    // For autoClose under 3 seconds, use toast instead
    if (config.autoClose && config.autoClose <= 3000) {
      return this.showToast(config);
    }

    return new Promise((resolve) => {
      this.queue.push({ config, resolve });
      this.processQueue();
    });
  }

  showToast(config) {
    const toast = document.createElement('div');
    toast.className = `toast-alert ${config.type}`;

    const icons = {
      success: 'bi bi-check-circle-fill',
      error: 'bi bi-exclamation-triangle-fill',
      warning: 'bi bi-exclamation-circle-fill',
      info: 'bi bi-info-circle-fill',
      question: 'bi bi-question-circle-fill'
    };

    toast.innerHTML = `
      <i class="toast-icon ${icons[config.type] || icons.info}"></i>
      <div class="toast-content">
        <div class="toast-title">${config.title}</div>
        <div class="toast-message">${config.message}</div>
      </div>
    `;

    document.querySelector('.alert-queue').appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastSlideIn 0.3s ease reverse';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, config.autoClose);

    return Promise.resolve(true);
  }

  processQueue() {
    if (this.isShowing || this.queue.length === 0) return;

    this.isShowing = true;
    const { config, resolve } = this.queue.shift();
    this.createAlert(config, resolve);
  }

  createAlert(config, resolve) {
    // Remove existing alert
    const existingAlert = document.querySelector('.alert-overlay');
    if (existingAlert) {
      existingAlert.remove();
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'alert-overlay';

    // Get icon
    const icons = {
      success: 'bi bi-check-circle-fill',
      error: 'bi bi-exclamation-triangle-fill',
      warning: 'bi bi-exclamation-circle-fill',
      info: 'bi bi-info-circle-fill',
      question: 'bi bi-question-circle-fill'
    };

    const icon = icons[config.type] || icons.info;

    // Create alert
    const alert = document.createElement('div');
    alert.className = `alert-container alert-${config.type}`;

    let progressBar = '';
    if (config.autoClose) {
      progressBar = `<div class="alert-progress" style="animation-duration: ${config.autoClose}ms"></div>`;
    }

    alert.innerHTML = `
      ${config.showCloseButton ? `<button class="alert-close" onclick="window.beautifulAlert.close(false)">&times;</button>` : ''}
      <div class="alert-header">
        <i class="alert-icon ${icon}"></i>
        <h3 class="alert-title">${config.title}</h3>
      </div>
      <div class="alert-body">
        <p class="alert-message">${config.message}</p>
      </div>
      <div class="alert-footer">
        ${config.showCancel ? `
          <button class="alert-btn alert-btn-secondary" onclick="window.beautifulAlert.close(false)">
            ${config.cancelText}
          </button>
        ` : ''}
        <button class="alert-btn alert-btn-primary" onclick="window.beautifulAlert.close(true)">
          ${config.confirmText}
        </button>
      </div>
      ${progressBar}
    `;

    overlay.appendChild(alert);
    document.body.appendChild(overlay);

    // Close on overlay click
    if (config.closeOnOverlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close(false);
        }
      });
    }

    // Auto close
    if (config.autoClose) {
      setTimeout(() => {
        this.close(true);
      }, config.autoClose);
    }

    // Store callbacks
    this.currentConfig = config;
    this.currentResolve = resolve;
  }

  close(confirmed) {
    const alert = document.querySelector('.alert-overlay');
    if (alert) {
      alert.style.animation = 'alertFadeIn 0.3s ease reverse';
      setTimeout(() => {
        if (alert.parentNode) {
          alert.parentNode.removeChild(alert);
        }

        if (confirmed && this.currentConfig) {
          this.currentConfig.onConfirm();
          this.currentResolve(true);
        } else if (!confirmed && this.currentConfig) {
          this.currentConfig.onCancel();
          this.currentResolve(false);
        }

        this.isShowing = false;
        this.processQueue();
      }, 300);
    }
  }

  // Convenience methods
  success(message, title = 'Success!') {
    return this.show({ title, message, type: 'success', autoClose: 3000 });
  }

  error(message, title = 'Error!') {
    return this.show({ title, message, type: 'error' });
  }

  warning(message, title = 'Warning!') {
    return this.show({ title, message, type: 'warning' });
  }

  info(message, title = 'Information') {
    return this.show({ title, message, type: 'info', autoClose: 3000 });
  }

  confirm(message, title = 'Confirm') {
    return this.show({
      title,
      message,
      type: 'question',
      showCancel: true,
      confirmText: 'Yes',
      cancelText: 'No'
    });
  }
}

// Initialize the alert system
window.beautifulAlert = new BeautifulAlert();

// Global shortcut functions
window.showAlert = (title, message, type = 'info') => {
  return window.beautifulAlert.show({ title, message, type });
};

window.showSuccess = (message, title = 'Success!') => {
  return window.beautifulAlert.success(message, title);
};

window.showError = (message, title = 'Error!') => {
  return window.beautifulAlert.error(message, title);
};

window.showWarning = (message, title = 'Warning!') => {
  return window.beautifulAlert.warning(message, title);
};

window.showInfo = (message, title = 'Information') => {
  return window.beautifulAlert.info(message, title);
};

window.showConfirm = (message, title = 'Confirm') => {
  return window.beautifulAlert.confirm(message, title);
};