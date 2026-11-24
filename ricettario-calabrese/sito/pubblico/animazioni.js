// Animazioni del sito: tutto facoltativo, senza librerie. Con "riduci movimento" restano solo le funzioni (libro da sfogliare, barra).
(() => {
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // titolo che entra lettera per lettera (le parole restano intere per gli a capo)
  const h1 = document.querySelector('.titolo-anim');
  if (h1 && !fermo) {
    let k = 0;
    h1.setAttribute('aria-label', h1.textContent);
    h1.innerHTML = h1.textContent.split(' ').map(p =>
      '<span style="white-space:nowrap" aria-hidden="true">' +
      [...p].map(c => `<span class="lettera" style="--k:${k++}">${c}</span>`).join('') + '</span>').join(' ');
  }

  // video del hero: parte solo se il movimento è ammesso; fino ad allora resta la foto
  const video = document.querySelector('[data-video]');
  if (video && !fermo) {
    video.preload = 'auto';
    video.addEventListener('playing', () => video.classList.add('pronto'), { once: true });
    video.play().catch(() => {});
  }

  // polvere nella luce del hero
  const polvere = document.querySelector('.polvere');
  if (polvere && !fermo) {
    for (let i = 0; i < 28; i++) {
      const s = document.createElement('i');
      s.style.cssText = `left:${Math.random() * 100}%;--s:${2 + Math.random() * 4}px;--d:${9 + Math.random() * 12}s;` +
                        `--r:-${Math.random() * 20}s;--x:${-60 + Math.random() * 120}px`;
      polvere.appendChild(s);
    }
  }

  // libro 3D che segue il mouse
  const scena = document.querySelector('[data-tilt]');
  if (scena && !fermo && matchMedia('(hover: hover)').matches) {
    const libro = scena.querySelector('.libro');
    document.querySelector('.hero').addEventListener('mousemove', e => {
      const r = scena.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      libro.style.setProperty('--ry', `${x * 30}deg`);
      libro.style.setProperty('--rx', `${-y * 14}deg`);
    });
  }

  // comparsa allo scorrimento + numeri che contano
  const conta = el => {
    const fine = +el.dataset.conta, t0 = performance.now(), dur = 1400;
    const passo = t => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(fine * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };
  const io = new IntersectionObserver(voci => voci.forEach(v => {
    if (!v.isIntersecting) return;
    v.target.classList.add('visibile');
    if (!fermo) v.target.querySelectorAll('[data-conta]').forEach(conta);
    io.unobserve(v.target);
  }), { threshold: .15 });
  document.querySelectorAll('[data-anim]').forEach(el => io.observe(el));

  // barra di progresso e barra di acquisto (dopo il hero)
  const barra = document.querySelector('.progresso'), acquisto = document.querySelector('.barra-acquisto');
  const hero = document.querySelector('.hero'), prezzo = document.querySelector('#prezzo');
  const aggiorna = () => {
    const h = document.documentElement;
    barra && barra.style.setProperty('--p', h.scrollTop / (h.scrollHeight - h.clientHeight || 1));
    if (acquisto && hero) {
      const dopoHero = hero.getBoundingClientRect().bottom < 0;
      const r = prezzo ? prezzo.getBoundingClientRect() : null;
      const suPrezzo = r && r.top < innerHeight && r.bottom > 0;
      acquisto.classList.toggle('su', dopoHero && !suPrezzo);
    }
  };
  addEventListener('scroll', aggiorna, { passive: true });
  aggiorna();

  // libro da sfogliare: clic sulla pagina destra = avanti, sinistra = indietro, frecce e tastiera
  const libro = document.querySelector('[data-libro]');
  if (libro) {
    const fogli = [...libro.querySelectorAll('.foglio')];
    let n = 0;
    const mostra = () => {
      fogli.forEach((f, i) => { f.classList.toggle('girato', i < n); f.classList.toggle('prossimo', i === n); });
    };
    const vai = d => { n = Math.max(0, Math.min(fogli.length, n + d)); libro.classList.add('toccato'); mostra(); };
    libro.addEventListener('click', e => vai(e.clientX - libro.getBoundingClientRect().left > libro.offsetWidth / 2 ? 1 : -1));
    document.querySelector('[data-prec]')?.addEventListener('click', () => vai(-1));
    document.querySelector('[data-succ]')?.addEventListener('click', () => vai(1));
    let x0 = null;
    libro.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    libro.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) { vai(dx < 0 ? 1 : -1); e.preventDefault(); }
      x0 = null;
    });
    mostra();
  }
})();
