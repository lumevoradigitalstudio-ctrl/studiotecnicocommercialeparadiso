const C=window.RITMO_ADMIN; let token=null; // il token resta SOLO in memoria (mai in storage/cookie)
const $=id=>document.getElementById(id), err=t=>{$("err").textContent=t||""};
const LABELS=[["signups_total","Registrazioni totali"],["signups_window","Registrazioni nel periodo"],["onboarding_completed","Onboarding completati"],["active_users_7d","Utenti attivi (7 giorni)"],["active_users_30d","Utenti attivi (30 giorni)"],["plus_active","Abbonati Plus attivi"],["cancellations_window","Disdette/scadenze nel periodo"],["ai_requests_window","Richieste AI nel periodo"],["ai_failed_window","Richieste AI fallite"],["ai_cost_eur_window","Costo AI nel periodo (€)"]];
async function load(){err("");
 const r=await fetch(C.SUPABASE_URL+"/functions/v1/admin-metrics",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+token,apikey:C.PUBLISHABLE_KEY},body:JSON.stringify({days:Number($("days").value)})});
 if(r.status===403){err("Questo account non ha accesso alla dashboard.");return}
 if(!r.ok){err("Impossibile caricare le metriche.");return}
 const {metrics:m}=await r.json(); const t=$("tbl"); t.replaceChildren();
 for(const [k,l] of LABELS){const tr=t.insertRow();tr.insertCell().textContent=l;tr.insertCell().textContent=typeof m[k]==="number"&&k==="ai_cost_eur_window"?m[k].toFixed(4):String(m[k]??"n/d")}
 const tr=t.insertRow();tr.insertCell().textContent="Ricavi stimati";tr.insertCell().textContent="non disponibili";
 $("note").textContent="Aggiornato: "+m.generated_at+". Ricavi: richiedono l'integrazione con i dati RevenueCat, non ancora disponibile."; $("out").hidden=false}
$("login").addEventListener("submit",async e=>{e.preventDefault();err("");
 const r=await fetch(C.SUPABASE_URL+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"content-type":"application/json",apikey:C.PUBLISHABLE_KEY},body:JSON.stringify({email:$("email").value,password:$("pw").value})});
 $("pw").value=""; if(!r.ok){err("Accesso non riuscito.");return}
 token=(await r.json()).access_token; $("login").hidden=true; await load()});
$("reload").onclick=load; $("logout").onclick=()=>{token=null;$("out").hidden=true;$("login").hidden=false;$("tbl").replaceChildren()};
