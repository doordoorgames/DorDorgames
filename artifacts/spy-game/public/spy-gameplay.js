document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const C=window.SpyCore,$=id=>document.getElementById(id),code=C.cleanCode(new URLSearchParams(location.search).get("code"));
  if(code.length!==5){location.href="spy-homepage.html";return;}const identity=await C.requireIdentity(code);if(!identity){location.href=`spy-homepage.html?room=${code}`;return;}
  const id=identity.playerId,ref=C.roomRef(code);C.startPresence(code,id);let room=null,selected=null,lastRound=null,botRunKey="",botRun=null,allowPageExit=false;
  const show=(el,on)=>{$(el).style.display=on?"":"none";};
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  $("backButton").onclick=async()=>{if(confirm("Leave the game? Your seat will be marked as left.")){allowPageExit=true;await C.leaveRoom(code,id);location.href="spy-homepage.html";}};
  $("dashboardToggle").onclick=()=>$("pointsDashboard").classList.add("show");$("closeDashboard").onclick=()=>$("pointsDashboard").classList.remove("show");
  $("submitVoteBtn").onclick=async()=>{if(!selected)return;const name=C.playerName(room,selected);if(!confirm(`Lock your vote for ${name}? You cannot change it.`))return;try{await C.submitVote(code,id,selected);}catch(e){alert(C.message(e));}};
  $("guessWordBtn").onclick=()=>show("wordGuessModal",true);$("cancelGuessBtn").onclick=()=>show("wordGuessModal",false);
  $("submitGuessBtn").onclick=async()=>{if(!confirm("Submit this as your only word guess for this round?"))return;try{await C.submitSpyGuess(code,id,$("wordGuessInput").value);show("wordGuessModal",false);}catch(e){alert(C.message(e));}};
  async function continueRound(){try{const words=await C.getWordPair(room.language,room.roundState?.word);await C.startRound(code,id,words,true);}catch(e){alert(C.message(e));}}
  async function endMatch(){if(confirm("End this match? Scores will remain visible until the host starts a new game."))await C.endMatch(code,id);}
  function renderPlayers(){
    const ar=room.language!=="en";
    $("playersListContainer").innerHTML="";const allowed=new Set(C.activePlayers(room).map(([pid])=>pid));C.orderedIds(room).filter(pid=>allowed.has(pid)&&pid!==id).forEach(pid=>{const p=room.playersById[pid],b=document.createElement("button");b.className="player-box";b.disabled=!!room.votes?.[id]||!C.isOnline(p);b.textContent=p.nickname+(C.isOnline(p)?"":" (offline)");if(selected===pid)b.classList.add("selected");b.onclick=()=>{selected=pid;renderPlayers();$("submitVoteBtn").disabled=false;};$("playersListContainer").appendChild(b);});
    const eligible=C.eligiblePlayers(room).map(([pid])=>pid),done=eligible.filter(pid=>room.votes?.[pid]);$("currentVoterDisplay").textContent=room.votes?.[id]?(ar?"تم تثبيت صوتك. بانتظار الآخرين…":"Vote locked. Waiting for others…"):(ar?"اختر لاعبًا ثم أكّد صوتك.":"Choose a player, then confirm your vote.");$("voteCountDisplay").style.display="block";$("voteCountDisplay").textContent=ar?`صوّت ${done.length} من ${eligible.length} لاعبين نشطين`:`${done.length} of ${eligible.length} active players voted`;$("submitVoteBtn").disabled=!!room.votes?.[id]||!selected;
  }
  function renderResult(){
    const ar=room.language!=="en",r=room.result||{},names=(r.spies||[]).map(pid=>C.playerName(room,pid)).join(", ");const labels=ar?{"spies-caught":"تم اكتشاف الجاسوس. يفوز الأبرياء!","spy-guessed-word":"خمّن الجاسوس الكلمة. يفوز الجواسيس!","innocent-eliminated":"تم استبعاد لاعب بريء. يفوز الجواسيس!","tie-no-elimination":"تعادل: لا يتم استبعاد أحد. يفوز الجواسيس بهذه الجولة.","voting-timeout":"انتهى وقت التصويت. لا استبعاد؛ يفوز الجواسيس."}:{"spies-caught":"The spy was caught. Non-spies win!","spy-guessed-word":"A spy guessed the word. Spies win!","innocent-eliminated":"An innocent player was eliminated. Spies win!","tie-no-elimination":"Tie: no player is eliminated. Spies win this round.","voting-timeout":"Voting timed out before all active votes arrived. No elimination; spies win."};
    $("resultsContent").innerHTML=`<p><strong>${esc(labels[r.outcome]||"Round complete")}</strong></p><p>Spy: ${esc(names)}</p><p>Secret word: <strong>${esc(r.word)}</strong></p><p id="roundActions"></p>`;
    const actions=$("roundActions");if(room.hostId===id){const next=document.createElement("button");next.className="action-btn";next.textContent="Continue Match · Fresh Round";next.onclick=continueRound;const end=document.createElement("button");end.className="action-btn spy";end.textContent="End Match";end.onclick=endMatch;actions.append(next,end);}else actions.textContent="Waiting for host to continue or end the match…";
  }
  function render(){
    if(!room)return;if(room.playersById?.[id]?.removed||room.playersById?.[id]?.left){location.href="spy-homepage.html";return;}C.claimHost(code,id,false).catch(()=>{});
    const ar=room.language!=="en";document.documentElement.lang=ar?"ar":"en";document.documentElement.dir=ar?"rtl":"ltr";
    if(room.phase==="lobby"){location.href=`spy-lobby.html?code=${code}`;return;}if(room.status==="ended"||room.phase==="ended"){location.href=`spy-finalresults.html?code=${code}`;return;}
    $("loadingState").style.display="none";$("roundInfo").textContent=`${ar?"الجولة":"Round"} ${room.round||1}`;$("actionInfo").textContent=`${ar?"المرحلة":"Phase"}: ${room.phase}`;
    $("pointsContainer").innerHTML=C.orderedIds(room).map(pid=>`<div class="point-item"><span>${esc(C.playerName(room,pid))}${C.isOnline(room.playersById[pid])?"":" · offline"}</span><strong>${Number(room.playersById[pid]?.score||0)}</strong></div>`).join("");
    if(lastRound!==room.roundId){lastRound=room.roundId;selected=null;$("roleCard").style.display="none";$("secretWordCard").style.display="none";$("spyWordCard").style.display="none";}
    const isSpy=!!room.roundState?.spies?.[id];show("roleCard",true);$("roleTitle").textContent=isSpy?(ar?"أنت الجاسوس":"You are the Spy"):(ar?"أنت لست الجاسوس":"You are not the Spy");$("roleDescription").textContent=isSpy?(ar?"اندمج مع المجموعة ثم حاول تخمين الكلمة السرية.":"Blend in, then guess the secret word."):(ar?"اكتشف الجاسوس دون قول الكلمة مباشرة.":"Find the spy without saying the word directly.");
    show("secretWordCard",!isSpy);show("spyWordCard",isSpy);$("secretWord").textContent=room.roundState?.word||"••••••";
    show("discussionSection",room.phase==="discussion");show("votingSection",room.phase==="voting");show("resultsSection",room.phase==="results");$("gamePhase").textContent=room.phase==="discussion"?(ar?"النقاش — أعطوا التلميحات الآن":"Discussion — give clues now"):room.phase==="voting"?(ar?"التصويت — اختر بعناية":"Voting — choose carefully"):room.phase==="results"?(ar?"نتائج الجولة":"Round results"):(ar?"جارٍ المزامنة…":"Synchronizing…");
    if(room.phase==="voting"){renderPlayers();$("guessWordBtn").style.display=isSpy&&!room.spyGuesses?.[id]?"":"none";}if(room.phase==="results")renderResult();
  }
  addEventListener("beforeunload",event=>{if(room?.status==="playing"&&!allowPageExit){event.preventDefault();event.returnValue="";}});
  ref.on("value",s=>{room=s.val();if(!room){location.href="spy-homepage.html";return;}render();
    if(room.testMode&&room.testControllerId===id&&room.phase==="voting"){
      const key=`${room.roundId}:${room.phaseVersion}`;
      if(botRunKey!==key){botRunKey=key;botRun=C.driveTestBots(code,id).catch(error=>{botRunKey="";console.error("Test bot action failed",error);}).finally(()=>{botRun=null;});}
    }
  });
  setInterval(()=>{if(!room)return;const left=Math.max(0,Number(room.phaseEndsAt||0)-C.now()),text=`${String(Math.floor(left/60000)).padStart(2,"0")}:${String(Math.floor(left/1000)%60).padStart(2,"0")}`;$("timer").textContent=text;$("discussionTimer").textContent=text;if(room.phaseEndsAt&&left<=0)C.advanceExpiredPhase(code).catch(()=>{});C.claimHost(code,id,false).catch(()=>{});},500);
});
