# Modello costi (script riproducibile: `node scripts/cost-model.mjs`)
**Tutti i numeri sono ASSUNZIONI**, non dati reali: IVA 22%; commissione store 15% (da verificare per programma e paese); costo AI €0,004/messaggio (da misurare col provider scelto); conversione Free→Plus 3%; 70% annuale; 15 msg/mese per utente free, 120 per Plus; fissi €60/mese (ogni 10k utenti); supporto €0,30/pagante.
Netto per pagante ≈ **€4,87/mese**. Worst-case AI di un Plus al limite (500 msg) ≈ €2,00 (41% del netto) → il limite è parte del modello di business.
| Utenti | Paganti | Ricavo netto €/m | Costo AI €/m | Costi tot €/m | Margine €/m |
|---|---|---|---|---|---|
| 100 | 3 | 15 | 7 | 68 | −54 |
| 1.000 | 30 | 146 | 73 | 142 | 5 |
| 5.000 | 150 | 731 | 363 | 468 | 263 |
| 10.000 | 300 | 1.462 | 726 | 876 | 586 |
| 50.000 | 1.500 | 7.310 | 3.630 | 4.380 | 2.930 |
Esclusi: marketing/CAC, tasse sul reddito, stipendi. Non sono previsioni. Il break-even operativo compare solo ~1.000 utenti **con conversione 3%**: se la conversione è 1% è irraggiungibile ai volumi bassi → priorità: misurare conversione reale e costo AI reale in beta.
Provider AI: nessun confronto prezzi/qualità eseguito (R-2: da fare con listini ufficiali).
