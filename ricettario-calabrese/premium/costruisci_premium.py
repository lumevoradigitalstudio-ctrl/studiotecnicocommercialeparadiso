#!/usr/bin/env python3
"""Edizione premium (anteprima) del ricettario, solo italiano. Non tocca il libro attuale né il sito.

Uso (dalla cartella ricettario-calabrese):
    python3 premium/costruisci_premium.py            # PDF alta qualità + PDF leggero + copertina JPG
Esce in output/premium/. Testi e ricette vengono da ricette/it/ senza modifiche di contenuto.
"""
import html, io, json, math, pathlib, re, subprocess, sys, urllib.parse

from PIL import Image, ImageEnhance
from weasyprint import HTML

R = pathlib.Path(__file__).resolve().parents[1]
P = R / 'premium'
sys.path.insert(0, str(R / 'impaginazione'))
import costruisci as base  # stessi testi, stesse ricette, stessi indici del libro attuale

C = base.CONF['it']
OUT = R / 'output' / 'premium'
TITOLO, SOTTO = C['titolo'], C['sottotitolo']
AI = 'Immagine illustrativa generata con IA'

# Foto del territorio: Wikimedia Commons, licenze che permettono l'uso commerciale (crediti in fondo al libro)
_lj = P / 'dati' / 'luoghi.json'
LUOGHI = json.loads(_lj.read_text(encoding='utf-8')) if _lj.exists() else {}
SEGNAPOSTO = dict(luogo='Foto del luogo in arrivo', mappa='Calabria', file=None, autore='—', licenza='—', titolo='', pagina='')
# capitolo -> chiave del luogo per l'apertura
APERTURE = ['sila', 'ulivi', 'tropea', 'gerace', 'costadeglidei', 'aspromonte', 'scilla', 'capovaticano', 'reggio']
RISERVA = {'sila': 'gerace', 'ulivi': 'costadeglidei', 'tropea': 'capovaticano', 'aspromonte': 'reggio',
           'scilla': 'gerace', 'pizzo': 'costadeglidei'}  # se la foto non è disponibile si usa un altro luogo, con la sua didascalia vera

# mappa gastronomica: (nome, lat, lon, ricetta o None, lato dell'etichetta)
MAPPA = [
    ('Spilinga', 38.628, 15.905, 5, 'o'), ('Tropea', 38.677, 15.898, 20, 'o'), ('Capo Vaticano', 38.618, 15.829, None, 'o'),
    ('Pizzo', 38.734, 16.159, None, 'e'), ('Vibo Valentia', 38.676, 16.101, 29, 'e'), ('Soriano Calabro', 38.496, 16.230, 58, 'e'),
    ('Gioia Tauro', 38.426, 15.899, 31, 'o'), ('Bagnara Calabra', 38.287, 15.808, 45, 'o'), ('Scilla', 38.253, 15.716, None, 'o'),
    ('Reggio Calabria', 38.111, 15.650, 56, 'o'), ('Aspromonte', 38.160, 15.880, 40, 'e'), ('Mammola', 38.364, 16.240, 46, 'e'),
    ('Gerace', 38.271, 16.220, None, 'e'), ('Catanzaro', 38.910, 16.588, 39, 'e'), ('Cosenza', 39.298, 16.254, 30, 'o'),
    ('Sila', 39.338, 16.448, 25, 'e'), ('San Giovanni in Fiore', 39.256, 16.697, 55, 'e'), ('Crucoli', 39.426, 17.002, 15, 'e'),
]

ICONE = {
    'persone': '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c3 .3 5.5 2.6 5.5 5.8"/>',
    'preparazione': '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-2 2-3M13 7c0-1.5 1-2 2-3"/>',
    'cottura': '<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 1.5 1 2 2.5 2 4 1-1 1.5-3 1-8z"/>',
    'riposo': '<path d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9"/>',
    'totale': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'pin': '<path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    'stagione': '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19 14 10"/>',
    'Consigli': '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    'Errori da evitare': '<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17v.5"/>',
    'Varianti locali': '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M6 8.5v2c0 2 2 3 6 3s6-1 6-3v-2M12 13.5v2"/>',
    'Conservazione': '<rect x="6" y="8" width="12" height="13" rx="2"/><path d="M7 4h10v4H7z"/>',
    'Fuori dalla Calabria': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    'Allergeni': '<path d="M12 21V8M12 8c-2-1-3-3-3-5 2 1 3 3 3 5zm0 0c2-1 3-3 3-5-2 1-3 3-3 5zM12 14c-2-1-3-3-3-5 2 1 3 3 3 5zm0 0c2-1 3-3 3-5-2 1-3 3-3 5z"/>',
    'DOP e IGP': '<circle cx="12" cy="9" r="6"/><path d="M9 14l-2 7 5-3 5 3-2-7"/>',
    'Vino': '<path d="M8 3h8c0 5-1.5 8-4 8s-4-3-4-8zM12 11v8M8 21h8"/>',
    'sicurezza': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    'ingredienti': '<path d="M4 10h16l-2 10H6zM8 10l4-6 4 6"/>',
    'procedimento': '<ellipse cx="9" cy="7" rx="3" ry="4.5"/><path d="M11 11l8 10"/>',
    'indice': '<path d="M4 6h16M4 12h16M4 18h10"/>',
    'mappa': '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
}


def ico(nome, classe='ico'):
    return f'<svg class="{classe}" viewBox="0 0 24 24" aria-hidden="true">{ICONE[nome]}</svg>'


def mappa_url(q):
    return 'https://www.google.com/maps/search/?api=1&query=' + urllib.parse.quote(q)


def foto(src, lato, grade=True, nome=None):
    """Copia ridotta e appena calibrata (calore e contrasto leggeri, uguali per tutte), in cache."""
    src = pathlib.Path(src)
    d = OUT / f'.img-{lato}' / (nome or src.name)
    if not d.exists() or d.stat().st_mtime < src.stat().st_mtime:
        d.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(src) as im:
            im = im.convert('RGB')
            im.thumbnail((lato, lato))
            if grade:
                im = ImageEnhance.Contrast(im).enhance(1.05)
                im = ImageEnhance.Color(im).enhance(1.04)
                r, g, b = im.split()
                im = Image.merge('RGB', (r.point(lambda v: min(255, int(v * 1.02))), g, b.point(lambda v: int(v * 0.97))))
            im.save(d, 'JPEG', quality=80, optimize=True, progressive=True)
    return d.as_uri()


def principale(n, quale='principale'):
    return next((R / 'immagini').glob(f'{n:02d}-*')) / f'{n:02d}-{quale}.jpg'


def collega_ricette(h):
    """'ricetta 06' nel testo diventa un link interno alla ricetta."""
    return re.sub(r'\b(ricett[ae] )(\d{1,2})\b', lambda m: f'{m.group(1)}<a class="rif" href="#r{int(m.group(2)):02d}">{m.group(2)}</a>'
                  if 1 <= int(m.group(2)) <= 60 else m.group(0), h)


def meta(fm):
    voci = [('persone', 'Porzioni', fm.get('porzioni')), ('preparazione', 'Preparazione', fm.get('preparazione')),
            ('cottura', 'Cottura', fm.get('cottura')), ('riposo', 'Riposo', fm.get('riposo')), ('totale', 'Totale', fm.get('totale'))]
    out = ''.join(f'<div class="m">{ico(i)}<span class="ml">{l}</span><span class="mv">{html.escape(str(v))}</span></div>'
                  for i, l, v in voci if v and str(v).strip().lower() not in ('nessuna', 'nessuno', '—'))
    livello = {'facile': 1, 'media': 2, 'impegnativa': 3}.get(str(fm.get('difficolta', '')).split()[0].lower(), 0)
    if livello:
        punti = ''.join(f'<i class="{"on" if k < livello else ""}"></i>' for k in range(3))
        out += f'<div class="m">{ico("totale").replace("ico", "ico invisibile")}<span class="ml">Difficoltà</span><span class="mv"><span class="punti">{punti}</span> {html.escape(str(fm["difficolta"]))}</span></div>'
    return f'<div class="meta">{out}</div>'


def ricetta(fm, corpo, k, liv, img_lato):
    n = fm['numero']
    h = base.md(corpo).replace('<code>', '<span class="verif">').replace('</code>', '</span>')
    tit = re.search(r'<h1>(.*?)</h1>', h).group(1)
    h = h[h.index('</h1>') + 5:]
    parti = re.split(r'(?=<h2>)', h)
    testa, sezioni = parti[0], parti[1:]
    # testa: sottotitolo in corsivo, introduzione, riga dei tempi (già mostrata con le icone)
    paragrafi = re.findall(r'<p>.*?</p>', testa, flags=re.S)
    intro = ''.join(p for p in paragrafi if not p.startswith('<p><em>') and not p.startswith('<p><strong>'))
    luogo = str(fm.get('provincia', ''))
    q = luogo.split('(')[0].split(';')[0].strip() or 'Calabria'
    q = 'Calabria' if 'tutta' in q.lower() else q + ', Calabria'
    dial = str(fm.get('dialetto') or '').strip()
    dial = '' if dial in ('', '—') else f'<span class="dial">{html.escape(dial)}</span>'
    kicker = (f'<div class="kicker"><span>{html.escape(fm["capitolo"])} · {n:02d}</span>'
              f'<a class="torna" href="#indice">{ico("indice")} Indice</a></div>')
    riga = (f'<div class="luogo"><a href="{mappa_url(q)}">{ico("pin")} {html.escape(luogo)}</a>'
            f'<span>{ico("stagione")} {html.escape(str(fm.get("stagione", "")))}</span></div>')
    titoli = f'{kicker}<h1 class="ricetta" id="r{n:02d}">{tit}</h1>{dial}{riga}'
    img = f'<img src="{foto(principale(n), img_lato)}" alt="">'
    didasc = f'<span class="ia">{AI}</span>'
    v = k % 3
    if v == 0:
        testata = f'<figure class="hero piena">{img}{didasc}</figure><div class="titoli">{titoli}</div>'
    elif v == 1:
        testata = f'<div class="split"><figure class="hero lato">{img}{didasc}</figure><div class="titoli">{titoli}</div></div>'
    else:
        testata = f'<div class="titoli centro">{titoli}</div><figure class="hero cornice">{img}{didasc}</figure>'
    ingr, metodo, pre, post = [], '', [], []
    visto_metodo = False
    for s in sezioni:
        t = re.match(r'<h2>(.*?)</h2>', s).group(1)
        corpo_s = s[s.index('</h2>') + 5:]
        if t.startswith('Ingredienti'):
            ingr.append(f'<h3>{t.replace("Ingredienti", "").strip(" ()") or ""}</h3>{corpo_s}' if t != 'Ingredienti' else corpo_s)
        elif t == C['metodo']:
            metodo, visto_metodo = corpo_s, True
        elif not visto_metodo:
            pre.append(f'<div class="riquadro">{ico("sicurezza") if "sicurezza" in t.lower() else ""}<h3>{t}</h3>{corpo_s}</div>')
        else:
            nome = t.split(' (')[0]
            icona = ico(nome) if nome in ICONE else ''
            post.append(f'<section class="nota"><h3>{icona}{t}</h3>{corpo_s}</section>')
    passi = ''.join(f'<img src="{foto(principale(n, f"passo-{j}"), max(500, img_lato // 3))}" alt="">' for j in (1, 2, 3))
    corpo_html = (f'<div class="intro">{intro}</div>{meta(fm)}{"".join(pre)}'
                  f'<aside class="ingredienti"><h2>{ico("ingredienti")}Ingredienti</h2>{"".join(ingr)}</aside>'
                  f'<section class="metodo"><h2>{ico("procedimento")}Procedimento</h2>{metodo}</section>'
                  f'<figure class="passi"><div>{passi}</div><figcaption>I passaggi chiave · {AI.lower()}</figcaption></figure>'
                  f'<div class="note">{"".join(post)}</div>')
    return collega_ricette(f'<article class="ricetta v{v} liv{liv}">{testata}{corpo_html}</article>')


def apertura(k, nome, testo, chiave):
    L = LUOGHI.get(chiave) or LUOGHI.get(RISERVA.get(chiave, '')) or SEGNAPOSTO
    img = foto(P / 'dati' / 'luoghi' / L['file'], 2200, grade=False) if L['file'] else ''
    corpo = f'<div class="ap-testo">{testo}</div>' if testo else ''
    return (f'<section class="apertura" id="cap{k}"><figure class="ap-foto"><img src="{img}" alt="{html.escape(L["luogo"])}">'
            f'<div class="ap-velo"></div><div class="ap-titoli"><span class="ap-num">Capitolo {k}</span>'
            f'<h1 class="capitolo">{html.escape(nome)}</h1>'
            f'<a class="ap-luogo" href="{mappa_url(L["mappa"])}">{ico("pin")} {html.escape(L["luogo"])}</a></div>'
            f'<span class="ap-credito">Foto: {html.escape(L["autore"])} · {html.escape(L["licenza"])} · Wikimedia Commons</span></figure>'
            f'</section><div class="capstr">{html.escape(nome)}</div>{corpo}')


def svg_mappa():
    gj = json.loads((P / 'dati' / 'calabria-province.geojson').read_text())
    lon0, lon1, lat0, lat1 = 15.55, 17.25, 37.88, 40.18
    W = 1000
    kx = math.cos(math.radians(39))
    H = W * (lat1 - lat0) / ((lon1 - lon0) * kx)
    xy = lambda lon, lat: ((lon - lon0) * kx / ((lon1 - lon0) * kx) * W, (lat1 - lat) / (lat1 - lat0) * H)
    tracce = []
    for f in gj['features']:
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            for ring in poly:
                pts = ring[::3] if len(ring) > 300 else ring
                tracce.append('M' + 'L'.join(f'{xy(a, b)[0]:.1f},{xy(a, b)[1]:.1f}' for a, b in pts) + 'Z')
    perni = ''
    for nome, lat, lon, ric, lato in MAPPA:
        x, y = xy(lon, lat)
        dx, anchor = (14, 'start') if lato == 'e' else (-14, 'end')
        etichetta = html.escape(nome) + (f' · {ric:02d}' if ric else '')
        href = f'#r{ric:02d}' if ric else mappa_url(nome + ', Calabria')
        colore = 'var(--peperoncino)' if ric else 'var(--mare)'
        perni += (f'<a href="{href}"><circle cx="{x:.1f}" cy="{y:.1f}" r="7" fill="{colore}" stroke="#fff" stroke-width="2.5"/>'
                  f'<text x="{x + dx:.1f}" y="{y + 5:.1f}" text-anchor="{anchor}" class="lab">{etichetta}</text></a>')
    return (f'<svg class="mappa-svg" viewBox="-60 -20 {W + 120:.0f} {H + 40:.0f}" xmlns="http://www.w3.org/2000/svg">'
            f'<path d="{" ".join(tracce)}" fill="#E9DCC3" stroke="#C1663F" stroke-width="1.6" stroke-linejoin="round"/>{perni}'
            f'<text x="{W * 0.05:.0f}" y="{H * 0.55:.0f}" class="mare">Mar Tirreno</text>'
            f'<text x="{W * 0.86:.0f}" y="{H * 0.80:.0f}" class="mare">Mar Ionio</text></svg>')


def costruisci(img_lato, file_pdf, salva_html=False):
    cart = R / 'ricette' / 'it'
    ricette = sorted((base.leggi(p) for p in cart.glob('[0-9][0-9]-*.md')), key=lambda x: x[0]['numero'])
    aperture = {fm['capitolo']: corpo for fm, corpo in (base.leggi(p) for p in cart.glob('c*-*.md'))}
    capitoli = []
    for fm, corpo in ricette:
        if not capitoli or capitoli[-1][0] != fm['capitolo']:
            capitoli.append((fm['capitolo'], []))
        capitoli[-1][1].append((fm, corpo))
    sost = dict(titolo=TITOLO, sottotitolo=SOTTO, anno=base.ANNO, editore=base.EDITORE, autore='')
    testo = lambda nome: base.md((R / 'impaginazione' / 'testi' / 'it' / f'{nome}.md').read_text(encoding='utf-8').format(**sost))

    out = [f'''<section class="copertina"><img class="cop-foto" src="{foto(R / 'immagini' / 'copertina' / 'copertina.jpg', 2400, grade=False)}" alt="">
      <div class="cop-velo"></div><div class="cop-testa"><span class="cop-kicker">Ricettario calabrese</span>
      <h1 class="cop-titolo">Il libro di cucina<br><em>della Putìga</em></h1><span class="cop-filo"></span>
      <p class="cop-sotto">60 ricette di casa, dai salumi ai dolci delle feste</p></div>
      <div class="cop-piede"><span>{base.EDITORE}</span><span class="cop-ia">{AI}</span></div></section>''']
    out.append(f'<section class="colophon">{testo("colophon")}<p class="nota-font">Caratteri di questa edizione: Playfair Display, Lora e Montserrat (SIL Open Font License 1.1). Foto dei luoghi: Wikimedia Commons, crediti a fine libro.</p></section>')
    voci = ''
    for k, (nome, rr) in enumerate(capitoli, 1):
        sotto = ''.join(f'<li><a href="#r{fm["numero"]:02d}"><span class="n">{fm["numero"]:02d}</span>{html.escape(fm["titolo"])}</a></li>' for fm, _ in rr)
        voci += f'<li class="cap"><a href="#cap{k}"><span class="n">{k}</span>{html.escape(nome)}</a><ul>{sotto}</ul></li>'
    finali = [('mappa', 'La Calabria in cucina: mappa'), ('glossario', C['glossario']), ('conversioni', C['conversioni']),
              ('ing-indice', C['ing_indice']), ('crediti', 'Crediti fotografici')]
    voci += ''.join(f'<li class="cap fin"><a href="#{i}">{t}</a></li>' for i, t in finali)
    out.append(f'<section class="indice" id="indice"><h1 class="indice">Indice</h1>'
               f'<ul><li class="cap fin"><a href="#intro">La cucina della putìga</a></li>{voci}</ul></section>')
    intro = testo('introduzione').replace('<h1>', '<h1 class="sez" id="intro">', 1)
    U = LUOGHI.get('cipolla')
    fig = (f'<figure class="intro-foto"><img src="{foto(P / "dati" / "luoghi" / U["file"], 1600, grade=False)}" alt="">'
           f'<figcaption>{html.escape(U["luogo"])} · Foto: {html.escape(U["autore"])}, {html.escape(U["licenza"])}</figcaption></figure>') if U else ''
    out.append(f'<section class="intro-p">{fig}{intro}</section>')
    out.append(f'<section class="mappa-p" id="mappa"><span class="kick">Dove nascono i piatti</span><h1 class="sez">La Calabria in cucina</h1>'
               f'<p class="sub">Tocca un punto rosso per aprire la ricetta, un punto blu per vedere il luogo sulla mappa.</p>{svg_mappa()}'
               f'<p class="fonte">Confini delle province: ISTAT, elaborazione openpolis (CC BY 4.0). Posizioni indicative.</p></section>')
    for k, (nome, rr) in enumerate(capitoli, 1):
        ap = aperture.get(nome)
        testo_ap = re.sub(r'<h1>.*?</h1>', '', base.md(ap), count=1) if ap else ''
        out.append(apertura(k, nome, testo_ap, APERTURE[k - 1]))
        out.extend(('RICETTA', fm, corpo) for fm, corpo in rr)
    # appendici: stessi contenuti del libro attuale
    gloss = sorted((base.chiave(str(fm.get('dialetto'))), f'<dt>{html.escape(str(fm["dialetto"]))}</dt><dd><a href="#r{fm["numero"]:02d}">{html.escape(fm["titolo"])}</a></dd>')
                   for fm, _ in ricette if str(fm.get('dialetto') or '').strip() not in ('', '—'))
    out.append(f'<section class="appendice" id="glossario"><h1 class="sez">{C["glossario"]}</h1><p>{C["nota_gloss"]}</p><dl class="glossario">{"".join(v for _, v in gloss)}</dl></section>')
    out.append(base.conversioni(C).replace('<h1 class="appendice">', '<h1 class="sez">'))
    righe = []
    for voce in sorted(base.INGREDIENTI, key=lambda v: base.chiave(v[0])):
        trovate = [fm for fm, corpo in ricette if re.search(voce[1], base.ingredienti_md(corpo, C))]
        if trovate:
            righe.append(f'<div class="voce"><h3>{voce[0]}</h3><ul>' + ''.join(f'<li><a href="#r{fm["numero"]:02d}">{html.escape(fm["titolo"])}</a></li>' for fm in trovate) + '</ul></div>')
    out.append(f'<section class="appendice" id="ing-indice"><h1 class="sez">{C["ing_indice"]}</h1><div class="ing-indice">{"".join(righe)}</div></section>')
    crediti = ''.join(f'<li><b>{html.escape(L["luogo"])}</b> — {html.escape(L["autore"])}, {html.escape(L["licenza"])}. '
                      f'<a href="{L["pagina"]}">{html.escape(L["titolo"])}</a></li>' for L in LUOGHI.values())
    out.append(f'<section class="appendice" id="crediti"><h1 class="sez">Crediti fotografici</h1>'
               f'<p>Le fotografie dei luoghi vengono da Wikimedia Commons e sono usate secondo le loro licenze, che permettono l\'uso commerciale con attribuzione. '
               f'Le immagini dei piatti, dei passaggi e della copertina sono illustrazioni generate con l\'intelligenza artificiale.</p><ul class="crediti">{crediti}</ul>'
               f'<p class="fonte">Mappa: confini ISTAT, elaborazione openpolis (CC BY 4.0).</p></section>')
    out.append(f'<section class="chiusura">{testo("chiusura")}</section>')

    css = (P / 'stile.css').as_uri()
    livelli = {}
    for giro in range(5):
        corpo_doc = ''.join(ricetta(x[1], x[2], x[1]['numero'] - 1, livelli.get(x[1]['numero'], 0), img_lato) if isinstance(x, tuple) else x for x in out)
        doc = (f'<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>{TITOLO}</title>'
               f'<meta name="author" content="{base.EDITORE}"><link rel="stylesheet" href="{css}"></head><body>{corpo_doc}</body></html>')
        reso = HTML(string=doc, base_url=str(R)).render()
        pdf = reso.write_pdf()
        starts = sorted((i, int(a[1:]) if re.fullmatch(r'r\d\d', a) else None) for i, pg in enumerate(reso.pages) for a in pg.anchors
                        if re.fullmatch(r'r\d\d|cap\d+|glossario', a))
        da_fare = {n for n in base.corte(pdf, starts, soglia=500) if livelli.get(n, 0) < 2}
        if not da_fare:
            break
        for n in da_fare:
            livelli[n] = livelli.get(n, 0) + 1
    OUT.mkdir(parents=True, exist_ok=True)
    if salva_html:
        (OUT / 'premium.html').write_text(doc, encoding='utf-8')
    (OUT / file_pdf).write_bytes(pdf)
    print(f'{file_pdf}: {len(reso.pages)} pagine, {len(pdf) / 1e6:.1f} MB, compattate {len(livelli)}, corte {sorted(base.corte(pdf, starts, soglia=500))}')
    return OUT / file_pdf


if __name__ == '__main__':
    alta = costruisci(1700, 'Il-libro-di-cucina-della-Putiga-PREMIUM-IT.pdf', '--html' in sys.argv)
    if '--solo-alta' not in sys.argv:
        costruisci(1000, 'Il-libro-di-cucina-della-Putiga-PREMIUM-IT-leggero.pdf')
    subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-r', '300', '-jpeg', '-jpegopt', 'quality=92', '-singlefile', str(alta), str(OUT / 'copertina-premium')], check=True)
    print('copertina:', OUT / 'copertina-premium.jpg')
