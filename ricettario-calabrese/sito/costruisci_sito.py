#!/usr/bin/env python3
"""Genera il sito di vendita statico (IT + EN) in sito/pubblico/.

Uso (dalla cartella ricettario-calabrese):  python3 sito/costruisci_sito.py
Prima rigenera i PDF (impaginazione/costruisci.py): pagine, peso, anteprime e ricetta omaggio vengono da lì.
Il sito non usa cookie, statistiche né servizi esterni: si carica così com'è su qualsiasi hosting statico.
Le animazioni sono in sito/animazioni.js e sito/stile.css e si spengono con "riduci movimento" del sistema.
"""
import html, os, pathlib, re, shutil, subprocess, sys, tempfile

import yaml
from PIL import Image
from pypdf import PdfReader, PdfWriter

R = pathlib.Path(__file__).resolve().parents[1]
S = R / 'sito'
OUT = S / 'pubblico'
EDITORE = 'A Putiga – Sapori di Calabria'

# --- DA COMPLETARE prima di mettere il sito online -------------------------------------------
# Link di acquisto della piattaforma (Payhip, Lemon Squeezy, Gumroad...): finché è vuoto il sito
# mostra una fascia "anteprima" e i pulsanti portano alla sezione prezzo.
LINK = {'it': 'https://buy.stripe.com/14A6oJenE6TC1bEdg11sQ04', 'en': 'https://buy.stripe.com/7sYfZjenEcdW2fI2Bn1sQ05'}  # Stripe (account A Putiga / Pizzeria 400 gradi)
# pagine di download nascoste: dopo il pagamento Stripe rimanda qui (vedi after_completion dei link)
# shortcut: chi conosce il link può condividerlo; se diventa un problema, serve un download firmato lato server
DOWNLOAD = {'it': 'aJgCJbdDj9QL', 'en': '0zorJh5ufDXr'}
PREZZO = {'it': '12,90 €', 'en': '$14.99'}
EMAIL = os.environ.get('CONTATTO_EMAIL', '')  # l'email di contatto la imposta il titolare: CONTATTO_EMAIL=... python3 sito/costruisci_sito.py
CONTATTO = 'Tel. 376 0512942' + (f' · {EMAIL}' if EMAIL else '')
DATI_VENDITORE = 'A Putiga di Giovanni Masi · Via Cristoforo Colombo 80, 88046 Lamezia Terme (CZ) · P. IVA 03856550797 · ' + CONTATTO
DOMINIO = ''  # indirizzo definitivo del sito (es. https://ricettario-calabrese.pages.dev): serve solo per l'anteprima social
# ---------------------------------------------------------------------------------------------

SFOGLIA = [1, 10, 11, 21, 22, 70, 71]  # pagine del PDF nel libro da sfogliare (fronte/retro dei fogli)
OMAGGIO = [1, 70, 71, 72]              # copertina + fileja con sugo di 'nduja (ricetta 29)
PIATTI = [5, 29, 7, 41, 55, 60, 9, 30, 45, 57, 19, 53]

T = {
 'it': dict(
    pdf='Ricettario-Calabrese-A-Putiga-IT.pdf', titolo='Il libro di cucina della Putìga',
    sotto='60 ricette calabresi di casa, dai salumi ai dolci delle feste',
    gancio='I sapori di casa, anche lontano da casa.',
    meta='Ricettario digitale in PDF: 60 ricette di cucina calabrese di casa, con salumi, conserve sicure, pasta fatta a mano, secondi e dolci delle feste.',
    altra='English', altra_url='en/index.html', compra='Acquista il PDF', omaggio='Scarica gratis una ricetta',
    anteprima_txt='Anteprima del sito: il pagamento non è ancora attivo.',
    lead='La cucina di casa calabrese spiegata passo per passo: dai giorni del maiale alle conserve di fine estate, dalla pasta tirata a mano ai dolci di Natale e di Pasqua.',
    numeri=[(60, 'ricette'), (9, 'capitoli'), ('{p}', 'pagine A4'), (241, 'illustrazioni')],
    h_dentro='Cosa trovi dentro', h_pagine='Sfoglialo', h_pagine_sub='Tocca la pagina di destra per girarla.',
    h_ricette='60 ricette in 9 capitoli', h_perchi='Per chi è', h_omaggio='Prima di comprarlo, assaggialo',
    omaggio_txt='Scarica gratis la ricetta dei fileja con sugo di \'nduja, impaginata come nel libro. Niente email, niente iscrizioni.',
    h_prezzo='Il libro completo', h_faq='Domande frequenti', prec='Pagina precedente', succ='Pagina successiva',
    dentro=[('Ricette che riescono al primo colpo', 'Dosi in grammi, passaggi numerati con un\'azione alla volta e i segni da guardare: colore, profumo, consistenza, temperatura.'),
            ('Salumi e conserve in sicurezza', 'Le conserve seguono le linee guida dell\'Istituto Superiore di Sanità. I salumi spiegano sale nitritato, pH e calo di peso. I metodi di una volta non più sicuri sono raccontati come storia.'),
            ('Tutto quello che serve intorno', 'Per ogni ricetta: consigli, errori da evitare, varianti, conservazione, sostituzioni per chi vive fuori dalla Calabria, allergeni UE, prodotti DOP e IGP, un vino DOC calabrese.'),
            ('Glossario e indici', 'Indice cliccabile, glossario dei nomi in dialetto, tabella delle conversioni e indice per ingredienti.')],
    perchi='Per chi è nato in Calabria e vive lontano. Per chi ha nonni calabresi e vuole rifare i piatti di casa. Per chi ama la cucina regionale italiana e vuole ricette precise, senza scorciatoie e senza segreti inventati.',
    prezzo_punti=['PDF a colori, {p} pagine, più la versione EPUB', 'Leggibile su telefono, tablet e computer', 'Stampabile in A4 per uso personale', 'Download subito dopo il pagamento'],
    prezzo_note='Pagamento sicuro con Stripe: carta, Apple Pay, Google Pay e altri metodi.',
    faq=[('Come ricevo il libro?', 'Dopo il pagamento ricevi un link per scaricare il PDF, anche via email. Puoi leggerlo su computer, tablet e telefono.'),
         ('Posso stamparlo?', 'Sì, è impaginato in formato A4, per uso personale.'),
         ('Le ricette sono originali calabresi?', 'Certo. Sono piatti della cucina di casa calabrese, scelti zona per zona, dal Vibonese alla Sila, da Reggio al Cosentino, e controllati uno per uno su fonti calabresi: disciplinari DOP e IGP, elenchi dei prodotti tradizionali, testi di cucina regionale. I testi sono scritti da zero per questo libro.'),
         ('C\'è anche in inglese?', 'Sì, esiste un\'edizione inglese separata, con le misure americane (oz, cups, °F) accanto a quelle metriche.'),
         ('Posso chiedere il rimborso?', 'Per i contenuti digitali scaricati subito il diritto di recesso non si applica, come previsto dal Codice del Consumo. I dettagli sono nelle condizioni di vendita.')],
    legali='Condizioni di vendita e privacy', legali_url='condizioni.html',
    h_cond='Condizioni di vendita e privacy'),
 'en': dict(
    pdf='Calabrian-Cookbook-A-Putiga-EN.pdf', titolo='The Putìga Cookbook',
    sotto='60 Calabrian home recipes, from cured meats to festive sweets',
    gancio='The flavours of Calabria, in your own kitchen.',
    meta='Digital PDF cookbook: 60 Calabrian home recipes, with home-cured meats, safe preserves, hand-made pasta, main courses and festive sweets. US measures included.',
    altra='Italiano', altra_url='../index.html', compra='Buy the PDF', omaggio='Download a free recipe',
    anteprima_txt='Site preview: payment is not active yet.',
    lead='Southern Italian home cooking from Calabria, explained step by step: from pork-curing days to late-summer preserves, from hand-rolled pasta to Christmas and Easter sweets.',
    numeri=[(60, 'recipes'), (9, 'chapters'), ('{p}', 'A4 pages'), (241, 'illustrations')],
    h_dentro="What's inside", h_pagine='Flip through it', h_pagine_sub='Tap the right-hand page to turn it.',
    h_ricette='60 recipes in 9 chapters', h_perchi="Who it's for", h_omaggio='Taste it before you buy it',
    omaggio_txt="Download the fileja with 'nduja sauce recipe for free, laid out exactly as in the book. No email, no sign-up.",
    h_prezzo='The complete book', h_faq='Questions', prec='Previous page', succ='Next page',
    dentro=[('Recipes that work the first time', 'Metric quantities with US measures in brackets, numbered steps with one action at a time, and the signs to look for: colour, smell, texture, temperature.'),
            ('Cured meats and preserves, made safely', 'The preserves follow the Italian National Institute of Health guidelines. The cured meats explain curing salt, pH and weight loss. Old methods that are no longer safe are told as history.'),
            ('Everything around the recipe', 'For every recipe: tips, common mistakes, local variations, storage, substitutions for cooks outside Italy, EU allergens, PDO and PGI products, a Calabrian DOC wine.'),
            ('Glossary and indexes', 'Clickable contents, a glossary of dialect names, conversion tables and an index by ingredient.')],
    perchi='For Italian-Americans and anyone with Calabrian roots who wants to cook the dishes of home. For every cook who loves Italian regional food and wants precise recipes, with no shortcuts and no made-up secrets.',
    prezzo_punti=['Full-colour PDF, {p} pages, plus the EPUB edition', 'Read it on phone, tablet or computer', 'Printable on A4 for personal use', 'Instant download after payment'],
    prezzo_note='Secure payment with Stripe: card, Apple Pay, Google Pay and more.',
    faq=[('How do I get the book?', 'After payment you get a link to download the PDF, also by email. Read it on a computer, tablet or phone.'),
         ('Can I print it?', 'Yes, it is laid out on A4 pages, for personal use.'),
         ('Are these authentic Calabrian recipes?', 'Of course. They are Calabrian home-cooking dishes, chosen area by area, from Vibo Valentia to the Sila mountains, from Reggio to Cosenza, and checked one by one against Calabrian sources: PDO and PGI product specifications, official lists of traditional foods, regional cookbooks. The texts were written from scratch for this book.'),
         ('Are US measures included?', 'Yes: every quantity is in grams and millilitres with oz, cups and °F in brackets.'),
         ('Can I get a refund?', 'Digital content delivered immediately is not covered by the EU right of withdrawal. See the terms of sale for details.')],
    legali='Terms of sale and privacy', legali_url='terms.html',
    h_cond='Terms of sale and privacy'),
}

COND = {
 'it': """<p class="avviso">Testo di base da far controllare a un commercialista o a un legale prima della pubblicazione.</p>
<h2>Venditore</h2><p>{venditore}</p>
<h2>Prodotto</h2><p>«{titolo}» è un libro digitale in formato PDF ({p} pagine). Non è previsto l'invio di copie stampate.</p>
<h2>Prezzo e pagamento</h2><p>Il prezzo è indicato in euro, IVA inclusa. Il pagamento e la consegna sono gestiti dalla piattaforma di vendita indicata al momento dell'acquisto, secondo le sue condizioni.</p>
<h2>Consegna</h2><p>Il link per scaricare il PDF arriva subito dopo il pagamento, sullo schermo e via email.</p>
<h2>Diritto di recesso</h2><p>Per i contenuti digitali forniti subito, il diritto di recesso non si applica se chi compra dà il consenso all'esecuzione immediata e riconosce di perdere il diritto di recesso (art. 59, comma 1, lettera o, del Codice del Consumo).</p>
<h2>Uso del libro</h2><p>Il PDF è per uso personale. Non può essere rivenduto, condiviso o pubblicato, in tutto o in parte, senza il permesso scritto dell'editore. La ricetta omaggio si può condividere così com'è.</p>
<h2>Sicurezza alimentare</h2><p>Segui le dosi, le temperature e i tempi indicati, soprattutto per conserve e salumi. Le informazioni su allergeni e sicurezza alimentare non sostituiscono il parere di un medico o di un tecnico alimentare.</p>
<h2>Privacy</h2><p>Questo sito non usa cookie, non raccoglie statistiche e non chiede dati. I dati necessari all'acquisto (nome, email, pagamento) sono trattati dalla piattaforma di vendita, secondo la sua informativa privacy.</p>""",
 'en': """<p class="avviso">Draft text to be checked by an accountant or a lawyer before publication.</p>
<h2>Seller</h2><p>{venditore}</p>
<h2>Product</h2><p>“{titolo}” is a digital book in PDF format ({p} pages). No printed copies are shipped.</p>
<h2>Price and payment</h2><p>Payment and delivery are handled by the sales platform shown at checkout, under its own terms. Any sales tax or VAT is calculated at checkout according to your country.</p>
<h2>Delivery</h2><p>The download link appears straight after payment, on screen and by email.</p>
<h2>Right of withdrawal and refunds</h2><p>For digital content supplied immediately, the EU right of withdrawal does not apply once you consent to immediate delivery and acknowledge that you lose that right.</p>
<h2>Use of the book</h2><p>The PDF is for personal use. It may not be resold, shared or published, in whole or in part, without the publisher's written permission. The free sample recipe may be shared as it is.</p>
<h2>Food safety</h2><p>Follow the quantities, temperatures and times given, especially for preserves and cured meats. The allergen and food safety information does not replace the advice of a doctor or a food safety professional.</p>
<h2>Privacy</h2><p>This site uses no cookies, collects no statistics and asks for no data. The data needed for a purchase (name, email, payment) is handled by the sales platform, under its privacy policy.</p>""",
}

VAPORE = ('<svg class="vapore" viewBox="0 0 120 120" aria-hidden="true">'
          + ''.join(f'<path style="animation-delay:{d}s" d="M{x} 110 C{x - 12} 85,{x + 12} 70,{x} 45 S{x - 10} 15,{x} 0"/>'
                    for x, d in ((35, 0), (60, 1.3), (85, 2.6))) + '</svg>')


def leggi(p):
    return yaml.safe_load(p.read_text(encoding='utf-8').split('---\n', 2)[1])


def foto(src, dest, lato, q=80):
    with Image.open(src) as im:
        im = im.convert('RGB')
        im.thumbnail((lato, lato))
        im.save(dest, 'JPEG', quality=q, optimize=True, progressive=True)
    return dest.name


def principale(n):
    return next((R / 'immagini').glob(f'{n:02d}-*')) / f'{n:02d}-principale.jpg'


def pagine_pdf(pdf, numeri, cartella, prefisso):
    nomi = {}
    with tempfile.TemporaryDirectory() as tmp:
        for n in numeri:
            subprocess.run(['pdftoppm', '-r', '110', '-jpeg', '-f', str(n), '-l', str(n), '-singlefile', str(pdf), f'{tmp}/p'], check=True)
            nomi[n] = foto(f'{tmp}/p.jpg', cartella / f'{prefisso}-pagina-{n}.jpg', 900, 78)
    return nomi


def omaggio(pdf, dest):
    """Estratto di poche pagine. WeasyPrint mette tutte le immagini del libro nelle risorse condivise:
    ogni pagina tiene solo quelle che disegna, altrimenti l'estratto pesa quanto il libro."""
    from pypdf.generic import DictionaryObject, NameObject
    w = PdfWriter()
    r = PdfReader(pdf)
    for n in OMAGGIO:
        pg = r.pages[n - 1]  # si sfoltisce la pagina letta, prima di copiarla: così le immagini inutili non entrano mai
        ris = DictionaryObject(pg['/Resources'].get_object())
        if '/XObject' in ris:
            usati = set(re.findall(rb'/([^\s/\[\]<>()]+)\s+Do\b', pg.get_contents().get_data()))
            ris[NameObject('/XObject')] = DictionaryObject({k: v for k, v in ris['/XObject'].get_object().items() if k[1:].encode() in usati})
        pg[NameObject('/Resources')] = ris
        w.add_page(pg)
    w.write(dest)
    assert dest.stat().st_size < 8e6, f'{dest.name}: {dest.stat().st_size / 1e6:.0f} MB'
    return dest.name


def font(cartella):
    cartella.mkdir(exist_ok=True)
    for f in ('EBGaramond.ttf', 'EBGaramond-Italic.ttf', 'IMFeENsc28P.ttf'):
        subprocess.run([sys.executable, '-m', 'fontTools.subset', str(R / 'impaginazione' / 'font' / f),
                        '--unicodes=U+0000-024F,U+2000-206F,U+20AC,U+2122,U+2212', '--flavor=woff2',
                        f'--output-file={cartella / f.replace(".ttf", ".woff2")}'], check=True)
    for f in ('OFL-EBGaramond.txt', 'OFL-IMFell.txt'):
        shutil.copy(R / 'impaginazione' / 'font' / f, cartella / f)


def pagina(lingua, info, img, capitoli):
    t, e = T[lingua], html.escape
    pre = '' if lingua == 'it' else '../'
    link = LINK[lingua] or '#prezzo'
    anteprima = '' if LINK[lingua] else f'<div class="anteprima">{t["anteprima_txt"]}</div>'
    numeri = ''.join(f'<li><b data-conta="{str(v).format(**info)}">{str(v).format(**info)}</b><span>{e(l)}</span></li>' for v, l in t['numeri'])
    dentro = ''.join(f'<div class="card" data-anim style="--i:{i}"><span class="num">{i + 1}</span><h3>{e(a)}</h3><p>{e(b)}</p></div>'
                     for i, (a, b) in enumerate(t['dentro']))
    righe = [img['piatti'][:6], img['piatti'][6:]]
    nastri = ''.join(f'<div class="nastro{" inverso" if k else ""}"><div class="scorre">'
                     + ''.join(f'<img src="{pre}img/{n}" alt="" loading="lazy" width="320" height="240">' for n in r * 2)
                     + '</div></div>' for k, r in enumerate(righe))
    fogli = [(SFOGLIA[i], SFOGLIA[i + 1] if i + 1 < len(SFOGLIA) else None) for i in range(0, len(SFOGLIA), 2)]
    libro = ''.join(f'<div class="foglio" style="--z:{len(fogli) - k}"><img class="fronte" src="{pre}img/{img["pagine"][a]}" alt="" loading="lazy">'
                    + (f'<img class="retro" src="{pre}img/{img["pagine"][b]}" alt="" loading="lazy">' if b else '<div class="retro vuoto"></div>')
                    + '</div>' for k, (a, b) in enumerate(fogli))
    caps = ''.join(f'<details class="cap" data-anim style="--i:{k % 3}"><summary><img src="{pre}img/{img["capitoli"][k]}" alt="" loading="lazy">'
                   f'<span class="nome">{e(nome)}</span><span class="quante">{len(rr)}</span></summary>'
                   f'<ol start="{rr[0][0]}">' + ''.join(f'<li>{e(tit)}</li>' for _, tit in rr) + '</ol></details>'
                   for k, (nome, rr) in enumerate(capitoli))
    punti = ''.join(f'<li>{e(p.format(**info))}</li>' for p in t['prezzo_punti'])
    faq = ''.join(f'<details data-anim><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in t['faq'])
    video = (f'<video data-video muted loop playsinline preload="none" poster="{pre}img/{img["sfondo"]}">'
             f'<source src="{pre}video/hero.mp4" type="video/mp4"><source src="{pre}video/hero.webm" type="video/webm"></video>') if img.get('video') else ''
    alt = (f'<link rel="alternate" hreflang="it" href="{DOMINIO}/"><link rel="alternate" hreflang="en" href="{DOMINIO}/en/">'
           f'<meta property="og:image" content="{DOMINIO}/img/copertina-{lingua}.jpg">') if DOMINIO else ''
    return f'''<!DOCTYPE html>
<html lang="{lingua}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(t["titolo"])} — {e(t["sotto"])}</title><meta name="description" content="{e(t["meta"])}">
<meta property="og:title" content="{e(t["titolo"])}"><meta property="og:description" content="{e(t["meta"])}">{alt}
<link rel="preload" as="image" href="{pre}img/{img["sfondo"]}"><link rel="stylesheet" href="{pre}stile.css"></head>
<body><div class="progresso" aria-hidden="true"></div>{anteprima}
<header class="barra"><span class="marchio">{EDITORE}</span><nav><a class="lingua" href="{t["altra_url"]}">{t["altra"]}</a>
<a class="bottone piccolo-btn" href="{link}">{t["compra"]}</a></nav></header>
<main>
<section class="hero"><div class="sfondo" aria-hidden="true"><img src="{pre}img/{img["sfondo"]}" alt="">{video}</div><div class="polvere" aria-hidden="true"></div>
<div class="hero-int"><div class="scena" data-tilt><div class="libro"><img class="fronte" src="{pre}img/{img["copertina"]}" alt="{e(t["titolo"])}" width="900" height="1273">
<div class="dorso"></div><div class="taglio"></div></div></div>
<div class="hero-testo"><p class="gancio">{e(t["gancio"])}</p><h1 class="titolo-anim">{e(t["titolo"])}</h1><p class="sotto">{e(t["sotto"])}</p>
<p class="lead">{e(t["lead"])}</p><div class="azioni"><a class="bottone luccica" href="{link}">{t["compra"]} · {PREZZO[lingua]}</a>
<a class="secondario" href="{img["omaggio"]}" download>{t["omaggio"]} ↓</a></div></div></div></section>
<ul class="numeri" data-anim>{numeri}</ul>
<section class="nastri" aria-hidden="true">{nastri}</section>
<section><h2 data-anim>{t["h_dentro"]}</h2><div class="cards">{dentro}</div></section>
<section class="sfoglia-sez"><h2 data-anim>{t["h_pagine"]}</h2><p class="sub" data-anim>{t["h_pagine_sub"]}</p>
<div class="libro-aperto" data-libro data-anim><div class="pagina-sx"></div>{libro}</div>
<div class="frecce"><button type="button" data-prec aria-label="{t["prec"]}">←</button><button type="button" data-succ aria-label="{t["succ"]}">→</button></div></section>
<section><h2 data-anim>{t["h_ricette"]}</h2><div class="capitoli">{caps}</div></section>
<section class="omaggio" data-anim><div class="piatto-vapore"><img src="{pre}img/{img["piatti"][1]}" alt="" loading="lazy">{VAPORE}</div>
<div><h2>{t["h_omaggio"]}</h2><p>{e(t["omaggio_txt"])}</p><a class="bottone verde" href="{img["omaggio"]}" download>{t["omaggio"]} ↓</a></div></section>
<section><h2 data-anim>{t["h_perchi"]}</h2><p class="testo" data-anim>{e(t["perchi"])}</p></section>
<section id="prezzo" class="prezzo"><div class="prezzo-card" data-anim><h2>{t["h_prezzo"]}</h2><p class="cifra">{PREZZO[lingua]}</p>
<ul class="spunte">{punti}</ul><a class="bottone luccica" href="{link}">{t["compra"]}</a>
<p class="piccolo">{e(t["prezzo_note"])}</p></div></section>
<section><h2 data-anim>{t["h_faq"]}</h2><div class="faq">{faq}</div></section>
</main>
<div class="barra-acquisto" aria-hidden="true"><span>{e(t["titolo"])} · {PREZZO[lingua]}</span><a class="bottone" href="{link}" tabindex="-1">{t["compra"]}</a></div>
<footer><p>© {info["anno"]} {EDITORE}</p><p><a href="{t["legali_url"]}">{t["legali"]}</a></p></footer>
<script src="{pre}animazioni.js" defer></script>
</body></html>'''


def condizioni(lingua, info):
    t = T[lingua]
    pre = '' if lingua == 'it' else '../'
    corpo = COND[lingua].format(venditore=html.escape(DATI_VENDITORE), titolo=t['titolo'], p=info['p'])
    return f'''<!DOCTYPE html>
<html lang="{lingua}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t["h_cond"]} — {html.escape(t["titolo"])}</title><meta name="robots" content="noindex"><link rel="stylesheet" href="{pre}stile.css"></head>
<body><header class="barra"><a class="marchio" href="index.html">{EDITORE}</a></header>
<main class="legale"><h1>{t["h_cond"]}</h1>{corpo}</main>
<footer><p>© {info["anno"]} {EDITORE}</p></footer></body></html>'''


SCARICA = {
    'it': ('Grazie per il tuo acquisto!', 'Scarica il tuo libro qui sotto. Salva questa pagina: il link è solo tuo, non condividerlo.', 'Per qualsiasi problema: '),
    'en': ('Thank you for your purchase!', 'Download your book below. Bookmark this page: the link is just for you, please do not share it.', 'Any problem? Contact us: '),
}


def pagine_download():
    """Una cartella nascosta per edizione con PDF ed EPUB."""
    file = {l: [T[l]['pdf'], T[l]['pdf'].replace('.pdf', '.epub')] for l in ('it', 'en')}
    for chiave in ('it', 'en'):
        cart = OUT / 'd' / DOWNLOAD[chiave]
        cart.mkdir(parents=True)
        voci = ''
        for f in file[chiave]:
            shutil.copy(R / 'output' / f, cart / f)
            voci += f'<li><a class="bottone" href="{f}" download>{f.rsplit(".", 1)[1].upper()} · {html.escape(T[chiave]["titolo"])}</a></li>'
        lang = chiave
        tit, testo, aiuto = SCARICA[lang]
        (cart / 'index.html').write_text(f'''<!DOCTYPE html><html lang="{lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>{tit}</title><link rel="stylesheet" href="../../stile.css"></head><body><main class="legale scarica"><h1>{tit}</h1><p>{testo}</p>
<ul class="download">{voci}</ul><p class="piccolo">{aiuto}{html.escape(CONTATTO)}</p></main></body></html>''', encoding='utf-8')
    (OUT / 'robots.txt').write_text('User-agent: *\nDisallow: /d/\n', encoding='utf-8')


def main():
    if OUT.exists():
        shutil.rmtree(OUT)  # cartella generata: si rifà ogni volta
    (OUT / 'img').mkdir(parents=True)
    (OUT / 'en').mkdir()
    font(OUT / 'font')
    for f in ('stile.css', 'animazioni.js'):
        shutil.copy(S / f, OUT / f)
    piatti = [foto(principale(n), OUT / 'img' / f'piatto-{n:02d}.jpg', 640, 74) for n in PIATTI]
    sfondo = foto(principale(23), OUT / 'img' / 'sfondo.jpg', 1600, 70)  # diversa dalla copertina, che è già sul libro 3D
    video = None
    if (S / 'video' / 'hero.mp4').exists():  # video IA del hero (Higgsfield), già compresso: vedi STATO.md
        (OUT / 'video').mkdir()
        for f in ('hero.mp4', 'hero.webm'):
            shutil.copy(S / 'video' / f, OUT / 'video' / f)
        video = 'hero.mp4'
    for lingua, t in T.items():
        pdf = R / 'output' / t['pdf']
        info = dict(p=len(PdfReader(pdf).pages), anno=2026)
        chiavi = ('numero', 'capitolo', 'titolo') if lingua == 'it' else ('number', 'chapter', 'title')
        capitoli = []
        for p in sorted((R / 'ricette' / lingua).glob('[0-9][0-9]-*.md')):
            fm = leggi(p)
            if not capitoli or capitoli[-1][0] != fm[chiavi[1]]:
                capitoli.append((fm[chiavi[1]], []))
            capitoli[-1][1].append((fm[chiavi[0]], fm[chiavi[2]]))
        pagine = pagine_pdf(pdf, sorted(set(SFOGLIA)), OUT / 'img', lingua)
        base = OUT if lingua == 'it' else OUT / 'en'  # il PDF omaggio sta accanto alla sua pagina
        img = dict(sfondo=sfondo, video=video, copertina=pagine[1], pagine=pagine, piatti=piatti,
                   capitoli=[foto(principale(rr[len(rr) // 2][0]), OUT / 'img' / f'capitolo-{k + 1}.jpg', 640, 74)
                             for k, (_, rr) in enumerate(capitoli)],
                   omaggio=omaggio(pdf, base / ('ricetta-omaggio.pdf' if lingua == 'it' else 'free-recipe.pdf')))
        foto(OUT / 'img' / pagine[1], OUT / 'img' / f'copertina-{lingua}.jpg', 1200)
        (base / 'index.html').write_text(pagina(lingua, info, img, capitoli), encoding='utf-8')
        (base / t['legali_url']).write_text(condizioni(lingua, info), encoding='utf-8')
        print(f'{lingua}: {info["p"]} pagine, link di acquisto {"OK" if LINK[lingua] else "MANCANTE"}')
    pagine_download()
    peso = sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file())
    print(f'sito in {OUT.relative_to(R)}: {peso / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
