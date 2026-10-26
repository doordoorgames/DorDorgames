document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const C = window.SpyCore;
  let accountName = "";
  document.body.style.backgroundImage = "url('gallary/interrogation-bg.jpeg')";
  localStorage.setItem("selectedGameType", "spy");
  const $ = id => document.getElementById(id);
  const lang = () => localStorage.getItem("lang") === "en" ? "en" : "ar";
  const copy={en:{subtitle:"Find the hidden spy among you!",create:"Start a Game",join:"Join Game",name:"Enter your nickname",code:"Enter five-digit room code",joining:"Joining room",joinRoom:"Join Room",how:"How to Play"},ar:{subtitle:"اكتشف الجاسوس المختبئ بينكم!",create:"ابدأ لعبة",join:"انضم إلى لعبة",name:"أدخل اسمك",code:"أدخل رمز الغرفة المكوّن من 5 أرقام",joining:"الانضمام إلى الغرفة",joinRoom:"انضم إلى الغرفة",how:"طريقة اللعب"}};
  const say = (text, error) => { const target = $("inviteStatus"); if (target) { target.textContent=text; target.style.color=error?"#ffb3b3":""; } else alert(text); };
  function navigate(code){ location.href=`spy-lobby.html?code=${code}`; }
  function showDecisionModal({title,message,confirmText,cancelText}){
    return new Promise(resolve=>{
      const overlay=document.createElement("div");
      overlay.setAttribute("role","presentation");
      overlay.style.cssText="position:fixed;inset:0;z-index:20000;display:grid;place-items:center;padding:18px;background:rgba(3,2,12,.86);backdrop-filter:blur(8px)";
      const dialog=document.createElement("section");
      dialog.setAttribute("role","alertdialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-labelledby","host-access-title");dialog.setAttribute("aria-describedby","host-access-message");
      dialog.style.cssText="width:min(100%,520px);padding:clamp(22px,5vw,34px);border:2px solid #a855f7;border-radius:20px;background:linear-gradient(145deg,#170929,#090611);color:#fff;box-shadow:0 22px 70px rgba(0,0,0,.62),0 0 28px rgba(168,85,247,.28);font-family:system-ui,sans-serif";
      dialog.innerHTML=`<h2 id="host-access-title" style="margin:0 0 14px;color:#ffe100;font-size:clamp(22px,5vw,30px);line-height:1.15">${title}</h2><p id="host-access-message" style="margin:0;white-space:pre-line;color:#f4efff;font-size:16px;line-height:1.65">${message}</p><div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:26px"><button type="button" data-action="confirm" style="flex:1 1 210px;min-height:50px;border:2px solid #fff;border-radius:10px;background:#7c3aed;color:#fff;font:900 16px system-ui;cursor:pointer">${confirmText}</button><button type="button" data-action="cancel" style="flex:1 1 120px;min-height:50px;border:1px solid rgba(255,255,255,.5);border-radius:10px;background:transparent;color:#fff;font:800 16px system-ui;cursor:pointer">${cancelText}</button></div>`;
      overlay.appendChild(dialog);document.body.appendChild(overlay);
      const finish=value=>{document.removeEventListener("keydown",onKey);overlay.remove();resolve(value);};
      const onKey=event=>{if(event.key==="Escape")finish(false);};
      document.addEventListener("keydown",onKey);
      overlay.addEventListener("click",event=>{if(event.target===overlay)finish(false);});
      dialog.querySelector('[data-action="confirm"]').onclick=()=>finish(true);
      dialog.querySelector('[data-action="cancel"]').onclick=()=>finish(false);
      dialog.querySelector('[data-action="confirm"]').focus();
    });
  }
  async function promptHostLogin(){
    const message=lang()==="ar"
      ? "ابدأ لعبة. احصل على 30 دقيقة مجاناً. ادعُ أصدقاءك.\n\nينضم أصدقاؤك مجاناً باستخدام رمز الغرفة."
      : "Start a game. Get 30 minutes free. Invite your friends.\n\nYour friends join for free using your room code.";
    const wantsLogin=await showDecisionModal({title:lang()==="ar"?"أول 30 دقيقة مجاناً!":"Your First 30 Minutes Are FREE!",message,confirmText:lang()==="ar"?"أنشئ حساباً مجانياً / سجّل الدخول":"Create Free Account / Log In",cancelText:lang()==="ar"?"ربما لاحقاً":"Maybe Later"});
    if(wantsLogin)location.href="https://www.dordor.games/account?returnTo="+encodeURIComponent(location.href);
  }
  async function doJoin(code,nickname,statusEl) {
    try { if(statusEl)statusEl.textContent="Joining…"; await C.joinRoom(code,nickname); navigate(code); }
    catch(e){ const text=C.message(e); if(statusEl){statusEl.textContent=text;statusEl.style.color="#ffb3b3";}else alert(text); }
  }

  $("backBtn").onclick=()=>location.href="https://www.dordor.games/";
  $("langToggleBtn").onclick=()=>{const next=lang()==="ar"?"en":"ar";localStorage.setItem("lang",next);location.reload();};
  document.documentElement.lang=lang(); document.documentElement.dir=lang()==="ar"?"rtl":"ltr";
  $("langToggleText").textContent=lang()==="ar"?"English":"العربية";
  const t=copy[lang()];$("gameSubtitle").textContent=t.subtitle;$("newGameBtn").textContent=t.create;$("joinGameBtn").textContent=t.join;$("newGameInput").placeholder=t.name;$("joinGameInput").placeholder=t.code;$("inviteRoomText").childNodes[0].textContent=t.joining+" ";$("inviteNicknameInput").placeholder=t.name;$("inviteJoinBtn").textContent=t.joinRoom;$("howToPlayBtn").textContent="▶ "+t.how;$("howToPlayTitle").textContent=t.how+":";
  fetch("https://dordorgames-production.up.railway.app/api/auth/me", { credentials: "include", headers: { Accept: "application/json" } })
    .then(response => response.ok ? response.json() : null)
    .then(account => {
      accountName = typeof account?.fullName === "string" ? account.fullName.trim().slice(0, 24) : "";
      if (accountName && !$("newGameInput").value) $("newGameInput").value = accountName;
      if (accountName && !$("inviteNicknameInput").value) $("inviteNicknameInput").value = accountName;
    })
    .catch(() => console.debug("[Account] Profile name could not be loaded."));

  const instructionsOverlay=$("instructionsOverlay");
  const closeInstructions=()=>{instructionsOverlay.classList.remove("open");instructionsOverlay.setAttribute("aria-hidden","true");$("howToPlayBtn").focus();};
  $("howToPlayBtn").onclick=()=>{instructionsOverlay.classList.add("open");instructionsOverlay.setAttribute("aria-hidden","false");$("closeInstructionsBtn").focus();};
  $("closeInstructionsBtn").onclick=closeInstructions;
  instructionsOverlay.onclick=e=>{if(e.target===instructionsOverlay)closeInstructions();};
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&instructionsOverlay.classList.contains("open"))closeInstructions();});

  const invited=C.cleanCode(new URLSearchParams(location.search).get("room")||new URLSearchParams(location.search).get("code"));
  if(invited.length===5){
    $("standardGameSections").classList.add("d-none"); $("inviteGameSection").classList.remove("d-none"); $("inviteCodeDisplay").textContent=invited;
    const saved=C.getIdentity(invited); if(saved?.nickname)$("inviteNicknameInput").value=saved.nickname;
    C.inspectRoom(invited).then(check=>{if(!check.ok)say(C.message(new Error(check.reason.toUpperCase())),true);}).catch(()=>say("Unable to check this room. Please try again.",true));
    $("inviteJoinBtn").onclick=()=>doJoin(invited,$("inviteNicknameInput").value,$("inviteStatus"));
    $("inviteNicknameInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("inviteJoinBtn").click();});
  }

  let creating=false;
  $("newGameBtn").onclick=async()=>{
    let account=await window.DordorAccountReady;
    try{let response=await fetch("https://dordorgames-production.up.railway.app/api/auth/me",{credentials:"include",headers:{Accept:"application/json"}});if(response.status===401){const refreshed=await fetch("https://dordorgames-production.up.railway.app/api/auth/refresh",{method:"POST",credentials:"include"});if(refreshed.ok)response=await fetch("https://dordorgames-production.up.railway.app/api/auth/me",{credentials:"include",headers:{Accept:"application/json"}});}if(response.status===401||response.status===403){await promptHostLogin();return;}if(!response.ok)throw new Error("ACCOUNT_CHECK_FAILED");account=await response.json();}catch(_){alert(lang()==="ar"?"تعذر التحقق من وقت اللعب. حاول مرة أخرى.":"Unable to verify game time. Please try again.");return;}
    if(account?.role!=="host"){
      await promptHostLogin();
      return;
    }
    const active=account.activeSessionEndsAt&&new Date(account.activeSessionEndsAt).getTime()>Date.now();
    if(!active&&Number(account.remainingMinutes||0)<=0){const wantsTime=await showDecisionModal({title:lang()==="ar"?"انتهى وقت اللعب":"Game time ended",message:lang()==="ar"?"احصل على وقت لعب إضافي لبدء لعبة جديدة.":"Get more game time to start a new game.",confirmText:lang()==="ar"?"احصل على وقت لعب":"Get More Game Time",cancelText:lang()==="ar"?"ربما لاحقاً":"Maybe Later"});if(wantsTime)location.href="https://www.dordor.games/pricing?game=spy";return;}
    if($("newGameInput").classList.contains("d-none")){$("newGameInput").classList.remove("d-none");$("joinGameSection").classList.add("d-none");$("newGameInput").focus();return;}
    if(creating)return;creating=true;
    try{const created=await C.createRoom($("newGameInput").value,lang());navigate(created.code);}catch(e){if(String(e?.message)==="HOSTING_TIME_REQUIRED"){const wantsTime=await showDecisionModal({title:lang()==="ar"?"انتهى وقت اللعب":"Game time ended",message:lang()==="ar"?"احصل على وقت لعب إضافي لبدء لعبة جديدة.":"Get more game time to start a new game.",confirmText:lang()==="ar"?"احصل على وقت لعب":"Get More Game Time",cancelText:lang()==="ar"?"ربما لاحقاً":"Maybe Later"});if(wantsTime)location.href="https://www.dordor.games/pricing?game=spy";}else alert(C.message(e));creating=false;}
  };

  let joining=false;
  $("joinGameBtn").onclick=async()=>{
    if($("joinGameInput").classList.contains("d-none")){$("joinGameInput").classList.remove("d-none");$("newGameSection").classList.add("d-none");$("joinGameInput").focus();return;}
    const code=C.cleanCode($("joinGameInput").value); if(code.length!==5){alert(C.message(new Error("INVALID")));return;}
    const check=await C.inspectRoom(code).catch(()=>({ok:false,reason:"missing"})); if(!check.ok){alert(C.message(new Error(check.reason.toUpperCase())));return;}
    const existing=C.getIdentity(code); const nickname=prompt("Enter your nickname:",existing?.nickname || accountName);
    if(!nickname||joining)return;joining=true;await doJoin(code,nickname);joining=false;
  };
  $("clearNameBtn").onclick=()=>{Object.keys(localStorage).filter(k=>k.startsWith("spyIdentity:")).forEach(k=>localStorage.removeItem(k));$("clearNameBtn").classList.add("d-none");};
});
