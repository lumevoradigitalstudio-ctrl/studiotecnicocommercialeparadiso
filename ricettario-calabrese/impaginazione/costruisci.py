#!/usr/bin/env python3
"""Impagina il ricettario in PDF.

Uso (dalla cartella ricettario-calabrese):
    python3 impaginazione/costruisci.py          # entrambe le edizioni
    python3 impaginazione/costruisci.py it       # solo italiano
    python3 impaginazione/costruisci.py en --html  # salva anche l'HTML intermedio

Le immagini mancanti (non ancora scaricate con immagini/scarica_immagini.py)
diventano riquadri segnaposto con il nome del file.
"""
import html, pathlib, re, sys, unicodedata

import markdown
import yaml
from weasyprint import HTML

R = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(R / 'controlli'))
from converti_misure import peso, volume, temp, lung  # stesse regole delle ricette EN

EDITORE = 'A Putiga – Sapori di Calabria'
AUTORE = ''  # shortcut: vuoto finché l'utente non dà il nome; poi compare in copertina e nel colophon
ANNO = 2026

CONF = {
    'it': dict(
        titolo='Il libro di cucina della Putìga',
        sottotitolo='60 ricette calabresi di casa, dai salumi ai dolci delle feste',
        sopratitolo='Ricettario calabrese',
        file='Ricettario-Calabrese-A-Putiga-IT.pdf',
        indice='Indice', glossario='Glossario dei nomi in dialetto', conversioni='Tabella delle conversioni',
        ing_indice='Indice per ingredienti', didascalia='Immagine illustrativa generata con IA',
        didascalia_passi='Passaggi chiave · immagini illustrative generate con IA',
        mancante='immagine da scaricare', metodo='Procedimento', ingredienti='Ingredienti',
        num='numero', cap='capitolo', tit='titolo', dial='dialetto', da_verif='DA VERIFICARE',
        nota_gloss='Ogni nome rimanda alla ricetta in cui è spiegato. Sono esclusi i nomi ancora da verificare.',
        nota_conv='Misure usate nelle ricette. I cucchiai sono rasi.',
        cucchiai=[('1 cucchiaino', '5 ml'), ('1 cucchiaio', '15 ml'), ('1 bicchiere', '200 ml')],
        intest=('Peso', 'Volume', 'Temperatura del forno', 'Lunghezza')),
    'en': dict(
        titolo='The Putìga Cookbook',
        sottotitolo='60 Calabrian home recipes, from cured meats to festive sweets',
        sopratitolo='Calabrian home cooking',
        file='Calabrian-Cookbook-A-Putiga-EN.pdf',
        indice='Contents', glossario='Glossary of dialect names', conversioni='Conversion tables',
        ing_indice='Index by ingredient', didascalia='Illustrative image generated with AI',
        didascalia_passi='Key steps · illustrative images generated with AI',
        mancante='image to download', metodo='Method', ingredienti='Ingredients',
        num='number', cap='chapter', tit='title', dial='dialect', da_verif='TO BE VERIFIED',
        nota_gloss='Each name points to the recipe where it is explained. Names still to be verified are left out.',
        nota_conv='The conversions used in the recipes. US cup = 236.6 ml. Spoons are level.',
        cucchiai=[('1 teaspoon', '5 ml'), ('1 tablespoon', '15 ml'), ('1 US cup', '236.6 ml')],
        intest=('Weight', 'Volume', 'Oven temperature', 'Length')),
}

# (etichetta IT, regex IT, etichetta EN, regex EN): cercate solo nella sezione ingredienti
INGREDIENTI = [
    ('Acciughe e alici', r'alic|acciug', 'Anchovies', r'anchov'),
    ('Agnello', r'agnell', 'Lamb', r'\blamb\b'),
    ('Baccalà e stocco', r'baccal|stocc', 'Salt cod and stockfish', r'salt cod|baccal|stockfish|stocco'),
    ('Caciocavallo', r'caciocaval', 'Caciocavallo', r'caciocaval'),
    ('Capra', r'\bcapra', 'Goat', r'\bgoat'),
    ('Ceci', r'\bceci\b', 'Chickpeas', r'chickpea'),
    ('Cipolla rossa di Tropea', r'tropea', 'Tropea red onion', r'tropea'),
    ('Fagioli', r'fagiol', 'Beans', r'(?<!broad )\bbeans\b'),
    ('Fichi', r'\bfich', 'Figs', r'\bfigs?\b'),
    ('Funghi', r'fungh|porcin', 'Mushrooms', r'mushroom|porcini'),
    ('Mandorle', r'mandorl', 'Almonds', r'almond'),
    ('Melanzane', r'melanzan', 'Aubergines', r'aubergine'),
    ('Miele', r'\bmiele', 'Honey', r'\bhoney\b(?! mush)'),
    ("'Nduja", r"'nduja", "'Nduja", r"'nduja"),
    ('Noci', r'\bnoci\b', 'Walnuts', r'walnut'),
    ('Olive', r'\bolive\b', 'Olives', r'\bolives\b'),
    ('Pancetta', r'pancett', 'Pancetta', r'pancetta|pork belly'),
    ('Pane raffermo e mollica', r'raffermo|mollica|pangrattato', 'Stale bread and breadcrumbs', r'stale|breadcrumb'),
    ('Patate', r'patat', 'Potatoes', r'potato'),
    ('Pecorino', r'pecorin', 'Pecorino', r'pecorin'),
    ('Peperoncino', r'peperoncin', 'Chilli', r'chill?i'),
    ('Peperoni', r'peperon[ie]\b', 'Sweet peppers', r'sweet (?:red )?peppers?|(?:red|yellow|green|frying|round) peppers|\d peppers'),
    ('Pesce spada', r'spada', 'Swordfish', r'swordfish'),
    ('Piselli', r'pisell', 'Peas', r'(?<!grass )\bpeas\b'),
    ('Pomodori', r'pomodor|passata|pelati', 'Tomatoes', r'tomato|passata'),
    ('Ricotta', r'ricott', 'Ricotta', r'ricotta'),
    ('Salsiccia', r'di salsiccia', 'Sausage', r'fresh sausage'),
    ('Semola di grano duro', r'semol|grano duro', 'Durum wheat semolina', r'semolina|durum'),
    ('Sesamo', r'sesam', 'Sesame', r'sesame'),
    ('Strutto', r'strutt|sugna', 'Lard', r'\blard\b'),
    ('Tonno', r'\btonno', 'Tuna', r'\btuna'),
    ('Uova', r'\buov[ao]', 'Eggs', r'\beggs?\b'),
    ('Uvetta', r'uvett|uva passa|uva sultanina', 'Raisins', r'raisin|sultana'),
    ('Zucchine e fiori di zucca', r'zucchin|fiori di zucca', 'Courgettes and courgette flowers', r'courgette|zucchin'),
]


def leggi(p):
    _, fm, corpo = p.read_text(encoding='utf-8').split('---\n', 2)
    return yaml.safe_load(fm), corpo


def md(testo):
    # Python-Markdown vuole una riga vuota prima di un elenco: nei testi spesso c'è un'etichetta in grassetto subito sopra
    testo = re.sub(r'(?m)^((?![-*] |\d+\. ).*\S.*)\n(?=[-*] |\d+\. )', r'\1\n\n', testo)
    testo = re.sub(r'(?m)^   (?=\S)', '    ', testo)  # sottoelenchi rientrati di 3 spazi: Markdown ne vuole 4
    return markdown.markdown(testo, extensions=['sane_lists', 'tables'])


def chiave(s):
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(c for c in s if c.isalnum())


def ridotta(p, lato):
    """Copia ridotta per il PDF (resta sotto i 50 MB); gli originali non si toccano."""
    from PIL import Image
    q = R / 'output' / '.immagini' / p.name
    if not q.exists() or q.stat().st_mtime < p.stat().st_mtime:
        q.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(p) as im:
            im = im.convert('RGB')
            im.thumbnail((lato, lato))
            im.save(q, "JPEG", quality=76, optimize=True, progressive=True)
    return q


def immagine(rel, classe, c):
    p = R / rel
    if p.exists():
        # principale 180 mm, passaggi 56 mm: circa 225-250 dpi
        return f'<img class="{classe}" src="{ridotta(p, {"sfondo": 2200, "foto": 1600}.get(classe, 560)).as_uri()}" alt="">'
    return f'<div class="{classe} segnaposto"><span>{c["mancante"]}<br>{html.escape(p.name)}</span></div>'


def ricetta(fm, corpo, c):
    n = fm[c['num']]
    slug = next((R / 'ricette' / 'it').glob(f'{n:02d}-*.md')).stem  # le immagini usano i nomi IT
    base = f'immagini/{slug}/{n:02d}'
    h = md(corpo)
    h = h.replace('<code>', '<span class="verif">').replace('</code>', '</span>')
    h = re.sub(r'<h1>(.*?)</h1>', lambda m: f'<h1 class="ricetta" id="r{n:02d}">{m.group(1)}</h1>', h, count=1)
    # sezioni: tutto ciò che segue il Procedimento va nelle note a due colonne
    parti = re.split(r'(?=<h2>)', h)
    testa, sezioni = parti[0], parti[1:]
    i_met = next(i for i, s in enumerate(sezioni) if s.startswith(f'<h2>{c["metodo"]}'))
    passi = ''.join(immagine(f'{base}-passo-{k}.jpg', 'passo', c) for k in (1, 2, 3))
    striscia = f'<figure class="passi"><div class="riga">{passi}</div><figcaption>{c["didascalia_passi"]}</figcaption></figure>'
    corpo_html = ''.join(f'<section>{s}</section>' for s in sezioni[:i_met + 1])
    note = ''.join(f'<section>{s}</section>' for s in sezioni[i_met + 1:])
    principale = (f'<figure class="principale">{immagine(base + "-principale.jpg", "foto", c)}'
                  f'<figcaption>{c["didascalia"]}</figcaption></figure>')
    return (f'<article class="ricetta">{principale}{testa}{corpo_html}{striscia}'
            f'<div class="note">{note}</div></article>')


def ingredienti_md(corpo, c):
    """Testo delle sezioni ingredienti (anche 'Ingredienti (versione di oggi)'), fino alla sezione successiva."""
    return ' '.join(re.findall(rf'^## {c["ingredienti"]}.*?(?=^## )', corpo, flags=re.S | re.M)).lower()


def conversioni(c):
    righe = lambda valori: ''.join(f'<tr><td>{a}</td><td>{b}</td></tr>' for a, b in valori)
    pesi = [(f'{g} g', ' '.join(peso(g))) for g in (10, 25, 50, 100, 150, 200, 250, 300, 500, 750, 1000)]
    vol = [(f'{m} ml', ' '.join(volume(m))) for m in (5, 15, 30, 60, 120, 180, 250, 500, 1000)]
    gradi = [(f'{t} °C', ' '.join(temp(t))) for t in (140, 160, 170, 180, 190, 200, 220, 250)]
    cm = [(f'{x} cm', ' '.join(lung(x))) for x in (1, 2, 5, 10, 20, 24, 26, 30)]
    tabelle = ''.join(f'<table><tr><th colspan="2">{t}</th></tr>{righe(v)}</table>'
                      for t, v in zip(c['intest'], (pesi, vol, gradi, cm)))
    return (f'<section class="appendice" id="conversioni"><h1 class="appendice">{c["conversioni"]}</h1>'
            f'<p>{c["nota_conv"]}</p><div class="tabelle">{tabelle}'
            f'<table><tr><th colspan="2">&nbsp;</th></tr>{righe(c["cucchiai"])}</table></div></section>')


def costruisci(lingua, salva_html=False):
    c = CONF[lingua]
    cart = R / 'ricette' / lingua
    ricette = sorted((leggi(p) for p in cart.glob('[0-9][0-9]-*.md')), key=lambda x: x[0][c['num']])
    aperture = {fm[c['cap']]: corpo for fm, corpo in (leggi(p) for p in cart.glob('c*-*.md'))}
    assert len(ricette) == 60, len(ricette)

    capitoli = []  # [(nome, [ (fm, corpo) ])] nell'ordine delle ricette
    for fm, corpo in ricette:
        if not capitoli or capitoli[-1][0] != fm[c['cap']]:
            capitoli.append((fm[c['cap']], []))
        capitoli[-1][1].append((fm, corpo))

    sost = dict(titolo=c['titolo'], sottotitolo=c['sottotitolo'], anno=ANNO, editore=EDITORE, autore=AUTORE)
    testo = lambda nome: md((pathlib.Path(__file__).parent / 'testi' / lingua / f'{nome}.md')
                            .read_text(encoding='utf-8').format(**sost))

    # copertina
    autore = f'<p class="autore">{AUTORE}</p>' if AUTORE else ''
    out = [f'''<section class="copertina">{immagine("immagini/copertina/copertina.jpg", "sfondo", c)}
      <div class="testata"><p class="sopratitolo">{c["sopratitolo"]}</p><h1 class="titolo-libro">{c["titolo"]}</h1>
      <p class="sottotitolo">{c["sottotitolo"]}</p>{autore}</div>
      <div class="piede"><p class="editore">{EDITORE}</p><p class="nota-ia">{c["didascalia"]}</p></div></section>''']
    out.append(f'<section class="colophon">{testo("colophon")}</section>')

    # indice
    voci = []
    for k, (nome, rr) in enumerate(capitoli, 1):
        sotto = ''.join(f'<li><a href="#r{fm[c["num"]]:02d}">{html.escape(fm[c["tit"]])}</a></li>' for fm, _ in rr)
        voci.append(f'<li class="cap"><a href="#cap{k}">{html.escape(nome)}</a><ul>{sotto}</ul></li>')
    finali = [('glossario', c['glossario']), ('conversioni', c['conversioni']), ('ing-indice', c['ing_indice'])]
    voci.append(''.join(f'<li class="cap"><a href="#{i}">{t}</a></li>' for i, t in finali))
    out.append(f'<section class="indice"><h1 class="indice">{c["indice"]}</h1><ul>'
               f'<li class="cap"><a href="#intro">{re.search(r"<h1>(.*?)</h1>", testo("introduzione")).group(1)}</a></li>'
               f'{"".join(voci)}</ul></section>')
    out.append('<section class="intro" id="intro">' + testo('introduzione').replace('<h1>', '<h1 class="appendice">', 1) + '</section>')

    # capitoli e ricette
    for k, (nome, rr) in enumerate(capitoli, 1):
        apertura = aperture.get(nome)
        testo_ap = re.sub(r'<h1>.*?</h1>', '', md(apertura), count=1) if apertura else ''
        testo_ap = testo_ap.replace('<code>', '<span class="verif">').replace('</code>', '</span>')
        out.append(f'<section class="apertura"><p class="numcap">{k}</p>'
                   f'<h1 class="capitolo" id="cap{k}">{html.escape(nome)}</h1>{testo_ap}</section>')
        out.extend(ricetta(fm, corpo, c) for fm, corpo in rr)

    # glossario: solo nomi dialettali senza dubbi aperti
    gloss = []
    for fm, _ in ricette:
        d = str(fm.get(c['dial']) or '').strip()
        if not d or d == '—' or c['da_verif'] in d:
            continue
        gloss.append((chiave(d), f'<dt>{html.escape(d)}</dt><dd><a href="#r{fm[c["num"]]:02d}">'
                                 f'{html.escape(fm[c["tit"]])}</a></dd>'))
    out.append(f'<section class="appendice" id="glossario"><h1 class="appendice">{c["glossario"]}</h1>'
               f'<p>{c["nota_gloss"]}</p><dl class="glossario">{"".join(v for _, v in sorted(gloss))}</dl></section>')

    out.append(conversioni(c))

    # indice per ingredienti
    i_lab, i_re = (0, 1) if lingua == 'it' else (2, 3)
    righe, conteggi = [], {}
    for voce in sorted(INGREDIENTI, key=lambda v: chiave(v[i_lab])):
        trovate = [fm for fm, corpo in ricette if re.search(voce[i_re], ingredienti_md(corpo, c))]
        conteggi[voce[i_lab]] = len(trovate)
        if trovate:
            link = ''.join(f'<li><a href="#r{fm[c["num"]]:02d}">{html.escape(fm[c["tit"]])}</a></li>' for fm in trovate)
            righe.append(f'<div class="voce"><h3>{voce[i_lab]}</h3><ul>{link}</ul></div>')
    out.append(f'<section class="appendice" id="ing-indice"><h1 class="appendice">{c["ing_indice"]}</h1>'
               f'<div class="ing-indice">{"".join(righe)}</div></section>')
    out.append(f'<section class="chiusura">{testo("chiusura")}</section>')

    css = (pathlib.Path(__file__).parent / 'stile.css').as_uri()
    doc = (f'<!DOCTYPE html><html lang="{lingua}"><head><meta charset="utf-8"><title>{c["titolo"]}</title>'
           f'<meta name="author" content="{AUTORE or EDITORE}"><link rel="stylesheet" href="{css}"></head>'
           f'<body data-x="{c["titolo"]}">{"".join(out)}</body></html>')
    dest = R / 'output'
    dest.mkdir(exist_ok=True)
    if salva_html:
        (dest / f'{lingua}.html').write_text(doc, encoding='utf-8')
    HTML(string=doc, base_url=str(R)).write_pdf(dest / c['file'])
    mancanti = len(re.findall(r'class="(?:foto|passo) segnaposto"', doc))
    print(f'{c["file"]}: {len(ricette)} ricette, {len(capitoli)} capitoli, voci di glossario {len(gloss)}, '
          f'immagini segnaposto {mancanti}')
    print('  ingredienti:', ', '.join(f'{k} {v}' for k, v in conteggi.items()))


if __name__ == '__main__':
    lingue = [a for a in sys.argv[1:] if a in CONF] or list(CONF)
    for l in lingue:
        costruisci(l, '--html' in sys.argv)
