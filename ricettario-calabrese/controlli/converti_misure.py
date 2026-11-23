"""Edizione EN: aggiunge tra parentesi le misure US dopo quelle metriche, oppure le ricontrolla.

Uso:  python3 controlli/converti_misure.py ricette/en/*.md          (aggiunge)
      python3 controlli/converti_misure.py --check ricette/en/*.md  (verifica, esce con 1 se trova errori)
Una misura già seguita da " (" o scritta dentro una parentesi non viene toccata.
"""
import re, sys

NUM = r'\d+(?:\.\d+)?'
PAT = re.compile(rf'(?<![\w(.])({NUM})(?:[-–]({NUM}))? ?(kg|g|ml|l|°C|cm|mm|m)\b(?! \()')
FRAZ = {0: '', 0.125: '⅛', 0.25: '¼', 0.375: '⅜', 0.5: '½', 0.625: '⅝', 0.75: '¾', 0.875: '⅞'}

def fraz(x, passo):
    x = round(x / passo) * passo
    intero, resto = int(x), round(x - int(x), 3)
    return (str(intero) if intero else '') + FRAZ[resto] if (intero or resto) else '0'

def peso(g):
    if g >= 454: return f'{g / 453.6:.1f}'.rstrip('0').rstrip('.'), 'lb'
    oz = g / 28.35
    if oz >= 10: return str(round(oz)), 'oz'
    if oz >= 1: return fraz(oz, 0.5), 'oz'
    return f'{oz:.1f}', 'oz'

def volume(ml):
    if ml < 15: return fraz(ml / 4.93, 0.25), 'tsp'
    if ml < 60: return fraz(ml / 14.79, 0.5), 'tbsp'
    if ml >= 1900: return fraz(ml / 946.4, 0.25), 'quarts'
    v = fraz(ml / 236.6, 0.25)
    return v, 'cup' if v in ('¼', '½', '¾', '1') else 'cups'

def temp(c): return str(round((c * 9 / 5 + 32) / 5) * 5 if c >= 100 else round(c * 9 / 5 + 32)), '°F'

def lung(cm):
    inch = cm / 2.54
    if inch < 1: return fraz(inch, 0.125), 'in'
    if inch < 10: return fraz(inch, 0.25), 'in'
    return str(round(inch)), 'in'

CONV = {'g': peso, 'kg': lambda v: peso(v * 1000), 'ml': volume, 'l': lambda v: volume(v * 1000),
        '°C': temp, 'cm': lung, 'mm': lambda v: lung(v / 10), 'm': lambda v: (str(round(v * 3.281)), 'ft')}

def converti(a, b, unita):
    if unita == 'g' and float(b or a) < 5: return None  # sotto i 5 g le once non dicono nulla: resta solo il metrico
    va, ua = CONV[unita](float(a))
    if b is None: return f'{va} {ua}'
    vb, ub = CONV[unita](float(b))
    if (va, ua) == (vb, ub): return f'{va} {ua}'  # i due estremi arrotondati coincidono
    return f'{va}-{vb} {ub}' if ua == ub else f'{va} {ua}-{vb} {ub}'

def annota(testo):
    def sost(m):
        c = converti(*m.groups())
        return f'{m.group(0)} ({c})' if c else m.group(0)
    return PAT.sub(sost, testo)

VERIFICA = re.compile(rf'(?<![\w(.])({NUM})(?:[-–]({NUM}))? ?(kg|g|ml|l|°C|cm|mm|m)\b \(([^)]*)\)')

def verifica(testo):
    errori = []
    for m in VERIFICA.finditer(testo):
        atteso = converti(m.group(1), m.group(2), m.group(3))
        if atteso and m.group(4)[:1] in '0123456789⅛¼⅜½⅝¾⅞' and m.group(4) != atteso:  # salta parentesi che non sono conversioni
            errori.append(f'{m.group(0)} -> atteso ({atteso})')
    return errori

# self-check
assert converti('500', None, 'g') == '1.1 lb'
assert converti('100', None, 'g') == '3½ oz'
assert converti('180', None, '°C') == '355 °F'
assert converti('12', '15', '°C') == '54-59 °F'
assert converti('250', None, 'ml') == '1 cup'
assert converti('500', None, 'ml') == '2 cups'
assert verifica('Use 400 g (14 oz) and 100 g (5 oz).') == ['100 g (5 oz) -> atteso (3½ oz)']
assert converti('2', None, 'cm') == '¾ in'
assert converti('3', '4', 'mm') == '⅛ in'
assert annota('Add 30 ml (2 tbsp) oil and 400 g flour.') == 'Add 30 ml (2 tbsp) oil and 400 g (14 oz) flour.'
assert annota('80 mg per kg') == '80 mg per kg'
assert annota('0.5 g culture, 1.3 g per kg') == '0.5 g culture, 1.3 g per kg'

if __name__ == '__main__':
    check = '--check' in sys.argv
    ko = 0
    for f in [a for a in sys.argv[1:] if a != '--check']:
        t = open(f, encoding='utf-8').read()
        if check:
            for e in verifica(t):
                ko += 1; print(f'{f}: {e}')
        else:
            open(f, 'w', encoding='utf-8').write(annota(t))
    if check: print(f'errori di conversione: {ko}')
    sys.exit(1 if ko else 0)
