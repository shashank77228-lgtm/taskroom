const KEY="taskroom_v1";
let db=JSON.parse(localStorage.getItem(KEY)||"null")||{users:{},rooms:{},session:null};
let rid=null,ti=0,si=0;
const A=document.getElementById("app");
const save=()=>localStorage.setItem(KEY,JSON.stringify(db));
const id=p=>p+"_"+Math.random().toString(36).slice(2,9);
const me=()=>db.users[db.session];
const val=i=>document.getElementById(i)?.value.trim()||"";
const esc=x=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const B=(t,f,c="btn")=>`<button class="${c}" onclick="${f}">${t}</button>`;

function shell(x){A.innerHTML=`<header class="top"><b class="brand">✓ TaskRoom</b><div>${me()?B("Home","home()")+B("Logout","logout()"):""}</div></header><main class="page">${x}</main>`}
function welcome(){shell(`<div class="hero card"><div style="font-size:55px">✓</div><h1>TaskRoom</h1><p class="muted">Organize tasks. Work together. Track progress.</p><div class="row" style="justify-content:center">${B("Create account","register()","btn primary")}${B("Log in","login()")}</div></div>`)}
function field(label,id,type="text"){return `<div class="field"><label>${label}</label><input id="${id}" type="${type}"></div>`}

function login(){shell(`<div class="card" style="max-width:470px;margin:30px auto"><h2>Log in</h2>${field("Email","email","email")}${field("Password","password","password")}${B("Log in","doLogin()","btn primary")}</div>`)}
function register(){shell(`<div class="card" style="max-width:470px;margin:30px auto"><h2>Create account</h2>${field("Name","name")}${field("Email","email","email")}${field("Password","password","password")}${B("Create account","doRegister()","btn primary")}</div>`)}
function doRegister(){
 const n=val("name"),e=val("email").toLowerCase(),p=val("password");
 if(!n||!e||p.length<4)return alert("Enter name, email and a password of at least 4 characters.");
 if(Object.values(db.users).some(u=>u.email===e))return alert("Email already registered.");
 const uid=id("user");db.users[uid]={id:uid,name:n,email:e,password:p};db.session=uid;save();home();
}
function doLogin(){
 const e=val("email").toLowerCase(),p=val("password"),u=Object.values(db.users).find(x=>x.email===e&&x.password===p);
 if(!u)return alert("Invalid email or password.");
 db.session=u.id;save();home();
}
function logout(){db.session=null;save();welcome()}

function home(){
 const rooms=Object.values(db.rooms).filter(r=>r.members[db.session]);
 shell(`<div class="row between"><div><h2>Hello, ${esc(me().name)} 👋</h2><p class="muted">Create or join a room.</p></div><div>${B("+ Create room","createRoomModal()","btn primary")}${B("Join room","joinRoomModal()")}</div></div>
 <div class="grid g2" style="margin-top:15px">${rooms.length?rooms.map(r=>`<div class="card"><div class="row between"><h3>${esc(r.name)}</h3><span class="badge">${r.host===db.session?"HOST":"MEMBER"}</span></div><p class="muted">Room ID: <b>${r.code}</b></p>${B("Open room",`openRoom('${r.id}')`,"btn primary")}</div>`).join(""):`<div class="card empty">No rooms yet.</div>`}</div>`)
}
function modal(title,body){const d=document.createElement("div");d.className="modal";d.innerHTML=`<div><div class="row between"><h2>${title}</h2>${B("×","this.closest('.modal').remove()")}</div>${body}</div>`;document.body.appendChild(d)}
function createRoomModal(){modal("Create room",field("Room name","roomName")+field("Room password","roomPass","password")+B("Create room","createRoom()","btn primary"))}
function createRoom(){
 const n=val("roomName"),p=val("roomPass");if(!n||!p)return alert("Room name and password are required.");
 let code;do{code=String(Math.floor(100000+Math.random()*900000))}while(Object.values(db.rooms).some(r=>r.code===code));
 const r={id:id("room"),name:n,password:p,code,host:db.session,members:{[db.session]:{role:"host"}},tabs:[]};
 addTab(r,"Study");db.rooms[r.id]=r;save();document.querySelector(".modal").remove();openRoom(r.id)
}
function addTab(r,name){
 const tab={id:id("tab"),name,subs:[]};
 for(let i=1;i<=6;i++)tab.subs.push({id:id("sub"),name:"Sub-tab "+i,tasks:[]});
 r.tabs.push(tab)
}
function joinRoomModal(){modal("Join room",field("Room ID","joinCode")+field("Room password","joinPass","password")+B("Join room","joinRoom()","btn primary"))}
function joinRoom(){
 const code=val("joinCode"),p=val("joinPass"),r=Object.values(db.rooms).find(x=>x.code===code);
 if(!r||r.password!==p)return alert("Room ID or password is incorrect.");
 r.members[db.session] ||= {role:"member"};save();document.querySelector(".modal").remove();openRoom(r.id)
}
function openRoom(id){rid=id;ti=0;si=0;renderRoom()}
function room(){return db.rooms[rid]}

function renderRoom(){
 const r=room(),host=r.host===db.session,t=r.tabs[ti],s=t.subs[si];
 let html=`<div class="row between"><div><h2>${esc(r.name)}</h2><small class="muted">Room ID: ${r.code} • ${host?"HOST":"MEMBER"}</small></div>${host?B("+ Task","taskModal()","btn primary"):""}</div>`;
 html+=`<div class="tabs">${r.tabs.map((t,i)=>`<button class="tab ${i===ti?"active":""}" onclick="ti=${i};si=0;renderRoom()">${esc(t.name)}</button>`).join("")}${host?B("+ Tab","addMainTab()"):""}</div>`;
 html+=`<div class="subs">${t.subs.map((s,i)=>`<button class="sub ${i===si?"active":""}" onclick="si=${i};renderRoom()"><b>${esc(s.name)}</b><br><small>${s.tasks.filter(x=>x.assigned===db.session&&x.status!=="approved").length} active</small></button>`).join("")}</div>`;
 html+=host?hostView(r,s):memberView(s);
 shell(html);
}
function memberView(s){
 const tasks=s.tasks.filter(t=>t.assigned===db.session);
 const active=tasks.filter(t=>t.status==="pending"||t.status==="returned");
 return `<div class="card" style="margin-top:15px"><h3>My tasks</h3>${active.length?active.map(t=>`<div class="task"><input type="checkbox" onchange="completeTask('${t.id}')"><div><b>${esc(t.title)}</b><div class="muted">${esc(t.desc)}</div>${t.status==="returned"?`<small class="badge returned">Returned${t.reason?": "+esc(t.reason):""}</small>`:""}</div></div>`).join(""):`<div class="empty">No active tasks 🎉</div>`}</div>`
}
function hostView(r,s){
 return `<div class="card" style="margin-top:15px"><div class="row between"><h3>Host review</h3><span class="badge">${s.tasks.length} total</span></div>${s.tasks.length?s.tasks.map(t=>{
 const u=db.users[t.assigned];
 return `<div class="task"><div style="flex:1"><b>${esc(t.title)}</b><div class="muted">${esc(u?.name||"Member")} • ${esc(t.desc)}</div><span class="badge ${t.status}">${t.status}</span>${t.reason?`<div class="muted">Reason: ${esc(t.reason)}</div>`:""}</div><div>${t.status==="completed"?B("Approve",`approveTask('${t.id}')`,"btn success")+B("Return",`returnTask('${t.id}')`,"btn danger"):""}${B("Delete",`deleteTask('${t.id}')`)}</div></div>`
 }).join(""):`<div class="empty">No tasks.</div>`}</div>`
}
function taskModal(){
 const r=room(),s=r.tabs[ti].subs[si],members=Object.entries(r.members).filter(([uid,m])=>m.role==="member");
 const opts=members.map(([uid])=>`<option value="${uid}">${esc(db.users[uid]?.name||uid)} (${s.tasks.filter(t=>t.assigned===uid&&t.status!=="approved").length}/35)</option>`).join("");
 modal("Create task",field("Task title","taskTitle")+field("Description","taskDesc")+`<div class="field"><label>Assign to member</label><select id="assign">${opts}</select></div>`+(members.length?B("Create task","createTask()","btn primary"):`<p class="muted">Join another account to this room before assigning a task.</p>`))
}
function createTask(){
 const s=room().tabs[ti].subs[si],assigned=document.getElementById("assign")?.value;
 if(!assigned)return alert("Add a member first.");
 const count=s.tasks.filter(t=>t.assigned===assigned&&t.status!=="approved").length;
 if(count>=35)return alert("This member already has 35 active tasks in this sub-tab.");
 const title=val("taskTitle");if(!title)return alert("Task title is required.");
 s.tasks.push({id:id("task"),title,desc:val("taskDesc"),assigned,status:"pending",reason:""});
 save();document.querySelector(".modal").remove();renderRoom()
}
function completeTask(id){
 const s=room().tabs[ti].subs[si],t=s.tasks.find(x=>x.id===id);if(!t)return;
 t.status="completed";save();renderRoom()
}
function approveTask(id){
 const t=room().tabs[ti].subs[si].tasks.find(x=>x.id===id);t.status="approved";save();renderRoom()
}
function returnTask(id){
 const t=room().tabs[ti].subs[si].tasks.find(x=>x.id===id);
 t.status="returned";t.reason=prompt("Why are you returning this task?")||"";save();renderRoom()
}
function deleteTask(id){
 if(!confirm("Delete this task?"))return;
 const s=room().tabs[ti].subs[si];s.tasks=s.tasks.filter(x=>x.id!==id);save();renderRoom()
}
function addMainTab(){
 const r=room(),name=prompt("Main tab name");if(!name)return;
 addTab(r,name);save();ti=r.tabs.length-1;si=0;renderRoom()
}
welcome();