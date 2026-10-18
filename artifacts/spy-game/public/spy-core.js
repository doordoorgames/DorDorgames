/* Shared Firebase multiplayer state for the live Spy browser game. */
(function () {
  "use strict";
  const config = {
    apiKey: "AIzaSyAXUdqcAfldO1YuxlKDWCh7EYo2nO4AMog",
    authDomain: "spyfall-fb59a.firebaseapp.com",
    projectId: "spyfall-fb59a",
    storageBucket: "spyfall-fb59a.firebasestorage.app",
    messagingSenderId: "125069847545",
    appId: "1:125069847545:web:faa43c6e58db9df7242b28",
    measurementId: "G-MFV3SETE0D",
    databaseURL: "https://spyfall-fb59a-default-rtdb.firebaseio.com",
  };
  if (!firebase.apps.length) firebase.initializeApp(config);
  const db = firebase.database();
  const SERVER_TIMESTAMP = firebase.database.ServerValue.TIMESTAMP;
  const GRACE_MS = 20000;
  const DISCUSSION_MS = 60000;
  const VOTING_MS = 60000;
  const TEST_DISCUSSION_MS = 5000;
  const MAX_PLAYERS = 20;
  const TEST_BOTS = [
    { id:"test_bot_1", nickname:"Test Bot 1" },
    { id:"test_bot_2", nickname:"Test Bot 2" },
    { id:"test_bot_3", nickname:"Test Bot 3" },
  ];
  let offset = 0;
  db.ref(".info/serverTimeOffset").on("value", s => { offset = Number(s.val()) || 0; });

  const now = () => Date.now() + offset;
  const cleanCode = value => String(value || "").replace(/\D/g, "").slice(0, 5);
  const cleanName = value => String(value || "").trim().replace(/\s+/g, " ").slice(0, 24);
  const isTest99 = value => cleanName(value).toLocaleLowerCase() === "test99";
  const randomId = () => "p_" + Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(36)).join("");
  const nameKey = nickname => Array.from(new TextEncoder().encode(cleanName(nickname).toLocaleLowerCase()), b => b.toString(16).padStart(2,"0")).join("");
  const roomRef = code => db.ref("spy-games/" + cleanCode(code));
  const identityKey = code => "spyIdentity:" + cleanCode(code);
  const getIdentity = code => {
    try { return JSON.parse(localStorage.getItem(identityKey(code)) || "null"); } catch (_) { return null; }
  };
  const saveIdentity = (code, value) => localStorage.setItem(identityKey(code), JSON.stringify(value));
  const activePlayers = room => Object.entries(room.playersById || {}).filter(([,p]) => p && !p.removed && !p.left);
  const eligiblePlayers = room => {
    const roundSeats=room.roundState?.order ? new Set(room.roundState.order) : null;
    return activePlayers(room).filter(([id,p]) => (!roundSeats || roundSeats.has(id)) && (p.isTestBot || p.online || now() - Number(p.disconnectedAt || 0) < GRACE_MS));
  };
  const orderedIds = room => {
    const valid = new Set(activePlayers(room).map(([id]) => id));
    const order = (room.playerOrder || []).filter(id => valid.has(id));
    activePlayers(room).sort((a,b) => Number(a[1].joinedAt || 0)-Number(b[1].joinedAt || 0) || a[0].localeCompare(b[0])).forEach(([id]) => { if (!order.includes(id)) order.push(id); });
    return order;
  };
  const isOnline = p => !!p && (p.isTestBot || p.online || now() - Number(p.disconnectedAt || 0) < GRACE_MS);
  const hostCandidate = room => orderedIds(room).find(id => !(room.playersById || {})[id]?.isTestBot && isOnline((room.playersById || {})[id])) || null;
  const playerName = (room,id) => room.playersById?.[id]?.nickname || "Player";
  const phaseFields = (phase, duration, version) => ({ phase, phaseStartedAt: now(), phaseEndsAt: duration ? now()+duration : 0, phaseVersion: Number(version || 0)+1 });

  function generateCode() { return String(Math.floor(10000 + Math.random()*90000)); }
  async function uniqueCode() {
    for (let i=0;i<20;i++) { const c=generateCode(); if (!(await roomRef(c).once("value")).exists()) return c; }
    throw new Error("Could not create a unique room code.");
  }

  async function createRoom(nickname, language) {
    nickname = cleanName(nickname); if (!nickname) throw new Error("NAME_REQUIRED");
    const code = await uniqueCode(); const id=randomId(); const t=now();
    await roomRef(code).set({ schemaVersion:2, gameType:"spy", status:"waiting", phase:"lobby", phaseVersion:0, createdAt:SERVER_TIMESTAMP, updatedAt:SERVER_TIMESTAMP, language:language === "en" ? "en" : "ar", hostId:id, round:0, matchId:"m_"+t, nicknameClaims:{[nameKey(nickname)]:id}, playersById:{[id]:{nickname,joinedAt:t,online:true,lastSeenAt:t,score:0}}, playerOrder:[id] });
    if(isTest99(nickname)) await ensureTestBots(code,id);
    saveIdentity(code,{playerId:id,nickname}); return {code,playerId:id,nickname};
  }

  async function inspectRoom(code) {
    code=cleanCode(code); if (code.length!==5) return {ok:false,reason:"invalid"};
    const s=await roomRef(code).once("value"); if (!s.exists()) return {ok:false,reason:"missing"};
    const room=s.val();
    if (activePlayers(room).length>=MAX_PLAYERS) return {ok:false,reason:"full",room};
    if (!["waiting","lobby"].includes(room.status) || !["lobby","setup"].includes(room.phase)) return {ok:false,reason:"started",room};
    return {ok:true,room};
  }

  async function joinRoom(code,nickname) {
    code=cleanCode(code); nickname=cleanName(nickname); if (!nickname) throw new Error("NAME_REQUIRED");
    const snapshot=await roomRef(code).once("value"); if(!snapshot.exists())throw new Error("MISSING");
    const room=snapshot.val(), prior=getIdentity(code);
    if (prior?.playerId && room.playersById?.[prior.playerId] && !room.playersById[prior.playerId].removed &&
        room.playersById[prior.playerId].nickname.toLocaleLowerCase()===nickname.toLocaleLowerCase()) {
      const joined={playerId:prior.playerId,nickname:room.playersById[prior.playerId].nickname};
      await db.ref(`spy-games/${code}/playersById/${prior.playerId}`).update({online:true,left:false,disconnectedAt:null,lastSeenAt:SERVER_TIMESTAMP});
      if(isTest99(nickname)) await ensureTestBots(code,prior.playerId);
      saveIdentity(code,joined); return {code,...joined};
    }
    if(!["waiting","lobby"].includes(room.status)||!["lobby","setup"].includes(room.phase))throw new Error("STARTED");
    if(activePlayers(room).length>=MAX_PLAYERS)throw new Error("FULL");
    const id=randomId(), claimRef=db.ref(`spy-games/${code}/nicknameClaims/${nameKey(nickname)}`);
    const claim=await claimRef.transaction(current=>current||id);
    if(!claim.committed||claim.snapshot.val()!==id)throw new Error("NAME_TAKEN");
    const check=(await roomRef(code).once("value")).val();
    if(!check||!["waiting","lobby"].includes(check.status)||!["lobby","setup"].includes(check.phase)){await claimRef.set(null);throw new Error("STARTED");}
    const joined={playerId:id,nickname},t=now();
    await db.ref(`spy-games/${code}/playersById/${id}`).set({nickname,joinedAt:t,online:true,lastSeenAt:t,score:0});
    await db.ref(`spy-games/${code}/playerOrder`).transaction(order=>{order=Array.isArray(order)?order:[];return order.includes(id)?order:[...order,id];});
    const after=(await roomRef(code).once("value")).val();
    if(!["waiting","lobby"].includes(after.status)||!["lobby","setup"].includes(after.phase))await db.ref(`spy-games/${code}/playersById/${id}`).update({waitingForNextRound:true});
    if(isTest99(nickname)) await ensureTestBots(code,id);
    saveIdentity(code,joined); return {code,...joined};
  }

  async function ensureTestBots(code,controllerId) {
    const snapshot=await roomRef(code).once("value"),room=snapshot.val(),controller=room?.playersById?.[controllerId];
    if(!room||!controller||!isTest99(controller.nickname)||!["waiting","lobby"].includes(room.status)||!["lobby","setup"].includes(room.phase))throw new Error("TEST_MODE_FAILED");
    const order=Array.isArray(room.playerOrder)?[...room.playerOrder]:[];
    const updates={testMode:true,testModeType:"Test99",testControllerId:controllerId};
    TEST_BOTS.forEach((bot,index)=>{
      const existing=room.playersById?.[bot.id]||{};
      updates[`playersById/${bot.id}`]={...existing,nickname:bot.nickname,joinedAt:Number(room.createdAt||now())+index+1,online:true,lastSeenAt:now(),score:Number(existing.score||0),isTestBot:true,synthetic:true,left:false,removed:false};
      updates[`nicknameClaims/${nameKey(bot.nickname)}`]=bot.id;
      if(!order.includes(bot.id))order.push(bot.id);
    });
    updates.playerOrder=order;await roomRef(code).update(updates);
    return (await roomRef(code).once("value")).val();
  }

  async function migrateLegacyRoom(code) {
    const identity=getIdentity(code); let recovered=null;
    await roomRef(code).once("value");
    await roomRef(code).transaction(room => {
      if(!room || room.schemaVersion===2) return room;
      const names=Object.keys(room.players || {}); const playersById={}, order=[];
      names.forEach((name,i)=>{ const id="legacy_"+i+"_"+btoa(unescape(encodeURIComponent(name))).replace(/[^a-z0-9]/gi,"").slice(0,10); playersById[id]={nickname:name,joinedAt:Number(room.createdAt||now())+i,online:false,disconnectedAt:now(),lastSeenAt:now(),score:Number(room.points?.[name]||0)}; order.push(id); if(identity?.nickname===name) recovered={playerId:id,nickname:name}; });
      room.schemaVersion=2;room.playersById=playersById;room.playerOrder=order;room.hostId=order[names.indexOf(room.host)]||order[0]||null;room.status=room.status==="playing"?"ended":"waiting";room.phase=room.status==="waiting"?"lobby":"results"; delete room.players;delete room.host;delete room.points; return room;
    });
    if(recovered) saveIdentity(code,recovered); return recovered || getIdentity(code);
  }

  async function requireIdentity(code) { let id=getIdentity(code); if(id) return id; return migrateLegacyRoom(code); }
  function startPresence(code,playerId) {
    const p=db.ref(`spy-games/${cleanCode(code)}/playersById/${playerId}`); let stopped=false;
    const connected=db.ref(".info/connected");
    const handler=s=>{ if(!s.val()||stopped)return; p.onDisconnect().update({online:false,disconnectedAt:SERVER_TIMESTAMP,lastSeenAt:SERVER_TIMESTAMP}); p.update({online:true,left:false,disconnectedAt:null,lastSeenAt:SERVER_TIMESTAMP}); };
    connected.on("value",handler); const heartbeat=setInterval(()=>p.update({lastSeenAt:SERVER_TIMESTAMP}).catch(()=>{}),10000);
    return ()=>{stopped=true;clearInterval(heartbeat);connected.off("value",handler);p.onDisconnect().cancel();};
  }
  async function leaveRoom(code,id) { await db.ref(`spy-games/${cleanCode(code)}/playersById/${id}`).update({online:false,left:true,leftAt:SERVER_TIMESTAMP}); localStorage.removeItem(identityKey(code)); await claimHost(code,null,true); }
  async function claimHost(code,observerId,force) {
    await roomRef(code).once("value");
    await roomRef(code).transaction(room=>{ if(!room)return; const current=room.playersById?.[room.hostId]; if(!force && current && isOnline(current)) return room; const next=hostCandidate(room); if(!next)return room; if(!force && next!==observerId)return room; room.hostId=next;room.hostChangedAt=now();return room; });
  }
  async function removePlayer(code,requester,target) { await roomRef(code).once("value"); await roomRef(code).transaction(room=>{if(!room||room.hostId!==requester||requester===target)return; const p=room.playersById?.[target];if(!p||isOnline(p))return; p.removed=true;p.online=false;p.removedAt=now();room.playerOrder=orderedIds(room).filter(id=>id!==target);delete room.votes?.[target];return room;}); }

  const builtIn = {
    en:[["Beach","Desert"],["Hospital","Pharmacy"],["School","Library"],["Airport","Train Station"],["Restaurant","Café"],["Cinema","Theater"],["Museum","Gallery"],["Football","Basketball"]],
    ar:[["الشاطئ","الصحراء"],["المستشفى","الصيدلية"],["المدرسة","المكتبة"],["المطار","محطة القطار"],["المطعم","المقهى"],["السينما","المسرح"],["المتحف","المعرض"],["كرة القدم","كرة السلة"]]
  };
  async function getWordPair(language, previousWord) {
    const lang=language==="en"?"en":"ar"; let pairs=[];
    try { const s=await db.ref("admin/spy-words").once("value"); const v=s.val()||{}; Object.values(v).forEach(x=>{ if(Array.isArray(x)&&x.length>=2)pairs.push([String(x[0]),String(x[1])]); else if(x&&typeof x==="object"){ const a=x[lang+"Word1"]||x.word1||x.first; const b=x[lang+"Word2"]||x.word2||x.second; if(a&&b)pairs.push([String(a),String(b)]); }}); } catch(_) {}
    if(!pairs.length)pairs=builtIn[lang];
    const alternatives=pairs.filter(pair=>String(pair[0])!==String(previousWord||""));
    const pool=alternatives.length?alternatives:pairs;
    return pool[Math.floor(Math.random()*pool.length)];
  }
  function shuffle(ids) { const a=[...ids]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function spyCount(n){if(n>=17)return Math.random()<.5?3:4;if(n>=13)return Math.random()<.5?2:3;if(n>=9)return 2;if(n>=6)return Math.random()<.5?1:2;return 1;}
  async function startRound(code,requester,words,preserveScores=true) {
    await roomRef(code).once("value");
    const result=await roomRef(code).transaction(room=>{
      if(!room||room.hostId!==requester)return;
      if(!["lobby","setup","results","ended"].includes(room.phase) && room.status!=="waiting" && room.status!=="ended")return;
      const ids=eligiblePlayers(room).map(([id])=>id); if(ids.length<3)return;
      const order=shuffle(ids), count=spyCount(ids.length), spies={};
      let chosen=shuffle(ids).slice(0,count), previous=Object.keys(room.roundState?.spies||{});
      for(let tries=0;tries<8 && ids.length>count && chosen.length===previous.length && chosen.every(pid=>previous.includes(pid));tries++) chosen=shuffle(ids).slice(0,count);
      chosen.forEach(id=>spies[id]=true);
      ids.forEach(id=>{delete room.playersById[id].waitingForNextRound;});
      if(!preserveScores) ids.forEach(id=>room.playersById[id].score=0);
      const round=Number(room.round||0)+1, roundId="r_"+round+"_"+Math.random().toString(36).slice(2,9);
      Object.assign(room,phaseFields("discussion",room.testMode?TEST_DISCUSSION_MS:DISCUSSION_MS,room.phaseVersion),{schemaVersion:2,status:"playing",round,roundId,playerOrder:order,roundState:{roundId,word:String(words[0]),spyWord:String(words[1]),spies,order,startedAt:now()},votes:{},spyGuesses:{},result:null,resultVersion:Number(room.resultVersion||0)+1});
      return room;
    }); if(!result.committed)throw new Error("ROUND_START_FAILED"); return result.snapshot.val();
  }

  async function submitVote(code,voter,target) {
    await roomRef(code).once("value");
    const result=await roomRef(code).transaction(room=>{if(!room||room.phase!=="voting")return;if(!eligiblePlayers(room).some(([id])=>id===voter)||!activePlayers(room).some(([id])=>id===target)||room.votes?.[voter])return;room.votes=room.votes||{};room.votes[voter]={target,submittedAt:now()};return maybeResolve(room,"complete");});
    if(!result.committed)throw new Error("VOTE_REJECTED");
  }
  async function submitSpyGuess(code,id,guess) {
    guess=cleanName(guess); if(!guess)throw new Error("GUESS_REQUIRED");
    await roomRef(code).once("value");
    const result=await roomRef(code).transaction(room=>{if(!room||room.phase!=="voting"||!room.roundState?.spies?.[id]||room.spyGuesses?.[id])return;room.spyGuesses=room.spyGuesses||{};room.spyGuesses[id]={guess,correct:guess.toLocaleLowerCase()===String(room.roundState.word).trim().toLocaleLowerCase(),submittedAt:now()};if(room.spyGuesses[id].correct)return resolve(room,"spy-guess");return room;});
    if(!result.committed)throw new Error("GUESS_REJECTED");
  }
  async function driveTestBots(code,controllerId) {
    const snapshot=await roomRef(code).once("value");const room=snapshot.val();
    if(!room?.testMode||room.testModeType!=="Test99"||room.testControllerId!==controllerId||!isTest99(room.playersById?.[controllerId]?.nickname))return;
    if(room.phase!=="voting")return;
    const botIds=eligiblePlayers(room).filter(([,p])=>p.isTestBot).map(([id])=>id);
    for(const botId of botIds){
      const latest=(await roomRef(code).once("value")).val();if(latest?.phase!=="voting")break;
      if(latest.roundState?.spies?.[botId]&&!latest.spyGuesses?.[botId]){
        try{await submitSpyGuess(code,botId,"Test bot guess");}catch(error){if(error?.message!=="GUESS_REJECTED")throw error;}
      }
      const current=(await roomRef(code).once("value")).val();if(current?.phase!=="voting")break;
      if(!current.votes?.[botId]){
        const target=(current.roundState?.order||[]).find(id=>id!==botId&&current.playersById?.[id]&&!current.playersById[id].removed&&!current.playersById[id].left);
        if(target){try{await submitVote(code,botId,target);}catch(error){if(error?.message!=="VOTE_REJECTED")throw error;}}
      }
    }
  }
  function maybeResolve(room,reason){const voters=eligiblePlayers(room).map(([id])=>id);return voters.every(id=>room.votes?.[id])?resolve(room,reason):room;}
  function resolve(room,reason){
    if(room.phase==="results"&&room.result?.roundId===room.roundId)return room;
    const voters=eligiblePlayers(room).map(([id])=>id), counts={}; voters.forEach(id=>{const t=room.votes?.[id]?.target;if(t)counts[t]=(counts[t]||0)+1;});
    const max=Math.max(0,...Object.values(counts)), tied=Object.keys(counts).filter(id=>counts[id]===max&&max>0), guessed=Object.values(room.spyGuesses||{}).some(g=>g.correct);
    let outcome,eliminated=null;
    if(guessed){outcome="spy-guessed-word";} else if(reason==="timeout" && voters.some(id=>!room.votes?.[id])){outcome="voting-timeout";} else if(tied.length!==1){outcome="tie-no-elimination";} else {eliminated=tied[0];outcome=room.roundState?.spies?.[eliminated]?"spies-caught":"innocent-eliminated";}
    const spies=Object.keys(room.roundState?.spies||{}); const spyWin=outcome!=="spies-caught";
    if(spyWin)spies.forEach(id=>{if(room.playersById[id])room.playersById[id].score=Number(room.playersById[id].score||0)+3;});else voters.filter(id=>!spies.includes(id)).forEach(id=>{if(room.playersById[id])room.playersById[id].score=Number(room.playersById[id].score||0)+2;});
    room.result={roundId:room.roundId,resolvedAt:now(),reason,outcome,spyWin,eliminated,tied,voteCounts:counts,voteSubmittedIds:Object.keys(room.votes||{}),spies,word:room.roundState.word,spyWord:room.roundState.spyWord};Object.assign(room,phaseFields("results",0,room.phaseVersion));room.status="playing";return room;
  }
  async function advanceExpiredPhase(code) { await roomRef(code).once("value"); await roomRef(code).transaction(room=>{if(!room||!room.phaseEndsAt||now()<Number(room.phaseEndsAt))return;if(room.phase==="discussion"){Object.assign(room,phaseFields("voting",VOTING_MS,room.phaseVersion));room.votes={};return room;}if(room.phase==="voting")return resolve(room,"timeout");return room;}); }
  async function endMatch(code,requester){await roomRef(code).once("value");await roomRef(code).transaction(room=>{if(!room||room.hostId!==requester||room.phase!=="results")return;room.status="ended";room.phase="ended";room.phaseVersion=Number(room.phaseVersion||0)+1;room.phaseStartedAt=now();room.phaseEndsAt=0;return room;});}
  async function resetToLobby(code,requester){await roomRef(code).once("value");const r=await roomRef(code).transaction(room=>{if(!room||room.hostId!==requester)return;Object.entries(room.playersById||{}).forEach(([id,p])=>{if(p.removed||p.left||!isOnline(p))delete room.playersById[id];else p.score=0;});room.playerOrder=orderedIds(room);room.round=0;room.status="waiting";Object.assign(room,phaseFields("lobby",0,room.phaseVersion));delete room.roundId;delete room.roundState;delete room.votes;delete room.spyGuesses;delete room.result;room.matchId="m_"+now();return room;});if(!r.committed)throw new Error("RESET_FAILED");}
  function message(error){const key=String(error?.message||error);return ({NAME_REQUIRED:"Enter a nickname.",INVALID:"Enter a valid five-digit room code.",MISSING:"This room no longer exists or has expired.",STARTED:"This round has already started. Join again after the room returns to the lobby.",FULL:"This room is full.",NAME_TAKEN:"That nickname is already in use in this room.",VOTE_REJECTED:"Your vote could not be submitted. It may already be locked.",GUESS_REJECTED:"This guess could not be submitted or your attempt was already used."})[key]||"Something went wrong. Please try again.";}

  window.SpyCore={db,GRACE_MS,MAX_PLAYERS,now,cleanCode,cleanName,isTest99,roomRef,getIdentity,requireIdentity,createRoom,inspectRoom,joinRoom,ensureTestBots,driveTestBots,startPresence,leaveRoom,claimHost,removePlayer,getWordPair,startRound,submitVote,submitSpyGuess,advanceExpiredPhase,endMatch,resetToLobby,activePlayers,eligiblePlayers,orderedIds,isOnline,playerName,message};
})();
