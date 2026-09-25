import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, addDoc, query, where, orderBy,
  serverTimestamp, arrayUnion, arrayRemove, writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBcmpslsqjlwp5JDABBa4P3BlaKEmPL1kw",
  authDomain: "taskroom-736c1.firebaseapp.com",
  projectId: "taskroom-736c1",
  storageBucket: "taskroom-736c1.firebasestorage.app",
  messagingSenderId: "595374705736",
  appId: "1:595374705736:web:77527d0891742c2c2a9c7d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const A = document.getElementById("app");
let currentUser = null;
let rid = null, ti = 0, si = 0;
let roomCache = null, tabCache = [], subCache = [], taskCache = [];

const val = i => document.getElementById(i)?.value.trim() || "";
const esc = x => String(x ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const id = p => p + "_" + Math.random().toString(36).slice(2,9);
const B = (t,f,c="btn") => `<button class="${c}" onclick="${f}">${t}</button>`;
const ts = x => x?.toDate ? x.toDate() : null;

function shell(x){
  A.innerHTML = `<header class="top"><b class="brand">✓ TaskRoom</b><div>${currentUser ? B("Home","home()")+B("Logout","logout()") : ""}</div></header><main class="page">${x}</main>`;
}
function field(label,id,type="text",placeholder=""){return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" placeholder="${esc(placeholder)}"></div>`}
function loading(t="Loading…"){A.innerHTML=`<div class="loading">${esc(t)}</div>`}
function friendlyError(e){
  const m = e?.code || e?.message || "Unknown error";
  const map = {
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/email-already-in-use":"That email is already registered.",
    "auth/weak-password":"Use a stronger password.",
    "auth/invalid-email":"Please enter a valid email address.",
    "permission-denied":"Firebase denied this action. Check the Firestore rules."
  };
  return map[m] || (m.includes("permission-denied") ? map["permission-denied"] : m);
}
function showError(e){console.error(e);alert(friendlyError(e));}

function welcome(){
  shell(`<div class="hero card"><div style="font-size:55px">✓</div><h1>TaskRoom</h1><p class="muted">Organize tasks. Work together. Track progress.</p><div class="row" style="justify-content:center">${B("Create account","register()","btn primary")}${B("Log in","login()")}</div></div>`);
}
function login(){shell(`<div class="card form-card"><h2>Log in</h2>${field("Email","email","email")}${field("Password","password","password")}${B("Log in","doLogin()","btn primary")}</div>`)}
function register(){shell(`<div class="card form-card"><h2>Create account</h2>${field("Name","name")}${field("Email","email","email")}${field("Password","password","password","At least 6 characters")}${B("Create account","doRegister()","btn primary")}</div>`)}

async function doRegister(){
  const n=val("name"), e=val("email").toLowerCase(), p=val("password");
  if(!n||!e||p.length<6)return alert("Enter name, email and a password of at least 6 characters.");
  try{
    const cred=await createUserWithEmailAndPassword(auth,e,p);
    await updateProfile(cred.user,{displayName:n});
    await setDoc(doc(db,"users",cred.user.uid),{name:n,email:e,roomIds:[],createdAt:serverTimestamp()});
    currentUser=cred.user; await home();
  }catch(e){showError(e)}
}
async function doLogin(){
  const e=val("email").toLowerCase(),p=val("password");
  if(!e||!p)return alert("Enter email and password.");
  try{await signInWithEmailAndPassword(auth,e,p)}catch(e){showError(e)}
}
async function logout(){await signOut(auth)}

async function getUserDoc(){
  if(!currentUser)return null;
  const s=await getDoc(doc(db,"users",currentUser.uid));
  return s.exists()?s.data():{name:currentUser.displayName||"User",email:currentUser.email,roomIds:[]};
}
async function home(){
  if(!currentUser)return welcome();
  loading("Loading your rooms…");
  try{
    const u=await getUserDoc(), ids=u.roomIds||[];
    const rooms=[];
    const validRoomIds=[];
    for(const id0 of ids){
      const s=await getDoc(doc(db,"rooms",id0));
      if(!s.exists()) continue;
      const r=s.data();
      if(r.host===currentUser.uid){
        rooms.push({id:id0,...r});
        validRoomIds.push(id0);
        continue;
      }
      try{
        const m=await getDoc(doc(db,"rooms",id0,"members",currentUser.uid));
        if(m.exists()){
          rooms.push({id:id0,...r});
          validRoomIds.push(id0);
        }
      }catch(e){
        // Stale roomIds from an incomplete old join are ignored.
      }
    }
    if(validRoomIds.length !== ids.length){
      await updateDoc(doc(db,"users",currentUser.uid),{roomIds:validRoomIds});
    }
    shell(`<div class="row between"><div><h2>Hello, ${esc(u.name||currentUser.displayName||"User")} 👋</h2><p class="muted">Create or join a room.</p></div><div>${B("+ Create room","createRoomModal()","btn primary")}${B("Join room","joinRoomModal()")}</div></div>
      <div class="grid g2" style="margin-top:15px">${rooms.length?rooms.map(r=>`<div class="card"><div class="row between"><h3>${esc(r.name)}</h3><span class="badge">${r.host===currentUser.uid?"HOST":"MEMBER"}</span></div><p class="muted">Room ID: <b>${esc(r.code)}</b></p>${B("Open room",`openRoom('${r.id}')`,"btn primary")}</div>`).join(""):`<div class="card empty">No rooms yet.</div>`}</div>`);
  }catch(e){showError(e);welcome()}
}

function modal(title,body){const d=document.createElement("div");d.className="modal";d.innerHTML=`<div><div class="row between"><h2>${title}</h2>${B("×","this.closest('.modal').remove()")}</div>${body}</div>`;document.body.appendChild(d)}
function createRoomModal(){modal("Create room",field("Room name","roomName")+field("Room password","roomPass","password","Used when members join")+B("Create room","createRoom()","btn primary"))}
function joinRoomModal(){modal("Join room",field("Room ID","joinCode","text","6-digit Room ID")+field("Room password","joinPass","password")+B("Join room","joinRoom()","btn primary"))}

async function sha256(text){
  const bytes=new TextEncoder().encode(text), hash=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function createRoom(){
  const n=val("roomName"),p=val("roomPass"); if(!n||!p)return alert("Room name and password are required.");
  try{
    let code, exists=true;
    while(exists){code=String(Math.floor(100000+Math.random()*900000));exists=(await getDoc(doc(db,"roomCodes",code))).exists()}
    const roomRef=doc(collection(db,"rooms"));
    const passwordHash=await sha256(p);

    // Create the room as its own write first. The security rules use the
    // saved room document to verify host/member permissions for later writes.
    await setDoc(roomRef,{name:n,code,host:currentUser.uid,createdAt:serverTimestamp()});

    // Now add the room code, host membership, and user's room list.
    const metaBatch=writeBatch(db);
    metaBatch.set(doc(db,"roomCodes",code),{roomId:roomRef.id,passwordHash,createdAt:serverTimestamp()});
    metaBatch.set(doc(db,"rooms",roomRef.id,"members",currentUser.uid),{role:"host",joinedAt:serverTimestamp()});
    metaBatch.update(doc(db,"users",currentUser.uid),{roomIds:arrayUnion(roomRef.id)});
    await metaBatch.commit();

    // Now create the default main tab and exactly 6 sub-tabs.
    const setupBatch=writeBatch(db);
    const tabRef=doc(collection(roomRef,"tabs"));
    setupBatch.set(tabRef,{name:"Study",order:0,createdAt:serverTimestamp()});
    for(let i=1;i<=6;i++){
      setupBatch.set(doc(collection(tabRef,"subs")),{name:"Sub-tab "+i,order:i-1});
    }
    await setupBatch.commit();

    document.querySelector(".modal")?.remove(); await openRoom(roomRef.id);
  }catch(e){showError(e)}
}
async function joinRoom(){
  const code=val("joinCode"),p=val("joinPass");
  if(!code||!p)return alert("Enter Room ID and password.");
  try{
    const codeSnap=await getDoc(doc(db,"roomCodes",code));
    if(!codeSnap.exists())return alert("Room ID or password is incorrect.");

    const codeData=codeSnap.data();
    const hash=await sha256(p);
    if(hash!==codeData.passwordHash)return alert("Room ID or password is incorrect.");

    const memberRef=doc(db,"rooms",codeData.roomId,"members",currentUser.uid);
    try{
      // A new member creates their own membership. If it already exists,
      // the user is already a member and we can safely continue.
      await setDoc(memberRef,{role:"member",joinedAt:serverTimestamp()});
    }catch(memberErr){
      if(memberErr?.code !== "already-exists") throw memberErr;
    }

    await updateDoc(doc(db,"users",currentUser.uid),{roomIds:arrayUnion(codeData.roomId)});
    document.querySelector(".modal")?.remove();
    await openRoom(codeData.roomId);
  }catch(e){showError(e)}
}

async function openRoom(id0){rid=id0;ti=0;si=0;await loadRoom();}
async function loadRoom(){
  if(!rid)return;
  loading("Loading room…");
  try{
    const r=await getDoc(doc(db,"rooms",rid)); if(!r.exists())return home();
    roomCache={id:rid,...r.data()};
    const [tabsSnap]=await Promise.all([getDocs(query(collection(db,"rooms",rid,"tabs"),orderBy("order")))]);
    tabCache=tabsSnap.docs.map(x=>({id:x.id,...x.data()}));
    if(!tabCache.length){return alert("This room has no tabs.")}
    if(ti>=tabCache.length)ti=0;
    const subSnap=await getDocs(query(collection(db,"rooms",rid,"tabs",tabCache[ti].id,"subs"),orderBy("order")));
    subCache=subSnap.docs.map(x=>({id:x.id,...x.data()}));
    if(si>=subCache.length)si=0;
    await loadTasks(); renderRoom();
  }catch(e){showError(e);home()}
}
async function loadTasks(){
  const s=subCache[si]; if(!s){taskCache=[];return}
  const snap=await getDocs(collection(db,"rooms",rid,"tabs",tabCache[ti].id,"subs",s.id,"tasks"));
  taskCache=snap.docs.map(x=>({id:x.id,...x.data()}));
}
function isHost(){return roomCache?.host===currentUser?.uid}

async function renderRoom(){
  if(!roomCache)return;
  const t=tabCache[ti],s=subCache[si];
  const membersSnap=await getDocs(collection(db,"rooms",rid,"members"));
  const members=membersSnap.docs.map(x=>({id:x.id,...x.data()}));
  const memberUsers={};
  for(const m of members){const u=await getDoc(doc(db,"users",m.id));if(u.exists())memberUsers[m.id]=u.data()}
  let html=`<div class="row between"><div><h2>${esc(roomCache.name)}</h2><small class="muted">Room ID: ${esc(roomCache.code)} • ${isHost()?"HOST":"MEMBER"}</small></div><div class="row">${isHost()?B("+ Task","taskModal()","btn primary"):""}${isHost()?B("Delete room","deleteRoom()","btn danger"):""}</div></div>`;
  html+=`<div class="tabs">${tabCache.map((x,i)=>`<button class="tab ${i===ti?"active":""}" onclick="switchTab(${i})">${esc(x.name)}</button>`).join("")}${isHost()?B("+ Tab","addMainTab()","btn"):""}</div>`;
  html+=`<div class="subs">${subCache.map((x,i)=>{const count=taskCache.filter(z=>z.assigned===currentUser.uid&&z.status!=="approved").length;return `<div class="sub-wrap"><button class="sub ${i===si?"active":""}" onclick="switchSub(${i})"><b>${esc(x.name)}</b><br><small>${i===si?count:""} active</small></button>${isHost()?`<button class="sub-edit" title="Rename sub-tab" onclick="event.stopPropagation();renameSubTab(${i})">✎</button>`:""}</div>`}).join("")}</div>`;
  html+=isHost()?hostView(memberUsers):memberView();
  shell(html);
}
function memberView(){
  const active=taskCache.filter(t=>t.assigned===currentUser.uid&&(t.status==="pending"||t.status==="returned"));
  return `<div class="card" style="margin-top:15px"><h3>My tasks</h3>${active.length?active.map(t=>`<div class="task"><input type="checkbox" onchange="completeTask('${t.id}')"><div><b>${esc(t.title)}</b><div class="muted">${esc(t.desc)}</div>${t.status==="returned"?`<small class="badge returned">Returned${t.reason?": "+esc(t.reason):""}</small>`:""}</div></div>`).join(""):`<div class="empty">No active tasks 🎉</div>`}</div>`;
}
function hostView(memberUsers){
  const sorted=[...taskCache].sort((a,b)=>(a.status==="approved")-(b.status==="approved"));
  return `<div class="card" style="margin-top:15px"><div class="row between"><h3>Host review</h3><span class="badge">${taskCache.length} total</span></div>${sorted.length?sorted.map(t=>{const u=memberUsers[t.assigned];return `<div class="task"><div style="flex:1"><b>${esc(t.title)}</b><div class="muted">${esc(u?.name||"Member")} • ${esc(t.desc)}</div><span class="badge ${t.status}">${t.status}</span>${t.reason?`<div class="muted">Reason: ${esc(t.reason)}</div>`:""}</div><div class="row">${t.status==="completed"?B("Approve",`approveTask('${t.id}')`,"btn success")+B("Return",`returnTask('${t.id}')`,"btn danger"):""}${B("Delete",`deleteTask('${t.id}')`)}</div></div>`}).join(""):`<div class="empty">No tasks.</div>`}</div>`;
}
function taskModal(){
  const members=[];
  modal("Create task",field("Task title","taskTitle")+field("Description","taskDesc")+`<div class="field"><label>Assign to member</label><select id="assign"><option value="">Loading members…</option></select></div>${B("Create task","createTask()","btn primary")}`);
  getDocs(collection(db,"rooms",rid,"members")).then(async snap=>{
    const opts=[];for(const d of snap.docs){if(d.data().role!=="member")continue;const u=await getDoc(doc(db,"users",d.id));const name=u.exists()?(u.data().name||u.data().email):d.id;const count=taskCache.filter(t=>t.assigned===d.id&&t.status!=="approved").length;opts.push(`<option value="${d.id}" ${count>=35?"disabled":""}>${esc(name)} (${count}/35)</option>`)}
    const sel=document.getElementById("assign");if(sel)sel.innerHTML=opts.length?opts.join(""):`<option value="">No members yet</option>`;
  });
}
async function createTask(){
  const assigned=document.getElementById("assign")?.value,title=val("taskTitle");
  if(!assigned)return alert("Add a member first."); if(!title)return alert("Task title is required.");
  const count=taskCache.filter(t=>t.assigned===assigned&&t.status!=="approved").length;if(count>=35)return alert("This member already has 35 active tasks in this sub-tab.");
  try{await addDoc(collection(db,"rooms",rid,"tabs",tabCache[ti].id,"subs",subCache[si].id,"tasks"),{title,desc:val("taskDesc"),assigned,status:"pending",reason:"",createdAt:serverTimestamp()});document.querySelector(".modal")?.remove();await loadTasks();renderRoom()}catch(e){showError(e)}
}
async function completeTask(taskId){
  try{await updateDoc(doc(db,"rooms",rid,"tabs",tabCache[ti].id,"subs",subCache[si].id,"tasks",taskId),{status:"completed",completedAt:serverTimestamp()});await loadTasks();renderRoom()}catch(e){showError(e)}
}
async function approveTask(taskId){try{await updateDoc(doc(db,"rooms",rid,"tabs",tabCache[ti].id,"subs",subCache[si].id,"tasks",taskId),{status:"approved",reviewedAt:serverTimestamp(),reason:""});await loadTasks();renderRoom()}catch(e){showError(e)}}
async function returnTask(taskId){const reason=prompt("Why are you returning this task?")||"";try{await updateDoc(doc(db,"rooms",rid,"tabs",tabCache[ti].id,"subs",subCache[si].id,"tasks",taskId),{status:"returned",reason,reviewedAt:serverTimestamp()});await loadTasks();renderRoom()}catch(e){showError(e)}}
async function deleteTask(taskId){if(!confirm("Delete this task?"))return;try{await deleteDoc(doc(db,"rooms",rid,"tabs",tabCache[ti].id,"subs",subCache[si].id,"tasks",taskId));await loadTasks();renderRoom()}catch(e){showError(e)}}

async function deleteRoom(){
  if(!isHost())return;
  const roomId=rid, roomName=roomCache?.name||"this room", code=roomCache?.code;
  if(!confirm(`Delete room "${roomName}" permanently?\n\nThis will remove the room, members, tabs, sub-tabs and tasks. This cannot be undone.`))return;
  try{
    loading("Deleting room…");

    const tabsSnap=await getDocs(collection(db,"rooms",roomId,"tabs"));
    for(const tab of tabsSnap.docs){
      const subsSnap=await getDocs(collection(db,"rooms",roomId,"tabs",tab.id,"subs"));
      for(const sub of subsSnap.docs){
        const tasksSnap=await getDocs(collection(db,"rooms",roomId,"tabs",tab.id,"subs",sub.id,"tasks"));
        for(const task of tasksSnap.docs){
          await deleteDoc(doc(db,"rooms",roomId,"tabs",tab.id,"subs",sub.id,"tasks",task.id));
        }
        await deleteDoc(doc(db,"rooms",roomId,"tabs",tab.id,"subs",sub.id));
      }
      await deleteDoc(doc(db,"rooms",roomId,"tabs",tab.id));
    }

    const membersSnap=await getDocs(collection(db,"rooms",roomId,"members"));
    for(const member of membersSnap.docs){
      await deleteDoc(member.ref);
    }

    // Clean the host's own room list before removing the room. Other users'
    // stale IDs are automatically ignored by Home because the room is gone.
    await updateDoc(doc(db,"users",currentUser.uid),{roomIds:arrayRemove(roomId)});

    if(code)await deleteDoc(doc(db,"roomCodes",code));
    await deleteDoc(doc(db,"rooms",roomId));

    rid=null; roomCache=null; tabCache=[]; subCache=[]; taskCache=[];
    await home();
    alert("Room deleted successfully.");
  }catch(e){showError(e);await home();}
}

async function addMainTab(){
  const name=prompt("Main tab name");if(!name)return;
  try{
    const batch=writeBatch(db);
    const tabRef=doc(collection(db,"rooms",rid,"tabs"));
    batch.set(tabRef,{name,order:tabCache.length,createdAt:serverTimestamp()});
    for(let i=1;i<=6;i++){
      const subRef=doc(collection(tabRef,"subs"));
      batch.set(subRef,{name:`Sub-tab ${i}`,order:i-1});
    }
    await batch.commit();
    await loadRoom();
  }catch(e){showError(e)}
}
async function renameSubTab(i){
  if(!isHost())return;
  const current=subCache[i];
  if(!current)return;
  const name=prompt("Enter new sub-tab name",current.name||"")?.trim();
  if(!name || name===current.name)return;
  try{
    await updateDoc(doc(db,"rooms",rid,"tabs",tabCache[ti].id,"subs",current.id),{name});
    await loadRoom();
  }catch(e){showError(e)}
}
async function switchTab(i){ti=i;si=0;await loadRoom()}
async function switchSub(i){si=i;await loadRoom()}

window.register=register;window.login=login;window.doRegister=doRegister;window.doLogin=doLogin;window.logout=logout;window.home=home;
window.createRoomModal=createRoomModal;window.joinRoomModal=joinRoomModal;window.createRoom=createRoom;window.joinRoom=joinRoom;
window.openRoom=openRoom;window.renameSubTab=renameSubTab;window.taskModal=taskModal;window.createTask=createTask;window.completeTask=completeTask;window.approveTask=approveTask;window.returnTask=returnTask;window.deleteTask=deleteTask;window.deleteRoom=deleteRoom;window.addMainTab=addMainTab;window.switchTab=switchTab;window.switchSub=switchSub;

onAuthStateChanged(auth, async user=>{currentUser=user;if(user){await home()}else{rid=null;roomCache=null;welcome()}});
