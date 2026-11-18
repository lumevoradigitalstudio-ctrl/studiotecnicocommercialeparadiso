# Area «Obiettivo peso» (dimagrimento su misura) — design, sicurezza, limiti
**Stato:** implementata e testata (35 test sulla logica + E2E), **NON validata da un professionista**. Va rivista da un dietista/medico e dal legale prima di qualsiasi lancio pubblico: interruttore `EXPO_PUBLIC_WEIGHT_AREA=off` per spegnerla nelle build pubbliche.

## Ispirazione dalla concorrenza (da conoscenza generale dei prodotti; **non testati direttamente**, vedi `competitive-matrix.md`)
| Idea tipica del settore | Come la declina RITMO |
|---|---|
| Budget calorico giornaliero (MyFitnessPal, YAZIO, Lifesum) | Solo come **intervallo ±100 kcal**, dopo screening, con soglie minime e deficit ≤ 25% |
| Peso «a trend» che attenua il rumore (MacroFactor) | Media mobile esponenziale; pesate anomale pesano poco; ritmo mostrato solo con ≥3 pesate su ≥7 giorni |
| Abitudini e check-in (Noom) | Tre abitudini pratiche + check-in settimanale **neutro**, mai colpevolizzante |
| Piani strutturati (Melarossa) | «Giornata su misura» costruita sul **turno di lavoro** dell'utente: il differenziatore di RITMO |
Scelte deliberatamente diverse: ritmo lento (≤0,75 kg/sett e ~0,5% del peso), nessuna «serie» da non interrompere, pesarsi è facoltativo, nessun conteggio ossessivo.

## Regole di sicurezza implementate (e testate)
- Solo adulti (18–75). Nessun obiettivo per: minorenni, gravidanza/allattamento, storia di DCA, condizioni mediche/terapie, BMI < 18,5 → messaggio che indirizza a un professionista; **nulla viene salvato** e **nessuna cifra** viene mostrata.
- BMI 18,5–24,9 → solo mantenimento (nessun deficit). BMI ≥ 35 → supervisione medica consigliata.
- Formula: Mifflin-St Jeor × fattore di attività. Deficit ≤ 25% del fabbisogno; soglia minima max(BMR, 1200 F / 1500 M); peso obiettivo con BMI ≥ 20; ritmo troncato a 0,75 kg/sett.; 7700 kcal/kg (approssimazione nota per eccesso).
- Se il peso scende > 1% a settimana: messaggio di cautela e rimando al professionista. Se sale: nessun giudizio.
- Consenso esplicito e separato per i dati sul peso (categoria particolare, art. 9 GDPR); revoca = cancellazione di peso e profilo (locale e, se collegato, su Supabase).
## Limiti e rischi dichiarati
- **Soglie e testi sono scelte prudenti mie, non validate**: potrebbero non essere adatte a tutti. È un'area che può causare danni se usata male: serve revisione professionale.
- Le stime sono orientative; la formula non conosce composizione corporea, farmaci, ciclo, ecc.
- La valutazione «dispositivo medico»/software di supporto alla salute va fatta prima del lancio (potrebbe applicarsi).
- DPIA fortemente consigliata (dati sulla salute su larga scala).
- L'assistente chat NON usa il peso (nessuna integrazione): il consiglio calorico non passa dall'AI.
- Remoto: i dati vanno in `progress_entries` (kind `weight`/`body_profile`) con RLS; **non provato con utenti reali**.
