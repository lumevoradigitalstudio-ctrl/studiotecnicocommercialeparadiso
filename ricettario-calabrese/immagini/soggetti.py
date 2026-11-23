"""Soggetti delle immagini (inglese, per Higgsfield). Lo stile comune è in STILE_*; vedi stile.md.
Uso: python3 immagini/soggetti.py prossime [8]       -> JSON delle prossime richieste non ancora inviate
     python3 immagini/soggetti.py registra '<json>'   -> salva in jobs.json le risposte di generate_image_batch
"""
import glob, json, os, sys

STILE_PRINCIPALE = ("Natural side light from a window, rustic dark wooden table or raw linen cloth, handmade glazed "
                    "ceramics, warm earthy tones, olive green and chilli red accents, Southern Italian home kitchen, "
                    "documentary food photography, shallow depth of field, no people, no text, no logos, no brand labels.")
STILE_PASSO = ("Hands only, no rings, no faces. Natural side light, rustic wooden table, warm earthy tones, Southern "
               "Italian home kitchen, documentary step-by-step cooking shot, no text, no logos.")

# numero: (piatto finito, [passo 1, passo 2, passo 3])
S = {
 1: ("Coils of fresh Calabrian pork sausage tied in a chain, next to slices of dry cured sausage on a wooden board with bread and dried red chillies",
     ["Coarsely ground pork mixed with red chilli powder and fennel seeds in a large bowl", "Natural casing being filled with pork mixture from a sausage stuffer nozzle", "Sausage twisted into links and tied with string on a floured board"]),
 2: ("A Calabrian soppressata cut in thick slices showing coarse red meat and white fat cubes, on a wooden board with black peppercorns and bread",
     ["Hand-diced pork back fat cubes and coarse ground lean pork on a board", "Stuffed soppressate pressed between two wooden boards with a weight on top", "Soppressate tied with string hanging to cure in a cool cellar"]),
 3: ("Thin slices of Calabrian capocollo, pink meat with white marbling, fanned on a ceramic plate, the whole cured piece wrapped in pepper beside it",
     ["Whole pork neck being rubbed with salt and pepper in a bowl", "Salted pork neck brushed with red wine vinegar and coated in coarse black pepper", "Capocollo tied tightly in a spiral with butcher's string"]),
 4: ("Flat cured pancetta coated in red chilli and rolled pancetta sliced to show a tight spiral, on a wooden board",
     ["Rectangle of fresh pork belly being rubbed with salt", "Pork belly coated with red chilli powder on the meat side", "Pork belly rolled up tightly and tied with string"]),
 5: ("Soft dark red Calabrian 'nduja spread on a slice of toasted rustic bread, the cut 'nduja beside it on a wooden board with dried chillies",
     ["Very finely ground red pork and chilli paste in a bowl", "Red 'nduja paste being packed into a natural casing", "Small 'nduja sausages tied with string hanging to dry"]),
 6: ("Golden pork cracklings in a terracotta bowl next to a jar of snow-white lard and slices of bread",
     ["Cubes of pork fat in a heavy pot starting to melt", "Golden cracklings lifted out of clear liquid fat with a slotted spoon", "Liquid lard being strained through cheesecloth into a glass jar"]),
 7: ("Glass bottles of home-made red tomato sauce with a basil leaf inside, next to a crate of ripe plum tomatoes",
     ["Halved plum tomatoes softening in a large pot", "Cooked tomatoes being passed through a hand-cranked food mill", "Bottles of tomato sauce standing in a tall pot of water"]),
 8: ("A glass jar of sun-dried tomatoes in olive oil with oregano and chilli flakes, a few dried tomatoes on a linen cloth",
     ["Halved small tomatoes sprinkled with salt on a wooden drying rack in the sun", "Wrinkled dried tomatoes being dipped into boiling vinegar water", "Dried tomatoes layered in a jar and covered with olive oil"]),
 9: ("A jar of aubergine strips in olive oil with garlic slices, chilli and oregano, a fork lifting some onto bread",
     ["Aubergine strips layered with coarse salt in a colander under a weight", "Salted aubergine strips being squeezed by hand", "Aubergine strips packed into a jar and covered with oil"]),
 10: ("Small round red chillies stuffed with tuna and capers in a jar of olive oil, a few on a ceramic plate",
     ["Round red chillies being hollowed out with a small spoon, gloved hands", "Hollowed chillies drying upside down on a tea towel", "Chillies being filled with a tuna and caper paste"]),
 11: ("Strings of dried red Calabrian chillies hanging, a jar of chilli powder and a bottle of chilli oil on a wooden shelf",
      ["Gloved hands threading fresh red chillies onto a string with a needle", "Halved chillies drying on a baking tray", "Dried chillies being ground in a stone mortar"]),
 12: ("Crushed green olives dressed with garlic, wild fennel and chilli in a terracotta bowl",
      ["Green olives being cracked one by one with a smooth stone on a board", "Crushed olives soaking in a bowl of water", "Drained olives being mixed with garlic, fennel and chilli"]),
 13: ("Wrinkled oven-dried black olives in a ceramic bowl dressed with olive oil and orange zest",
      ["Ripe black olives mixed with coarse salt in a wicker basket", "Salted black olives spread on a baking tray", "Baked wrinkled olives being dressed with oil and chilli"]),
 14: ("A jar of small mushrooms in olive oil with bay leaves and peppercorns, a few mushrooms on a board",
      ["Mushrooms being cleaned with a small brush", "Mushrooms boiling in vinegar and water in a steel pot", "Mushrooms layered in a jar with bay leaves and covered with oil"]),
 15: ("A small jar of red anchovy and chilli cream spread on toasted bread",
      ["Salted anchovy fillets being cleaned and rinsed", "Anchovies pounded with red chilli powder in a mortar", "Red cream being packed into a small jar and covered with oil"]),
 16: ("A small jar of dark glossy fig syrup poured over fresh ricotta, fresh figs beside it",
      ["Quartered ripe figs simmering in a large pot of water", "Cooked figs being squeezed in a cotton cloth over a bowl", "Dark fig syrup reducing in a wide pan"]),
 17: ("Golden fried aubergine fritters on a ceramic plate with basil and a small bowl of tomato sauce",
      ["Boiled aubergine cubes being squeezed dry in a tea towel", "Aubergine, bread, egg and pecorino being mixed in a bowl", "Small fritters frying in olive oil in a deep pan"]),
 18: ("Bread balls simmering in tomato sauce in a terracotta pan with basil",
      ["Stale bread being soaked and squeezed by hand", "Bread mixture with eggs and pecorino being shaped into balls", "Golden bread balls being lowered into tomato sauce"]),
 19: ("Fresh home-made ricotta in a basket on a plate, drizzled with dark fig honey",
      ["Milk heating in a steel pot with a thermometer", "Lemon juice being poured into hot milk, white curds forming", "Curds draining in a cheesecloth-lined sieve"]),
 20: ("A thick frittata full of soft red onions cut into wedges on a ceramic plate",
      ["Thinly sliced red Tropea onions softening in olive oil in a pan", "Beaten eggs with pecorino poured over the onions", "Frittata being flipped onto a plate"]),
 21: ("Golden courgette flower fritters on a plate with a few fresh flowers beside them",
      ["Courgette flowers being opened and the pistils removed", "Torn flowers stirred into a thick batter with pecorino", "Spoonfuls of batter frying in hot oil"]),
 22: ("Fried sweet peppers with soft scrambled eggs in a cast-iron pan, bread beside it",
      ["Strips of red and green peppers frying in olive oil", "Beaten eggs poured over the fried peppers", "Eggs gently stirred with the peppers using a spatula"]),
 23: ("Two round loaves of golden durum wheat bread, one cut to show the yellow crumb",
      ["Semolina dough being kneaded by hand on a wooden board", "Risen dough being shaped into a tight round loaf", "Loaf being slashed with a blade before baking"]),
 24: ("Low ring-shaped Calabrian pitta breads on a board, one cut into quarters and opened like a book",
      ["Disc of dough with a hole being stretched with the fingers", "Ring-shaped pitte rising on a tray", "Baked pitta being cut into quarters"]),
 25: ("A round loaf of potato bread with a cross on top and a soft slice cut",
      ["Boiled potatoes being mashed with a ricer", "Potato dough being kneaded with oiled hands", "Loaf with a cross cut ready for the oven"]),
 26: ("Golden fried dough rings piled on a ceramic plate, one broken open showing a piece of anchovy",
      ["Very soft potato dough rising in a bowl", "Oiled hands stretching dough into a ring", "Dough rings frying in deep oil"]),
 27: ("Irregular puffed golden fried dough balls on a plate, one open showing an anchovy fillet",
      ["Very soft batter-like dough slapped in a bowl", "Wet hands wrapping dough around an anchovy fillet", "Dough balls frying in hot oil"]),
 28: ("Twice-baked bread rings topped with chopped tomato, oregano and olive oil on a plate",
      ["Bread rings being cut in half horizontally with a string", "Half rings dried in the oven on a tray", "Dry bread ring briefly dipped in cold water"]),
 29: ("A shallow handmade glazed ceramic bowl of fileja, hand-rolled twisted Calabrian durum wheat pasta tubes, coated in a deep red tomato and 'nduja sauce with glossy orange oil, topped with grated pecorino and a torn basil leaf. Around it: a small piece of red 'nduja on a wooden board, a halved Tropea red onion, a wedge of pecorino, a thin metal pasta rod with semolina dust",
      ["Two hands rolling a pencil-thick rope of yellow durum wheat semolina dough around a thin metal rod on a floured wooden board, a few finished twisted pasta tubes on a tray",
       "Red 'nduja melting into softened onion and olive oil in a pan", "Fresh fileja being tossed in the red sauce"]),
 30: ("Hand-rolled maccheroni with dark pork ragù and grated cheese, a dish of braised meat behind",
      ["Pork pieces and sausages browning in a large pan", "Dough rolled around a thin metal rod to make maccheroni", "Ragù simmering slowly in a heavy pot"]),
 31: ("Dark wholemeal linguine with anchovies, chilli and crunchy toasted breadcrumbs on top",
      ["Breadcrumbs toasting in olive oil in a small pan", "Anchovies melting into garlic oil", "Pasta tossed in the pan and sprinkled with breadcrumbs"]),
 32: ("Wide hand-cut pasta strips with chickpeas, garlic and chilli in a ceramic bowl",
      ["Soaked chickpeas simmering with bay leaves", "Thin sheet of semolina dough rolled and cut into wide strips", "Pasta strips stirred into the chickpeas"]),
 33: ("A thick soup of mixed beans, cabbage, mushrooms and small pasta in an earthenware bowl with pecorino",
      ["A bowl of mixed dried legumes soaking in water", "Onion, celery, carrot and mushrooms frying for the soup base", "Small pasta cooking in the thick bean soup"]),
 34: ("A baking dish of festive layered baked pasta with a golden crust, a portion cut to show meatballs, egg and cheese",
      ["Tiny meatballs frying in a pan", "Layers of pasta, meatballs, egg slices, salami and cheese in a baking dish", "Baked pasta coming out of the oven, bubbling"]),
 35: ("Thick pasta and bean soup with pork rind strips in an earthenware bowl",
      ["Pork rind being scraped with a knife", "Beans and rind strips simmering in a pot", "Short pasta added to the creamy bean soup"]),
 36: ("A deep baking dish of baked pasta and potato chunks with melted cheese and a crisp golden top",
      ["Raw pasta, potato chunks, cherry tomatoes and onion mixed in a baking dish", "Hot water poured into the dish from the side", "Cheese and breadcrumbs scattered on top before the second bake"]),
 37: ("Spaghetti with sun-dried tomatoes, black olives and toasted breadcrumbs in a ceramic plate",
      ["Sun-dried tomatoes and olives being cut on a board", "Tomatoes and olives warming in garlic and chilli oil", "Pasta tossed and topped with crunchy breadcrumbs"]),
 38: ("Red onion and potato soup poured over toasted bread in a bowl, grated cheese on top",
      ["Thinly sliced red onions stewing slowly in a pot", "Diced potatoes added to the soft onions", "Boiling soup poured over toasted bread in a bowl"]),
 39: ("A spicy red tripe stew stuffed into a quartered ring-shaped bread opened like a book",
      ["Strips of cleaned tripe and offal on a board", "Tripe simmering in a thick red tomato sauce with bay leaves", "Hot stew spooned into an opened quarter of ring bread"]),
 40: ("Braised goat in a dark tomato and wine sauce in a terracotta pot",
      ["Pieces of goat on the bone browning in olive oil", "Red wine vinegar splashed over the browning meat", "Goat simmering in a thick tomato sauce"]),
 41: ("Glossy slow-cooked pork pieces, ribs and rind, on a board with bread",
      ["Mixed pork cuts in a large heavy pot with melted lard", "Pork pieces simmering in their own fat, stirred with a wooden spoon", "Cooked pork lifted out with a slotted spoon"]),
 42: ("A baking tray of browned sausage pieces, golden potatoes and roasted peppers",
      ["Potato wedges, pepper strips and onion tossed with oil in a tray", "Sausage pieces laid on the vegetables", "Tray coming out of the oven, golden and sizzling"]),
 43: ("Long golden fried meatballs on a plate, some in tomato sauce",
      ["Minced meat, soaked bread, eggs and cheese mixed in a bowl", "Mixture shaped into long flat rolls with wet hands", "Long meatballs frying in a deep pan"]),
 44: ("Braised lamb with green peas in a wide pan, Easter table",
      ["Lamb pieces browning in olive oil", "White wine poured over the lamb and onions", "Fresh green peas added to the lamb"]),
 45: ("A thick swordfish steak with cherry tomatoes, olives, capers and oregano on a plate",
      ["Cherry tomatoes, olives, capers and red onion cooking in a pan", "Swordfish steaks searing in the middle of the pan", "Sauce spooned over the fish and oregano sprinkled"]),
 46: ("Stockfish stew with potatoes, olives and dried peppers in an earthenware pot",
      ["Soaked stockfish being cut into pieces", "Potato wedges cooking in tomato and onion in an earthenware pot", "Stockfish pieces laid on top with olives and dried peppers"]),
 47: ("Seared tuna steaks covered with glossy sweet and sour red onions and mint on a plate",
      ["Sliced red onions stewing in oil", "Vinegar and sugar added to the soft onions", "Floured tuna steaks searing in a pan"]),
 48: ("Baked layered fresh anchovies with golden oregano breadcrumbs in a baking dish",
      ["Fresh anchovies being opened flat and the backbone removed", "Opened anchovies laid in a dish and sprinkled with breadcrumbs and oregano", "Golden baked anchovies being served"]),
 49: ("Salt cod with potatoes, black olives and tomato in a wide pan, parsley on top",
      ["Salt cod soaking in a bowl of cold water", "Potato slices cooking in tomato and onion", "Pieces of cod laid on the potatoes with black olives"]),
 50: ("Fried potato wedges and sweet peppers in a cast-iron pan with olive oil",
      ["Potato wedges frying in olive oil in a pan", "Pepper strips added to golden potatoes", "Salt sprinkled over the finished peppers and potatoes"]),
 51: ("Golden crisp sticky pan-fried potato slices stuck together like a cake in an iron pan",
      ["Potatoes being sliced thinly", "Potato slices spread in an oiled pan with a lid", "Potatoes turned over in blocks with a spatula, golden underneath"]),
 52: ("A summer vegetable stew of aubergine, peppers, potatoes, courgettes and tomato in a pan with basil",
      ["Diced summer vegetables on a wooden board", "Potatoes and peppers cooking in olive oil", "Tomatoes and courgettes added to the stew"]),
 53: ("A slice of aubergine parmigiana showing layers with hard-boiled egg, salami and melted cheese",
      ["Aubergine slices dusted with flour and fried", "Layers of fried aubergine, sauce, egg slices and cheese in a dish", "Baked parmigiana with a golden top"]),
 54: ("Red and yellow peppers stuffed with breadcrumbs and cheese, baked, in a dish",
      ["Peppers being hollowed out", "Breadcrumb, cheese, caper and basil filling mixed in a bowl", "Peppers filled and closed with their tops in a baking dish"]),
 55: ("A round Christmas cake of pastry roses filled with walnuts and raisins, glazed with honey",
      ["Thin strips of pastry spread with walnut, raisin and honey filling", "A filled strip being rolled into a little rose", "Pastry roses packed tightly in a round tin"]),
 56: ("Half-moon pastries filled with dried figs and nuts, some with white icing and coloured sprinkles",
      ["Dried figs, almonds and walnuts being chopped", "Filling placed on rounds of pastry", "Pastries closed into half-moons and pressed with a fork"]),
 57: ("Easter sweet bread rings with whole eggs in their shells held by crossed dough strips",
      ["Soft sweet dough being kneaded", "Rope of dough closed into a ring", "Whole eggs pressed into the dough and held with crossed strips"]),
 58: ("Hard golden honey biscuits shaped like fish and hearts, decorated with incised lines",
      ["Warm honey being poured over flour in a bowl", "Shapes cut from rolled honey dough with a knife", "Patterns scored on the biscuits with a knife tip"]),
 59: ("Small ridged fried dough gnocchi glossy with dark fig honey on a Christmas plate",
      ["Dough pieces rolled on a ridged gnocchi board", "Ridged dough pieces frying in oil", "Fried gnocchi tossed in warm dark honey in a pan"]),
 60: ("Diamonds of golden sesame and honey brittle on a plate with orange zest",
      ["Sesame seeds toasting in a dry pan", "Honey and sesame mixture stirred in a pan", "Hot brittle rolled flat between baking paper and cut into diamonds"]),
}
assert sorted(S) == list(range(1, 61)) and all(len(p) == 3 for _, p in S.values())

GIA_FATTE = {(29, 0), (29, 1)}  # prove di stile approvate (registro.csv)

def cartella(n):
    f = glob.glob(f'ricette/it/{n:02d}-*.md')[0]
    return os.path.basename(f)[:-3]

def richieste():
    """Tutte le immagini da generare: (indice, file, prompt, params)."""
    out = []
    for n in range(1, 61):
        principale, passi = S[n]
        voci = [(0, 'principale', principale)] + [(i, f'passo-{i}', p) for i, p in enumerate(passi, 1)]
        for i, nome, sogg in voci:
            if (n, i) in GIA_FATTE:
                continue
            if i == 0:
                params = {'model': 'gpt_image_2_6', 'aspect_ratio': '4:3', 'resolution': '2k', 'quality': 'high',
                          'output_format': 'jpeg', 'prompt': f'{sogg}. {STILE_PRINCIPALE}'}
            else:
                params = {'model': 'gpt_image_2_6', 'aspect_ratio': '1:1', 'output_format': 'jpeg',
                          'prompt': f'{sogg}. {STILE_PASSO}'}
            out.append((n * 10 + i, f'immagini/{cartella(n)}/{n:02d}-{nome}.jpg', params))
    return out

JOBS = 'immagini/jobs.json'
BASE_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_3MLJuuEvIHyhbj4yaUtRX59OLpu/'

def jobs():
    return json.load(open(JOBS)) if os.path.exists(JOBS) else {}

if __name__ == '__main__':
    fatti = jobs()
    if sys.argv[1] == 'prossime':
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 8
        da_fare = [(i, p) for i, _, p in richieste() if str(i) not in fatti]
        print(json.dumps([{'index': i, 'params': p} for i, p in da_fare[:n]], ensure_ascii=False))
        print(f'# da inviare: {len(da_fare)}', file=sys.stderr)
    elif sys.argv[1] in ('job', 'ora'):
        # job: "13=<uuid>,20=<uuid>"  ·  ora: "13=20261123_193101,..." (data e ora del link Higgsfield)
        for coppia in sys.argv[2].split(','):
            i, v = coppia.split('=')
            voce = fatti.setdefault(i, {})
            if sys.argv[1] == 'job':
                voce['job'] = v
            else:
                voce['url'] = f"{BASE_URL}hf_{v}_{voce['job']}.jpeg"
        json.dump(fatti, open(JOBS, 'w'), indent=0, sort_keys=True)
        print(f"job: {len(fatti)}, con link: {sum('url' in v for v in fatti.values())}")
    elif sys.argv[1] == 'registra':
        for j in json.loads(sys.argv[2]):  # accetta le risposte di generate_image_batch e di jobs_wait
            if j.get('job_id'):
                voce = fatti.get(str(j['index'])) or {}
                voce = voce if isinstance(voce, dict) else {'job': voce}
                voce['job'] = j['job_id']
                if j.get('result_url'):
                    voce['url'] = j['result_url']
                fatti[str(j['index'])] = voce
        json.dump(fatti, open(JOBS, 'w'), indent=0, sort_keys=True)
        print(f'registrati: {len(fatti)}')
