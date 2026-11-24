#!/usr/bin/env python3
"""Materiale per le piattaforme di vendita: EPUB IT/EN, copertina per gli store, immagini promozionali.

Uso (dalla cartella ricettario-calabrese), dopo impaginazione/costruisci.py e sito/costruisci_sito.py:
    python3 vendita/costruisci_vendita.py
Esce in output/ (EPUB) e vendita/immagini/ (copertine e immagini per Etsy e social).
"""
import pathlib, re, subprocess, tempfile

import yaml
from PIL import Image

R = pathlib.Path(__file__).resolve().parents[1]
V = R / 'vendita'
IMG = V / 'immagini'
EDITORE = 'A Putiga – Sapori di Calabria'
LINGUE = {
    'it': dict(pdf='Ricettario-Calabrese-A-Putiga-IT.pdf', epub='Ricettario-Calabrese-A-Putiga-IT.epub',
               titolo='Il libro di cucina della Putìga', sotto='60 ricette calabresi di casa, dai salumi ai dolci delle feste',
               cap='capitolo', num='numero', didascalia='Immagine illustrativa generata con IA'),
    'en': dict(pdf='Calabrian-Cookbook-A-Putiga-EN.pdf', epub='Calabrian-Cookbook-A-Putiga-EN.epub',
               titolo='The Putìga Cookbook', sotto='60 Calabrian home recipes, from cured meats to festive sweets',
               cap='chapter', num='number', didascalia='Illustrative image generated with AI'),
}
CSS = """body { font-family: serif; line-height: 1.45; }
h1, h2, h3 { color: #A3281C; font-weight: normal; }
h1 { page-break-before: always; } h2 { color: #4D4C22; }
figure { margin: 1em 0; } figcaption { font-size: .75em; font-style: italic; color: #4D4C22; text-align: right; }
img { max-width: 100%; }"""


def leggi(p):
    _, fm, corpo = p.read_text(encoding='utf-8').split('---\n', 2)
    return yaml.safe_load(fm), corpo


def copertina_store(lingua, c):
    """Copertina 1600×2560 (rapporto 1,6 chiesto da Amazon KDP): la pagina 1 del PDF alta 2560 px, tagliata al centro."""
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-scale-to-y', '2560', '-scale-to-x', '-1', '-jpeg', '-singlefile',
                        str(R / 'output' / c['pdf']), f'{tmp}/c'], check=True)
        with Image.open(f'{tmp}/c.jpg') as im:
            w, h = im.size
            sx = (w - 1600) // 2
            dest = IMG / f'copertina-store-{lingua}.jpg'
            im.convert('RGB').crop((sx, 0, sx + 1600, 2560)).save(dest, 'JPEG', quality=88)
    return dest


def epub(lingua, c, cover):
    """EPUB con testo completo e solo l'immagine principale di ogni ricetta (leggero: Amazon fa pagare i MB consegnati)."""
    cart = R / 'ricette' / lingua
    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)
        parti = [(R / 'impaginazione' / 'testi' / lingua / 'introduzione.md').read_text(encoding='utf-8')]
        aperture = {fm[c['cap']]: corpo for fm, corpo in (leggi(p) for p in cart.glob('c*-*.md'))}
        cap_prec = None
        for p in sorted(cart.glob('[0-9][0-9]-*.md')):
            fm, corpo = leggi(p)
            if fm[c['cap']] != cap_prec:
                cap_prec = fm[c['cap']]
                ap = aperture.get(cap_prec, '')
                parti.append(f'# {cap_prec}\n\n' + re.sub(r'(?m)^# .*\n', '', ap, count=1).replace('\n## ', '\n### '))
            n = fm[c['num']]
            src = next((R / 'immagini').glob(f'{n:02d}-*')) / f'{n:02d}-principale.jpg'
            with Image.open(src) as im:
                im = im.convert('RGB'); im.thumbnail((800, 800)); im.save(tmp / src.name, 'JPEG', quality=68, optimize=True)
            corpo = corpo.replace('\n## ', '\n### ')
            corpo = re.sub(r'(?m)^# (.*)$', lambda m: f'## {m.group(1)}\n\n![{c["didascalia"]}]({src.name})', corpo, count=1)
            parti.append(corpo)
        colophon = (R / 'impaginazione' / 'testi' / lingua / 'colophon.md').read_text(encoding='utf-8').format(
            titolo=c['titolo'], sottotitolo=c['sotto'], anno=2026, editore=EDITORE, autore='')
        parti.append('# Colophon\n\n' + colophon)
        (tmp / 'libro.md').write_text('\n\n'.join(parti), encoding='utf-8')
        (tmp / 'stile.css').write_text(CSS, encoding='utf-8')
        dest = R / 'output' / c['epub']
        subprocess.run(['pandoc', 'libro.md', '-o', str(dest), '--toc', '--toc-depth=2', '--split-level=2',
                        f'--epub-cover-image={cover}', '--css=stile.css', '--resource-path=.',
                        '-M', f'title={c["titolo"]}', '-M', f'subtitle={c["sotto"]}', '-M', f'author={EDITORE}',
                        '-M', f'lang={lingua}', '-M', f'publisher={EDITORE}', '-M', 'date=2026'], check=True, cwd=tmp)
    return dest


def promo(lingua, c):
    """Immagini quadrate 2000×2000 per Etsy e social, disegnate in HTML con le risorse del sito e fotografate con Playwright."""
    sito = (R / 'sito' / 'pubblico').as_uri()
    pag = lambda n: f'{sito}/img/{lingua}-pagina-{n}.jpg'
    testi = {'it': ('60 ricette calabresi di casa', 'PDF a colori · {p} pagine · EPUB', 'Dai salumi di casa ai dolci delle feste'),
             'en': ('60 Calabrian home recipes', 'Full-colour PDF · {p} pages · EPUB', 'From home-cured meats to festive sweets')}[lingua]
    from pypdf import PdfReader
    p = len(PdfReader(R / 'output' / c['pdf']).pages)
    base = f"""<style>@font-face{{font-family:F;src:url({sito}/font/IMFeENsc28P.woff2)}}@font-face{{font-family:G;src:url({sito}/font/EBGaramond.woff2)}}
    body{{margin:0;width:2000px;height:2000px;overflow:hidden;font-family:G,serif;color:#2E2A1A;
    background:radial-gradient(circle at 50% 35%,#F6EAD0,#EFDCB6 60%,#C69C6D)}}h1{{font-family:F;font-weight:normal;color:#A3281C;margin:0}}
    .p{{position:absolute;box-shadow:0 40px 80px rgba(46,42,26,.45)}}</style>"""
    scene = {
        'libro-3d': f"""{base}<div style="position:absolute;inset:0;perspective:3000px;display:flex;align-items:center;justify-content:center">
          <img src="{sito}/img/{lingua}-pagina-1.jpg" style="width:1050px;transform:rotateY(-24deg) rotateX(4deg);box-shadow:-30px 50px 90px rgba(46,42,26,.55);border-radius:6px 14px 14px 6px"></div>
          <div style="position:absolute;bottom:90px;width:100%;text-align:center;font-size:64px;color:#4D4C22">{testi[1].format(p=p)}</div>""",
        'doppia-pagina': f"""{base}<h1 style="position:absolute;top:110px;width:100%;text-align:center;font-size:110px">{testi[0]}</h1>
          <img class="p" src="{pag(10)}" style="left:180px;top:420px;width:820px"><img class="p" src="{pag(11)}" style="left:1000px;top:420px;width:820px">""",
        'anteprima-ricetta': f"""{base}<img class="p" src="{pag(70)}" style="left:425px;top:90px;width:1150px;transform:rotate(-2deg)">
          <div style="position:absolute;bottom:70px;width:100%;text-align:center;font-size:70px;color:#4D4C22;font-style:italic">{testi[2]}</div>""",
        'capitoli': f"""{base}<h1 style="position:absolute;top:90px;width:100%;text-align:center;font-size:100px">{c["titolo"]}</h1>
          <img class="p" src="{pag(21)}" style="left:140px;top:380px;width:560px;transform:rotate(-6deg)">
          <img class="p" src="{pag(22)}" style="left:720px;top:330px;width:560px;z-index:2">
          <img class="p" src="{pag(71)}" style="left:1300px;top:380px;width:560px;transform:rotate(6deg)">""",
    }
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        lavori = []
        for nome, html in scene.items():
            f = pathlib.Path(tmp) / f'{nome}.html'
            f.write_text(f'<!DOCTYPE html><html><body>{html}</body></html>', encoding='utf-8')
            dest = IMG / f'{nome}-{lingua}.jpg'
            lavori.append([f.as_uri(), str(dest)])
            out.append(dest)
        # Playwright è installato per Node, non per Python
        js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();"
              "const p=await b.newPage({viewport:{width:2000,height:2000}});"
              "for(const [u,d] of JSON.parse(process.argv[1])){await p.goto(u);await p.waitForLoadState('networkidle');"
              "await p.screenshot({path:d,type:'jpeg',quality:88});}await b.close();})();")
        import json
        subprocess.run(['node', '-e', js, json.dumps(lavori)], check=True)
    return out


if __name__ == '__main__':
    IMG.mkdir(parents=True, exist_ok=True)
    for lingua, c in LINGUE.items():
        cov = copertina_store(lingua, c)
        e = epub(lingua, c, cov)
        imgs = promo(lingua, c)
        print(f'{lingua}: {e.name} {e.stat().st_size / 1e6:.1f} MB, copertina {cov.name}, immagini {len(imgs)}')
        assert e.stat().st_size < 7e6, 'EPUB troppo pesante per la royalty 70% di Amazon'
