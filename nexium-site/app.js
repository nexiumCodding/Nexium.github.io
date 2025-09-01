/* app.js — renseigne les TODO avant mise en prod */
(() => {
  // ====== 1) Firebase config (TODO : remplace) ======
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.europe-west1.firebasedatabase.app"
  };
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db   = firebase.firestore();
  const rtdb = firebase.database();

  // ====== util ======
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  function renderUser(user) {
    $$(".js-auth-only").forEach(el => el.style.display = user ? "" : "none");
    $$(".js-guest-only").forEach(el => el.style.display = user ? "none" : "");
    const u = $("#userName");   if (u) u.textContent = user ? (user.displayName || user.email) : "Compte";
    if (user) {
      // Solde
      db.collection("users").doc(user.uid).onSnapshot(snap => {
        const data = snap.data() || {};
        const bal = data.balance || 0;
        const b = $("#userBalance"); if (b) b.textContent = `$ ${bal.toFixed(2)}`;
      });
      // Clés
      if ($("#keysList")) {
        db.collection("keys").where("owner","==",user.uid)
          .onSnapshot(q => {
            const list = $("#keysList"); list.innerHTML = "";
            q.forEach(doc => {
              const k = doc.data();
              const li = document.createElement("li");
              li.textContent = `${k.addon} — ${k.key} (${k.status || "active"})`;
              list.appendChild(li);
            });
          });
      }
      // Présence
      const uid = user.uid;
      const presenceRef = rtdb.ref(`presence/${uid}`);
      const onlineRef = rtdb.ref(".info/connected");
      onlineRef.on("value", snap => {
        if (snap.val() === false) return;
        presenceRef.onDisconnect().remove();
        presenceRef.set({ at: firebase.database.ServerValue.TIMESTAMP });
      });
    }
  }
  // compteur en ligne
  const onlineCountEl = $("#onlineCount");
  if (onlineCountEl) {
    rtdb.ref("presence").on("value", snap => {
      onlineCountEl.textContent = snap.numChildren();
    });
  }
  // logout
  $$(".js-logout").forEach(btn => btn.addEventListener("click", () => auth.signOut()));
  auth.onAuthStateChanged(user => renderUser(user));

  // ====== Store
  const storeGrid = $("#storeGrid");
  if (storeGrid) {
    fetch("data/products.json?v=1").then(r=>r.json()).then(items=>{
      storeGrid.innerHTML = "";
      items.forEach(p => {
        const card = document.createElement("article");
        card.className = "product-card with-contours --soft";
        card.innerHTML = `
          <img src="${p.image}" alt="">
          <h3>${p.title}</h3>
          <p class="muted small">${p.short || ""}</p>
          <div class="product-cta">
            <span class="price">$ ${p.price.toFixed(2)}</span>
            <a class="btn btn-primary js-buy" data-id="${p.id}" href="#">Buy</a>
          </div>`;
        storeGrid.appendChild(card);
      });
      storeGrid.addEventListener("click", async (e)=>{
        const a = e.target.closest(".js-buy"); if(!a) return;
        e.preventDefault();
        const user = auth.currentUser;
        if(!user){ alert("Connecte-toi (Compte) pour acheter."); return; }
        const id = a.getAttribute("data-id");
        const res = await fetch("data/products.json?v=1").then(r=>r.json());
        const prod = res.find(x=>x.id===id); if(!prod) return;
        // décrémente solde
        const uref = db.collection("users").doc(user.uid);
        const ok = await db.runTransaction(async t=>{
          const snap = await t.get(uref);
          const cur = (snap.data()?.balance)||0;
          if (cur < prod.price) throw new Error("Solde insuffisant");
          t.set(uref,{balance: cur - prod.price},{merge:true});
          return true;
        }).catch(err=>{ alert(err.message||"Paiement refusé"); return false;});
        if(!ok) return;
        // génère une clé simple
        const key = ("NX-"+Math.random().toString(36).slice(2,10)+"-"+Date.now().toString(36)).toUpperCase();
        await db.collection("keys").add({ owner:user.uid, addon:prod.title, key, status:"active", created:firebase.firestore.FieldValue.serverTimestamp() });
        alert("Achat OK. Clé ajoutée à 'My Keys'.");
      });
    });
  }

  // ====== Information
  const infoList = $("#infoList");
  if (infoList) {
    fetch("data/products.json?v=1").then(r=>r.json()).then(items=>{
      infoList.innerHTML="";
      items.forEach(p=>{
        const li = document.createElement("article");
        li.className = "card glass with-contours --soft";
        li.innerHTML = `
          <div class="card-body">
            <h3>${p.title}</h3>
            <p>${p.long || p.short || ""}</p>
            <ol class="muted small">${(p.install||[]).map(s=>`<li>${s}</li>`).join("")}</ol>
          </div>`;
        infoList.appendChild(li);
      });
    });
  }

  // ====== Status
  const statusTable = $("#statusTable");
  if (statusTable) {
    fetch("data/servers.json?v=1").then(r=>r.json()).then(rows=>{
      const tbody = statusTable.querySelector("tbody");
      tbody.innerHTML="";
      rows.forEach(s=>{
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${s.name}</td>
          <td><code>${s.ip}</code></td>
          <td><span class="label ${s.status}">${s.status.toUpperCase()}</span></td>
          <td class="muted small">${s.note||""}</td>`;
        tbody.appendChild(tr);
      });
    });
  }

  // ====== Discord widget
  const discordBox = $("#discordBox");
  if (discordBox) {
    const GUILD_ID = "YOUR_DISCORD_GUILD_ID"; // TODO
    discordBox.innerHTML = `
      <iframe src="https://discord.com/widget?id=${GUILD_ID}&theme=dark"
              width="100%" height="500" allowtransparency="true" frameborder="0"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>`;
  }

  // ====== Support → webhook Discord (optionnel)
  const supportForm = $("#supportForm");
  if (supportForm) {
    supportForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(supportForm).entries());
      try {
        const WEBHOOK = "YOUR_DISCORD_WEBHOOK_URL"; // TODO
        await fetch(WEBHOOK, {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ content: `**Ticket**\n**Email:** ${data.email}\n**Sujet:** ${data.subject}\n**Message:** ${data.message}` })
        });
        alert("Ticket envoyé, on revient vers toi.");
        supportForm.reset();
      } catch(e){ alert("Envoi impossible (webhook non configuré)."); }
    });
  }
})();
