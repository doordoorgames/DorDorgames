document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const C=window.SpyCore,$=id=>document.getElementById(id),code=C.cleanCode(new URLSearchParams(location.search).get("code"));
  if(code.length!==5){location.href="spy-homepage.html";return;}
  let identity=await C.requireIdentity(code); if(!identity){location.href=`spy-homepage.html?room=${code}`;return;}
  const id=identity.playerId, ref=C.roomRef(code); C.startPresence(code,id);
  $("gameCodeDisplay").textContent=code; document.body.style.backgroundImage="url('gallary/interrogation-bg.jpeg')";
  const invite=`${location.origin}${location.pathname.replace(/spy-lobby\.html$/,"spy-homepage.html")}?room=${code}`;
  const copy=async(text,label)=>{try{await navigator.clipboard.writeText(text);$("connectionStatus").textContent=label;}catch(_){prompt("Copy this:",text);}};
  $("copyLinkBtn").onclick=()=>copy(invite,"Invitation link copied.");
  $("copyCodeBtn").onclick=()=>copy(code,"Room code copied.");
  if(navigator.share){$("shareBtn").style.display="inline-block";$("shareBtn").onclick=()=>navigator.share({title:"Join Spy",text:`Join my Spy room ${code}`,url:invite}).catch(()=>{});}
  $("backBtn").onclick=async()=>{if(confirm("Leave this room?")){await C.leaveRoom(code,id);location.href="spy-homepage.html";}};
  $("startGameBtn").onclick=async function(){this.disabled=true;try{const s=await ref.once("value"),room=s.val();const words=await C.getWordPair(room.language,room.roundState?.word);await C.startRound(code,id,words,true);}catch(e){if(String(e?.message)==="HOSTING_TIME_REQUIRED"&&confirm("Your hosting time has ended. Buy more time?"))location.href="https://www.dordor.games/pricing?game=spy";else if(String(e?.message)!=="HOSTING_TIME_REQUIRED")alert(C.message(e));this.disabled=false;}};
  let lastRoom=null;
  ref.on("value",s=>{
    const room=s.val();lastRoom=room;if(!room||room.playersById?.[id]?.removed){location.href="spy-homepage.html";return;}
    const ar=room.language!=="en";document.documentElement.lang=ar?"ar":"en";document.documentElement.dir=ar?"rtl":"ltr";$("waitingText").textContent=ar?"بانتظار انضمام اللاعبين…":"Waiting for players to join…";$("playersTitle").textContent=ar?"اللاعبون:":"Players:";$("startGameText").textContent=ar?"ابدأ اللعبة":"Start Game";$("copyLinkBtn").lastChild.textContent=ar?" نسخ الرابط":" Copy Link";$("copyCodeBtn").lastChild.textContent=ar?" نسخ الرمز":" Copy Code";
    if(room.status==="playing"&&!["lobby","setup"].includes(room.phase)){location.href=`spy-gameplay.html?code=${code}`;return;}
    if(room.status==="ended"){location.href=`spy-finalresults.html?code=${code}`;return;}
    C.claimHost(code,id,false).catch(()=>{});
    const entries=C.activePlayers(room), host=room.hostId, mine=host===id, container=$("playersContainer");container.innerHTML="";
    entries.sort((a,b)=>C.orderedIds(room).indexOf(a[0])-C.orderedIds(room).indexOf(b[0])).forEach(([pid,p])=>{
      const online=C.isOnline(p), el=document.createElement("div");el.className=`player-item ${pid===host?"player-host":""}`;
      const name=document.createElement("span");name.textContent=p.nickname+(online?"":" — reconnecting/offline");el.appendChild(name);
      if(pid===host){const badge=document.createElement("span");badge.className="host-badge";badge.textContent="Host";el.appendChild(badge);}
      if(mine&&pid!==id&&!online){const b=document.createElement("button");b.className="copy-btn";b.textContent="Remove";b.onclick=()=>C.removePlayer(code,id,pid);el.appendChild(b);}
      container.appendChild(el);
    });
    const eligible=C.eligiblePlayers(room).length;$("startGameBtn").disabled=!mine||eligible<3;$("minPlayersText").textContent=mine?(eligible>=3?(ar?"جاهزون للبدء!":"Ready to start!"):(ar?`نحتاج ${3-eligible} لاعب نشط إضافي`:`Need ${3-eligible} more active player(s)`)):(ar?"بانتظار المضيف ليبدأ…":"Waiting for host to start…");
    $("connectionStatus").textContent=room.playersById[id]?.online?"Connected":"Reconnecting…";
    $("spyCountInfo").innerHTML=`<i class="bi bi-bullseye"></i> <strong>${entries.length} players</strong> · ${eligible} ready`;
  });
  setInterval(()=>{if(lastRoom)C.claimHost(code,id,false).catch(()=>{});},5000);
});
