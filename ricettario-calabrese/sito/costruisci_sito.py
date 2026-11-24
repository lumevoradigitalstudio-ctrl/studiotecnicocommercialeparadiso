#!/usr/bin/env python3
"""Genera il sito di vendita statico (IT + EN) in sito/pubblico/.

Uso (dalla cartella ricettario-calabrese):  python3 sito/costruisci_sito.py
Prima rigenera i PDF (impaginazione/costruisci.py): pagine, peso e anteprime vengono da lì.
Il sito non usa cookie né statistiche: si può caricare così com'è su qualsiasi hosting statico.
"""
import html, pathlib, shutil, subprocess, sys, tempfile

import yaml
from PIL import Image
from pypdf import PdfReader

R = pathlib.Path(__file__).resolve().parents[1]
OUT = R / 'sito' / 'pubblico'
EDITORE = 'A Putiga – Sapori di Calabria'

# --- DA COMPLETARE prima di mettere il sito online -------------------------------------------
# Link di acquisto della piattaforma (Payhip, Lemon Squeezy, Gumroad...): finché è vuoto il sito
# mostra una fascia "anteprima" e il pulsante porta alla sezione prezzo.
LINK = {'it': '', 'en': ''}
PREZZO = {'it': '12,90 €', 'en': '$14.99'}  # proposta: decidi tu
DATI_VENDITORE = '[Ragione sociale, indirizzo, Partita IVA, email — da completare]'
DOMINIO = ''  # es. 'https://www.esempio.it' — serve per i link tra le lingue e l'anteprima social
# ---------------------------------------------------------------------------------------------

T = {
 'it': dict(
    lang='it', pdf='Ricettario-Calabrese-A-Putiga-IT.pdf', titolo='Il libro di cucina della Putìga',
    sotto='60 ricette calabresi di casa, dai salumi ai dolci delle feste',
    meta='Ricettario digitale in PDF: 60 ricette di cucina calabrese di casa, con salumi, conserve sicure, pasta fatta a mano, secondi e dolci delle feste.',
    altra='English', altra_url='en/', compra='Acquista il PDF', anteprima_txt='Anteprima del sito: il pagamento non è ancora attivo.',
    lead='La cucina di casa calabrese, spiegata passo per passo: dai giorni del maiale alle conserve di fine estate, dalla pasta tirata a mano ai dolci di Natale e di Pasqua.',
    fatti=['{n} ricette in 9 capitoli', '{p} pagine A4 a colori', 'PDF da {mb} MB', 'Edizione italiana'],
    h_dentro='Cosa trovi dentro', h_pagine='Sfoglia qualche pagina', h_ricette='Tutte le ricette', h_perchi='Per chi è',
    h_prezzo='Prezzo', h_faq='Domande frequenti',
    dentro=[('Ricette che riescono al primo colpo', 'Dosi in grammi, passaggi numerati con un\'azione alla volta e i segni da guardare: colore, profumo, consistenza, temperatura.'),
            ('Salumi e conserve in sicurezza', 'Le conserve seguono le linee guida dell\'Istituto Superiore di Sanità. I salumi spiegano sale nitritato, pH e calo di peso. I metodi di una volta non più sicuri sono raccontati come storia.'),
            ('Tutto quello che serve intorno', 'Per ogni ricetta: consigli, errori da evitare, varianti, conservazione, sostituzioni per chi vive fuori dalla Calabria, allergeni UE, prodotti DOP e IGP, un vino DOC calabrese.'),
            ('Glossario e indici', 'Indice cliccabile, glossario dei nomi in dialetto, tabella delle conversioni e indice per ingredienti.')],
    perchi='Per chi è nato in Calabria e vive lontano, per chi ha nonni calabresi e vuole rifare i piatti di casa, per chi ama la cucina regionale italiana e vuole ricette precise, senza scorciatoie e senza segreti inventati.',
    prezzo_note='Pagamento sicuro sulla piattaforma di vendita. Ricevi subito il link per scaricare il PDF.',
    faq=[('Come ricevo il libro?', 'Dopo il pagamento ricevi un link per scaricare il PDF, anche via email. Puoi leggerlo su computer, tablet e telefono.'),
         ('Posso stamparlo?', 'Sì, è impaginato in formato A4, per uso personale.'),
         ('Le foto sono vere?', 'No. Le immagini sono illustrazioni generate con l\'intelligenza artificiale, e ognuna lo dice nella didascalia. I testi e le ricette sono scritti per questo libro.'),
         ('C\'è anche in inglese?', 'Sì, esiste un\'edizione inglese separata, con le misure americane (oz, cups, °F) accanto a quelle metriche.'),
         ('Posso chiedere il rimborso?', 'Per i contenuti digitali scaricati subito il diritto di recesso non si applica, come previsto dal Codice del Consumo. I dettagli sono nelle condizioni di vendita.')],
    legali='Condizioni di vendita e privacy', legali_url='condizioni.html', nota_ia='Immagini illustrative generate con IA.',
    h_cond='Condizioni di vendita e privacy'),
 'en': dict(
    lang='en', pdf='Calabrian-Cookbook-A-Putiga-EN.pdf', titolo='The Putìga Cookbook',
    sotto='60 Calabrian home recipes, from cured meats to festive sweets',
    meta='Digital PDF cookbook: 60 Calabrian home recipes, with home-cured meats, safe preserves, hand-made pasta, main courses and festive sweets. US measures included.',
    altra='Italiano', altra_url='../', compra='Buy the PDF', anteprima_txt='Site preview: payment is not active yet.',
    lead='Southern Italian home cooking from Calabria, explained step by step: from pork-curing days to late-summer preserves, from hand-rolled pasta to Christmas and Easter sweets.',
    fatti=['{n} recipes in 9 chapters', '{p} full-colour A4 pages', '{mb} MB PDF', 'US cups, oz and °F included'],
    h_dentro="What's inside", h_pagine='Look inside', h_ricette='All the recipes', h_perchi="Who it's for",
    h_prezzo='Price', h_faq='Questions',
    dentro=[('Recipes that work the first time', 'Metric quantities with US measures in brackets, numbered steps with one action at a time, and the signs to look for: colour, smell, texture, temperature.'),
            ('Cured meats and preserves, made safely', 'The preserves follow the Italian National Institute of Health guidelines. The cured meats explain curing salt, pH and weight loss. Old methods that are no longer safe are told as history.'),
            ('Everything around the recipe', 'For every recipe: tips, common mistakes, local variations, storage, substitutions for cooks outside Italy, EU allergens, PDO and PGI products, a Calabrian DOC wine.'),
            ('Glossary and indexes', 'Clickable contents, a glossary of dialect names, conversion tables and an index by ingredient.')],
    perchi='For Italian-Americans and anyone with Calabrian roots who wants to cook the dishes of home, and for every cook who loves Italian regional food and wants precise recipes, with no shortcuts and no made-up secrets.',
    prezzo_note='Secure payment on the sales platform. You get the download link straight away.',
    faq=[('How do I get the book?', 'After payment you get a link to download the PDF, also by email. Read it on a computer, tablet or phone.'),
         ('Can I print it?', 'Yes, it is laid out on A4 pages, for personal use.'),
         ('Are the photos real?', 'No. The images are illustrations generated with artificial intelligence, and each caption says so. The texts and recipes were written for this book.'),
         ('Is there an Italian edition?', 'Yes, there is a separate Italian edition.'),
         ('Can I get a refund?', 'Digital content delivered immediately is not covered by the EU right of withdrawal. See the terms of sale for details.')],
    legali='Terms of sale and privacy', legali_url='terms.html', nota_ia='Illustrative images generated with AI.',
    h_cond='Terms of sale and privacy'),
}

COND = {
 'it': """<p class="avviso">Testo di base da far controllare a un commercialista o a un legale prima della pubblicazione.</p>
<h2>Venditore</h2><p>{venditore}</p>
<h2>Prodotto</h2><p>«{titolo}» è un libro digitale in formato PDF ({p} pagine). Non è previsto l'invio di copie stampate.</p>
<h2>Prezzo e pagamento</h2><p>Il prezzo è indicato in euro, IVA inclusa. Il pagamento e la consegna sono gestiti dalla piattaforma di vendita indicata al momento dell'acquisto, secondo le sue condizioni.</p>
<h2>Consegna</h2><p>Il link per scaricare il PDF arriva subito dopo il pagamento, sullo schermo e via email.</p>
<h2>Diritto di recesso</h2><p>Per i contenuti digitali forniti subito, il diritto di recesso non si applica se chi compra dà il consenso all'esecuzione immediata e riconosce di perdere il diritto di recesso (art. 59, comma 1, lettera o, del Codice del Consumo). Se il file non si apre o non arriva, scrivici: lo risolviamo o ti rimborsiamo.</p>
<h2>Uso del libro</h2><p>Il PDF è per uso personale. Non può essere rivenduto, condiviso o pubblicato, in tutto o in parte, senza il permesso scritto dell'editore.</p>
<h2>Sicurezza alimentare</h2><p>Segui le dosi, le temperature e i tempi indicati, soprattutto per conserve e salumi. Le informazioni su allergeni e sicurezza alimentare non sostituiscono il parere di un medico o di un tecnico alimentare.</p>
<h2>Privacy</h2><p>Questo sito non usa cookie, non raccoglie statistiche e non chiede dati. I dati necessari all'acquisto (nome, email, pagamento) sono trattati dalla piattaforma di vendita, secondo la sua informativa privacy.</p>""",
 'en': """<p class="avviso">Draft text to be checked by an accountant or a lawyer before publication.</p>
<h2>Seller</h2><p>{venditore}</p>
<h2>Product</h2><p>“{titolo}” is a digital book in PDF format ({p} pages). No printed copies are shipped.</p>
<h2>Price and payment</h2><p>Payment and delivery are handled by the sales platform shown at checkout, under its own terms. Any sales tax or VAT is calculated at checkout according to your country.</p>
<h2>Delivery</h2><p>The download link appears straight after payment, on screen and by email.</p>
<h2>Right of withdrawal and refunds</h2><p>For digital content supplied immediately, the EU right of withdrawal does not apply once you consent to immediate delivery and acknowledge that you lose that right. If the file does not open or does not arrive, write to us: we will fix it or refund you.</p>
<h2>Use of the book</h2><p>The PDF is for personal use. It may not be resold, shared or published, in whole or in part, without the publisher's written permission.</p>
<h2>Food safety</h2><p>Follow the quantities, temperatures and times given, especially for preserves and cured meats. The allergen and food safety information does not replace the advice of a doctor or a food safety professional.</p>
<h2>Privacy</h2><p>This site uses no cookies, collects no statistics and asks for no data. The data needed for a purchase (name, email, payment) is handled by the sales platform, under its privacy policy.</p>""",
}


def leggi(p):
    return yaml.safe_load(p.read_text(encoding='utf-8').split('---\n', 2)[1])


def foto(src, dest, lato, q=80):
    with Image.open(src) as im:
        im = im.convert('RGB')
        im.thumbnail((lato, lato))
        im.save(dest, 'JPEG', quality=q, optimize=True, progressive=True)
    return dest.name


def pagine_pdf(pdf, numeri, cartella, prefisso):
    nomi = []
    with tempfile.TemporaryDirectory() as tmp:
        for n in numeri:
            subprocess.run(['pdftoppm', '-r', '110', '-jpeg', '-f', str(n), '-l', str(n), '-singlefile', str(pdf), f'{tmp}/p'], check=True)
            nomi.append(foto(f'{tmp}/p.jpg', cartella / f'{prefisso}-pagina-{n}.jpg', 900, 78))
    return nomi


def font(cartella):
    cartella.mkdir(exist_ok=True)
    for f in ('EBGaramond.ttf', 'EBGaramond-Italic.ttf', 'IMFeENsc28P.ttf'):
        dest = cartella / f.replace('.ttf', '.woff2')
        if not dest.exists():
            subprocess.run([sys.executable, '-m', 'fontTools.subset', str(R / 'impaginazione' / 'font' / f),
                            '--unicodes=U+0000-024F,U+2000-206F,U+20AC,U+2122', '--flavor=woff2',
                            f'--output-file={dest}'], check=True)
    for f in ('OFL-EBGaramond.txt', 'OFL-IMFell.txt'):
        shutil.copy(R / 'impaginazione' / 'font' / f, cartella / f)


def pagina(lingua, info, img, ricette):
    t = T[lingua]
    pre = '' if lingua == 'it' else '../'
    e = html.escape
    fatti = ''.join(f'<li>{e(f.format(**info))}</li>' for f in t['fatti'])
    anteprima = '' if LINK[lingua] else f'<div class="anteprima">{t["anteprima_txt"]}</div>'
    link = LINK[lingua] or '#prezzo'
    dentro = ''.join(f'<div class="card"><h3>{e(a)}</h3><p>{e(b)}</p></div>' for a, b in t['dentro'])
    sfoglia = ''.join(f'<img src="{pre}img/{n}" alt="" loading="lazy" width="900" height="1273">' for n in img['pagine'])
    piatti = ''.join(f'<img src="{pre}img/{n}" alt="" loading="lazy">' for n in img['piatti'])
    capitoli = ''.join(f'<details><summary>{e(cap)} <span>{len(rr)}</span></summary><ol start="{rr[0][0]}">'
                       + ''.join(f'<li>{e(tit)}</li>' for _, tit in rr) + '</ol></details>' for cap, rr in ricette)
    faq = ''.join(f'<details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in t['faq'])
    canon = f'<link rel="alternate" hreflang="it" href="{DOMINIO}/"><link rel="alternate" hreflang="en" href="{DOMINIO}/en/">' if DOMINIO else ''
    og = f'<meta property="og:image" content="{DOMINIO}/img/copertina-{lingua}.jpg">' if DOMINIO else ''
    return f'''<!DOCTYPE html>
<html lang="{lingua}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(t["titolo"])} — {e(t["sotto"])}</title><meta name="description" content="{e(t["meta"])}">
<meta property="og:title" content="{e(t["titolo"])}"><meta property="og:description" content="{e(t["meta"])}">{og}{canon}
<link rel="stylesheet" href="{pre}stile.css"></head>
<body>{anteprima}
<header class="barra"><span class="marchio">{EDITORE}</span><a class="lingua" href="{t["altra_url"]}">{t["altra"]}</a></header>
<main>
<section class="hero"><img class="copertina" src="{pre}img/{img["copertina"]}" alt="{e(t["titolo"])}" width="900" height="1273">
<div><h1>{e(t["titolo"])}</h1><p class="sotto">{e(t["sotto"])}</p><p class="lead">{e(t["lead"])}</p>
<ul class="fatti">{fatti}</ul><a class="bottone" href="{link}">{t["compra"]} · {PREZZO[lingua]}</a></div></section>
<section class="piatti">{piatti}</section>
<section><h2>{t["h_dentro"]}</h2><div class="cards">{dentro}</div></section>
<section><h2>{t["h_pagine"]}</h2><div class="sfoglia">{sfoglia}</div></section>
<section><h2>{t["h_ricette"]}</h2><div class="capitoli">{capitoli}</div></section>
<section><h2>{t["h_perchi"]}</h2><p class="testo">{e(t["perchi"])}</p></section>
<section id="prezzo" class="prezzo"><h2>{t["h_prezzo"]}</h2><p class="cifra">{PREZZO[lingua]}</p>
<a class="bottone" href="{link}">{t["compra"]}</a><p class="piccolo">{e(t["prezzo_note"])}</p></section>
<section><h2>{t["h_faq"]}</h2><div class="faq">{faq}</div></section>
</main>
<footer><p>© {info["anno"]} {EDITORE}</p><p><a href="{t["legali_url"]}">{t["legali"]}</a> · {t["nota_ia"]}</p></footer>
</body></html>'''


def condizioni(lingua, info):
    t = T[lingua]
    pre = '' if lingua == 'it' else '../'
    corpo = COND[lingua].format(venditore=html.escape(DATI_VENDITORE), titolo=t['titolo'], p=info['p'])
    return f'''<!DOCTYPE html>
<html lang="{lingua}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t["h_cond"]} — {html.escape(t["titolo"])}</title><meta name="robots" content="noindex"><link rel="stylesheet" href="{pre}stile.css"></head>
<body><header class="barra"><a class="marchio" href="./">{EDITORE}</a></header>
<main class="legale"><h1>{t["h_cond"]}</h1>{corpo}</main>
<footer><p>© {info["anno"]} {EDITORE}</p></footer></body></html>'''


def main():
    if OUT.exists():
        shutil.rmtree(OUT)  # cartella generata: si rifà ogni volta
    (OUT / 'img').mkdir(parents=True)
    (OUT / 'en').mkdir()
    font(OUT / 'font')
    shutil.copy(R / 'sito' / 'stile.css', OUT / 'stile.css')
    piatti = [foto(next((R / 'immagini').glob(f'{n:02d}-*')) / f'{n:02d}-principale.jpg', OUT / 'img' / f'piatto-{n:02d}.jpg', 700, 76)
              for n in (5, 29, 7, 41, 55, 60)]
    for lingua, t in T.items():
        pdf = R / 'output' / t['pdf']
        info = dict(n=60, p=len(PdfReader(pdf).pages), mb=round(pdf.stat().st_size / 1e6), anno=2026)
        cart = R / 'ricette' / lingua
        chiavi = ('numero', 'capitolo', 'titolo') if lingua == 'it' else ('number', 'chapter', 'title')
        ricette = []
        for p in sorted(cart.glob('[0-9][0-9]-*.md')):
            fm = leggi(p)
            if not ricette or ricette[-1][0] != fm[chiavi[1]]:
                ricette.append((fm[chiavi[1]], []))
            ricette[-1][1].append((fm[chiavi[0]], fm[chiavi[2]]))
        pag = pagine_pdf(pdf, [1, 3, 10, 11, 21], OUT / 'img', lingua)
        img = dict(copertina=pag[0], pagine=pag[1:], piatti=piatti)
        foto(OUT / 'img' / pag[0], OUT / 'img' / f'copertina-{lingua}.jpg', 1200)
        base = OUT if lingua == 'it' else OUT / 'en'
        (base / 'index.html').write_text(pagina(lingua, info, img, ricette), encoding='utf-8')
        (base / t['legali_url']).write_text(condizioni(lingua, info), encoding='utf-8')
        print(f'{lingua}: {info["p"]} pagine, {info["mb"]} MB, link di acquisto {"OK" if LINK[lingua] else "MANCANTE"}')
    peso = sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file())
    print(f'sito in {OUT.relative_to(R)}: {peso / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
