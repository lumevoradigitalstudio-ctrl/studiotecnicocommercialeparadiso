const f=document.getElementById("form"),m=document.getElementById("msg"),b=document.getElementById("send");
f.addEventListener("submit",async e=>{e.preventDefault();
 const email=document.getElementById("email").value.trim(),consent=document.getElementById("consent").checked;
 if(!/^\S+@\S+\.\S+$/.test(email)){m.textContent="Inserisci un'email valida.";return}
 if(!consent){m.textContent="Per iscriverti serve il tuo consenso.";return}
 const url=(window.RITMO||{}).WAITLIST_URL; if(!url){m.textContent="Iscrizioni non ancora attive.";return}
 b.disabled=true;m.textContent="Invio…";
 try{const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,consent:true,source:"landing",website:document.getElementById("website").value})});
  m.textContent=r.ok?"Grazie! Se l'indirizzo è valido, sei in lista.":"Non è stato possibile completare l'iscrizione. Riprova tra poco.";if(r.ok)f.reset()}
 catch{m.textContent="Non è stato possibile completare l'iscrizione. Riprova tra poco."}
 b.disabled=false});
