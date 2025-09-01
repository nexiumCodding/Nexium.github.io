/* app.js (v2): Firebase + Store + Status + Discord widget + OAuth Discord */
(() => {
  // ====== 1) CONFIGS — A RENSEIGNER ======
  const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.europe-west1.firebasedatabase.app"
  };
  const DISCORD_CLIENT_ID = "YOUR_DISCORD_CLIENT_ID";      // App Discord → OAuth2
  const OAUTH_REDIRECT_URI = "https://<ton-domaine>/oauth.html"; // ex: https://tonpseudo.github.io/oauth.html
  const WORKER_URL = "https://<ton-worker>.workers.dev";   // Cloudflare Worker ci-dessous

  // ====== 2) BOOT ======
  firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db   = firebase.firestore();
  const rtdb = firebase.database();

  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  // ==== Présence / online
  function attachPresence(user){
    const uid = user.uid;
    const presenceRef = rtdb.ref(`presence/${uid}`);
    const onlineRef = rtdb.ref(".info/connected");
    onlineRef.on("value", snap => {
      if (snap.val() === false) return;
      presenceRef.onDisconnect().remove();
      presenceRef.set({ at: firebase.database.ServerValue.TIMESTAMP });
    });
  }
  const onlineCountEl = $("#onlineCount");
  if (onlineCountEl) { rtdb.ref("presence").on("value", s=>onlineCountEl.textContent=s.numChildren()); }

  function renderUser(user){
    $$(".js-auth-only").forEach(el => el.style.display = user ? "" : "none");
    $$(".js-guest-only").forEach(el => el.style.display = user ? "none" : "");
    const u = $("#userName"); if (u) u.textContent = user ? (user.displayName || user.email) : "Mon compte";
    if (user){
      attachPresence(user);
      // solde
      db.collection("users").doc(user.uid).onSnapshot(snap=>{
        const bal = (snap.data()||{}).balance || 0;
        const b = $("#userBalance"); if (b) b.textContent = `$ ${bal.toFixed(2)}`;
      });
      // clés
      if ($("#keysList")){
        db.collection("keys").where("owner","==",user.uid).onSnapshot(q=>{
          const L = $("#keysList"); L.innerHTML="";
          q.forEach(doc=>{
            const k = doc.data();
            const li=document.createElement("li");
            li.textContent = `${k.addon} — ${k.key} (${k.status||"active"})`;
            L.appendChild(li);
          });
        });
      }
    }
  }
  $$(".js-logout").forEach(b=>b.addEventListener("click", ()=>auth.signOut()));
  auth.onAuthStateChanged(renderUser);

  // ===== Store
  const storeGrid = $("#storeGrid");
  if (storeGrid){
    fetch("data/products.json?v=1").then(r=>r.json()).then(items=>{
      storeGrid.innerHTML="";
      items.forEach(p=>{
        const el = document.createElement("article");
        el.className="product-card with-contours --soft";
        el.innerHTML = `
          <img src="${p.image}" alt="">
          <h3>${p.title}</h3>
          <p class="muted small">${p.short||""}</p>
          <div class="product-cta">
            <span class="price">$ ${p.price.toFixed(2)}</span>
            <a href="#" class="btn btn-primary js-buy" data-id="${p.id}">Buy</a>
          </div>`;
        storeGrid.appendChild(el);
      });
      storeGrid.addEventListener("click", async e=>{
        const a = e.target.closest(".js-buy"); if(!a) return; e.preventDefault();
        const user = auth.currentUser; if(!user){ location.href="account.html"; return; }
        const id = a.getAttribute("data-id");
        const data = await fetch("data/products.json?v=1").then(r=>r.json());
        const p = data.find(x=>x.id===id); if(!p) return;
        const uref = db.collection("users").doc(user.uid);
        const ok = await db.runTransaction(async t=>{
          const snap = await t.get(uref);
          const cur  = (snap.data()?.balance)||0;
          if (cur < p.price) throw new Error("Solde insuffisant");
          t.set(uref,{balance: cur - p.price},{merge:true});
          return true;
        }).catch(err=>{ alert(err.message||"Paiement refusé"); return false; });
        if(!ok) return;
        const key = ("NX-"+Math.random().toString(36).slice(2,10)+"-"+Date.now().toString(36)).toUpperCase();
        await db.collection("keys").add({ owner:auth.currentUser.uid, addon:p.title, key, status:"active", created:firebase.firestore.FieldValue.serverTimestamp() });
        alert("Achat OK. Clé ajoutée à 'My Keys'.");
      });
    });
  }

  // ===== Information
  const infoList = $("#infoList");
  if (infoList){
    fetch("data/products.json?v=1").then(r=>r.json()).then(items=>{
      infoList.innerHTML="";
      items.forEach(p=>{
        const a=document.createElement("article");
        a.className="card glass with-contours --soft";
        a.innerHTML=`<div class="card-body">
          <h3>${p.title}</h3>
          <p>${p.long||p.short||""}</p>
          <ol class="muted small">${(p.install||[]).map(s=>`<li>${s}</li>`).join("")}</ol>
        </div>`;
        infoList.appendChild(a);
      });
    });
  }

  // ===== Status
  const statusTable = $("#statusTable");
  if (statusTable){
    fetch("data/servers.json?v=1").then(r=>r.json()).then(rows=>{
      const tb = statusTable.querySelector("tbody"); tb.innerHTML="";
      rows.forEach(s=>{
        const tr=document.createElement("tr");
        tr.innerHTML=`<td>${s.name}</td>
          <td><code>${s.ip}</code></td>
          <td><span class="label ${s.status}">${s.status.toUpperCase()}</span></td>
          <td class="muted small">${s.note||""}</td>`;
        tb.appendChild(tr);
      });
    });
  }

  // ===== Support → Discord webhook (optionnel)
  const supportForm = $("#supportForm");
  if (supportForm){
    supportForm.addEventListener("submit", async e=>{
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(supportForm).entries());
      try{
        const WEBHOOK = "YOUR_DISCORD_WEBHOOK_URL"; // optionnel
        await fetch(WEBHOOK,{method:"POST",headers:{'Content-Type':'application/json'},
          body:J
