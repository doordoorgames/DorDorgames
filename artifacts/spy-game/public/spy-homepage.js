document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const C = window.SpyCore;
  let accountName = "";
  document.body.style.backgroundImage = "url('gallary/interrogation-bg.jpeg')";
  localStorage.setItem("selectedGameType", "spy");
  const $ = id => document.getElementById(id);
  const lang = () => localStorage.getItem("lang") === "en" ? "en" : "ar";
  const copy={en:{subtitle:"Find the hidden spy among you!",create:"Create New Game",join:"Join Game",name:"Enter your nickname",code:"Enter five-digit room code",joining:"Joining room",joinRoom:"Join Room",how:"How to Play"},ar:{subtitle:"اكتشف الجاسوس المختبئ بينكم!",create:"إنشاء لعبة جديدة",join:"انضم إلى لعبة",name:"أدخل اسمك",code:"أدخل رمز الغرفة المكوّن من 5 أرقام",joining:"الانضمام إلى الغرفة",joinRoom:"انضم إلى الغرفة",how:"طريقة اللعب"}};
  const say = (text, error) => { const target = $("inviteStatus"); if (target) { target.textContent=text; target.style.color=error?"#ffb3b3":""; } else alert(text); };
  function navigate(code){ location.href=`spy-lobby.html?code=${code}`; }
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
    try{let response=await fetch("https://dordorgames-production.up.railway.app/api/auth/me",{credentials:"include",headers:{Accept:"application/json"}});if(response.status===401){const refreshed=await fetch("https://dordorgames-production.up.railway.app/api/auth/refresh",{method:"POST",credentials:"include"});if(refreshed.ok)response=await fetch("https://dordorgames-production.up.railway.app/api/auth/me",{credentials:"include",headers:{Accept:"application/json"}});}if(!response.ok)throw new Error("ACCOUNT_CHECK_FAILED");account=await response.json();}catch(_){alert(lang()==="ar"?"تعذر التحقق من وقت الاستضافة. حاول مرة أخرى.":"Unable to verify hosting time. Please try again.");return;}
    if(account?.role!=="host"){
      const wantsPass=confirm(lang()==="ar"?"إنشاء لعبة يتطلب باقة استضافة مدفوعة. هل تريد عرض الباقات؟":"Creating a game requires a paid hosting pass. View plans now?");
      if(wantsPass)location.href="https://www.dordor.games/pricing?game=spy";
      return;
    }
    const active=account.activeSessionEndsAt&&new Date(account.activeSessionEndsAt).getTime()>Date.now();
    if(!active&&Number(account.remainingMinutes||0)<=0){const wantsTime=confirm(lang()==="ar"?"انتهى وقت الاستضافة. هل تريد شراء وقت إضافي؟":"Your hosting time has ended. Buy more time?");if(wantsTime)location.href="https://www.dordor.games/pricing?game=spy";return;}
    if($("newGameInput").classList.contains("d-none")){$("newGameInput").classList.remove("d-none");$("joinGameSection").classList.add("d-none");$("newGameInput").focus();return;}
    if(creating)return;creating=true;
    try{const created=await C.createRoom($("newGameInput").value,lang());navigate(created.code);}catch(e){if(String(e?.message)==="HOSTING_TIME_REQUIRED"&&confirm(lang()==="ar"?"انتهى وقت الاستضافة. هل تريد شراء وقت إضافي؟":"Your hosting time has ended. Buy more time?"))location.href="https://www.dordor.games/pricing?game=spy";else if(String(e?.message)!=="HOSTING_TIME_REQUIRED")alert(C.message(e));creating=false;}
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
