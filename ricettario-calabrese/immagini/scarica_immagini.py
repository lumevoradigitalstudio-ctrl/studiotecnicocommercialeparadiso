"""Scarica sul tuo computer le immagini generate con Higgsfield, nelle cartelle del progetto.

Uso (dalla cartella ricettario-calabrese):  python3 immagini/scarica_immagini.py
Serve Python 3. Se è installato Pillow (pip install pillow), le principali vengono anche portate
a 2000 px sul lato lungo, in JPEG qualità 85; i passaggi restano a 1024 px.
I file già presenti non vengono riscaricati.
"""
import csv, os, urllib.request

try:
    from PIL import Image
except ImportError:
    Image = None

def main():
    righe = list(csv.DictReader(open('immagini/registro.csv', encoding='utf-8')))
    fatti = errori = 0
    for r in righe:
        f, url = r['file'], r['url']
        if os.path.exists(f) or not url:
            continue
        os.makedirs(os.path.dirname(f), exist_ok=True)
        try:
            urllib.request.urlretrieve(url, f)
            if Image and f.endswith('-principale.jpg'):
                im = Image.open(f).convert('RGB')
                im.thumbnail((2000, 2000))
                im.save(f, 'JPEG', quality=85)
            fatti += 1
        except Exception as e:  # un link scaduto non deve fermare gli altri
            errori += 1
            print('ERRORE', f, e)
    print(f'scaricate {fatti}, errori {errori}, totale nel registro {len(righe)}')

if __name__ == '__main__':
    main()
