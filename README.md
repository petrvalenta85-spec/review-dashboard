# Bruderland Review Dashboard

Jednoduchá webová aplikace pro centralizovaný přehled zákaznických hodnocení napříč jazykovými mutacemi a kanály.

## Co umí

- Agregace metrik na úrovni celku, zemí i jednotlivých kanálů.
- Filtrování dle období (`od` / `do`), země a kanálu.
- Přehledné souhrnné KPI karty.
- Správa registru kanálů (lokálně přes `localStorage`) pro snadné rozšíření o další zdroje.

## Podporované kanály (výchozí)

- heureka.cz
- heureka.sk
- arukereso
- ceneo
- compari
- trustedshop
- idealo.de
- idealo.at

## Spuštění

```bash
python3 -m http.server 8000
```

Aplikace bude dostupná na `http://localhost:8000`.

> Poznámka: Data jsou zatím demonstrační (`app.js`). Dalším krokem je připojení na API/ETL pro pravidelný import hodnocení z jednotlivých portálů.
