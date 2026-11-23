"""Controlla la struttura fissa delle ricette IT: campi YAML, sezioni, lunghezza dell'introduzione, file fonti."""
import glob, os, re, sys, yaml

CAMPI = ['numero', 'capitolo', 'titolo', 'dialetto', 'provincia', 'stagione', 'porzioni', 'preparazione',
         'cottura', 'totale', 'difficolta', 'allergeni', 'dop_igp', 'vino', 'fonti']
SEZIONI = ['## Ingredienti', '## Procedimento', '## Consigli', '## Errori da evitare', '## Varianti locali',
           '## Conservazione', '## Fuori dalla Calabria', '## Allergeni', '## DOP e IGP', '## Vino']

def controlla(f):
    _, y, corpo = open(f, encoding='utf-8').read().split('---', 2)
    m = yaml.safe_load(y)
    errori = [f'campo {k}' for k in CAMPI if k not in m] + [f'sezione {s}' for s in SEZIONI if s not in corpo]
    paragrafi = [p for p in corpo.split('\n\n') if p.strip() and not p.lstrip().startswith(('#', '*', '-', '|'))]
    parole = len(paragrafi[0].split()) if paragrafi else 0
    if not 80 <= parole <= 120:
        errori.append(f'introduzione di {parole} parole')
    if not os.path.exists(m.get('fonti', '')):
        errori.append('file fonti mancante')
    passi = len(re.findall(r'^\d+\. ', corpo, re.M))
    return errori, parole, passi, corpo.count('DA VERIFICARE')

if __name__ == '__main__':
    ko = 0
    for f in sorted(glob.glob('ricette/it/[0-9]*.md')):
        errori, parole, passi, dv = controlla(f)
        ko += bool(errori)
        print(f"{'OK' if not errori else 'KO'} {f}: intro {parole}, passaggi {passi}, DV {dv} {errori or ''}")
    sys.exit(1 if ko else 0)
