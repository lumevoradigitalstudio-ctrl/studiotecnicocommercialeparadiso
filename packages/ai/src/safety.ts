export type RiskCategory = "eating_disorder" | "extreme_restriction" | "minor" | "pregnancy" | "medical" | "severe_allergy";
export interface RiskResult { risk: RiskCategory | null; response?: string }

const RULES: { cat: RiskCategory; re: RegExp; response: string }[] = [
  { cat: "eating_disorder", re: /\b(anoressi\w*|bulimi\w*|binge|abbuffat\w*|vomit\w*\s+dopo|mi\s+faccio\s+vomitare|purg\w+)\b/i,
    response: "Mi dispiace che tu stia vivendo un momento difficile. Su questo tema non posso darti indicazioni alimentari: è importante parlarne con un medico o un professionista dei disturbi alimentari. In Italia puoi chiamare il numero verde SOS Disturbi Alimentari 800 180 969 (verifica orari e attivazione sul sito ufficiale). Se vuoi, resto qui per aiutarti con cose pratiche, senza numeri né restrizioni." },
  { cat: "extreme_restriction", re: /\b(digiun\w+\s+(di\s+)?\d+\s*giorn\w*|(sotto|meno\s+di)\s+(le\s+)?[5-9]\d\d\s*kcal|(sotto|meno\s+di)\s+1000\s*kcal|perdere\s+\d+\s*kg\s+in\s+(una\s+settimana|\d+\s*giorn\w*)|non\s+mangiare\s+(niente|nulla)\s+per)\b/i,
    response: "Non posso aiutarti con restrizioni così severe: possono essere pericolose per la salute. Posso invece proporti pasti regolari, semplici e sazianti. Per obiettivi di peso, il consiglio è di rivolgerti a un dietista o a un medico." },
  { cat: "minor", re: /\b(ho\s+(1[0-7]|[89])\s+anni|sono\s+minorenne|ho\s+(dodici|tredici|quattordici|quindici|sedici|diciassette)\s+anni)\b/i,
    response: "RITMO è pensato per persone maggiorenni e non posso darti indicazioni alimentari personalizzate. Parlane con un genitore, il pediatra o il medico di famiglia." },
  { cat: "pregnancy", re: /\b(sono\s+incinta|gravidanza|in\s+gravidanza|allattament\w+|sto\s+allattando)\b/i,
    response: "In gravidanza e allattamento le esigenze alimentari sono specifiche: non posso darti indicazioni personalizzate. Confrontati con il tuo ginecologo, ostetrica o un dietista." },
  { cat: "severe_allergy", re: /\b(shock\s+anafilattic\w*|anafilass\w+|allergia\s+grave|allergia\s+severa)\b/i,
    response: "Per allergie gravi non posso garantire la sicurezza di una ricetta o di un prodotto: controlla sempre le etichette e segui le indicazioni del tuo allergologo." },
  { cat: "medical", re: /\b(diabet\w+|insulina|celiachia\s+diagnosticata|insufficienza\s+renale|dialisi|chemioterapia|ipertension\w+\s+grave|terapia\s+farmacologica|dose\s+di\s+\w+\s+(mg|unit))\b/i,
    response: "Con condizioni mediche o terapie in corso non posso dare indicazioni alimentari personalizzate: rivolgiti al tuo medico o a un dietista. Posso aiutarti con idee di pasti generici, senza sostituire le indicazioni del tuo specialista." },
];

/** Classificazione deterministica pre-LLM (l'LLM non è l'unica barriera). */
export function assessRisk(text: string): RiskResult {
  for (const r of RULES) if (r.re.test(text)) return { risk: r.cat, response: r.response };
  return { risk: null };
}

const INJECTION = /(ignor\w+\s+(tutte\s+)?(le\s+)?(istruzioni|regole)|ignore\s+(all\s+)?(previous|prior)\s+instructions|system\s+prompt|you\s+are\s+now|reveal\s+.*(prompt|key|secret)|service_role|esegui\s+(sql|codice)|drop\s+table)/i;

export function looksLikeInjection(text: string): boolean { return INJECTION.test(text); }

/** Dati esterni (ricette, OFF, nomi in dispensa) sono DATI: delimitati, troncati e mai trattati come istruzioni. */
export function wrapUntrusted(source: string, text: string): string {
  const clean = text.replace(/<\/?untrusted[^>]*>/gi, "").slice(0, 2000);
  const flag = looksLikeInjection(clean) ? ' flagged="possible-injection"' : "";
  return `<untrusted source="${source}"${flag}>${clean}</untrusted>`;
}

const FORBIDDEN_OUTPUT = [
  /\b(compens\w+|smaltir\w+|bruciare)\b.*\b(pizza|dolce|abbuffata|cena|pranzo)\b/i,
  /\bdigiun\w+\s+(per\s+)?(compens\w+|domani|oggi)\b/i,
  /\bsaltare\s+(il\s+)?(pasto|pranzo|cena|colazione)\s+(per\s+)?compens\w+/i,
  /\b(diagnosi|ti\s+diagnostico|devi\s+assumere|prescrivo)\b/i,
];
/** Validazione output: blocca comportamenti compensatori o clinici. */
export function validateOutput(text: string): { ok: boolean; reason?: string } {
  for (const re of FORBIDDEN_OUTPUT) if (re.test(text)) return { ok: false, reason: re.source };
  return { ok: true };
}
export const SAFE_FALLBACK = "Preferisco non darti questa indicazione. Posso aiutarti a proseguire con la tua routine normale e proporti un prossimo pasto semplice.";
