# Bruderland Review Dashboard

Jednoduchá webová aplikace pro centralizovaný přehled zákaznických hodnocení napříč jazykovými mutacemi a kanály.

## Co umí

- Agregace metrik na úrovni celku, zemí i jednotlivých kanálů.
- Filtrování dle období (`od` / `do`), země a kanálu.
- Přehledné souhrnné KPI karty.
- Automatický import dat přes API bez ručního uploadu souborů.
- Konfigurace **každého zdroje zvlášť** (endpoint, auth token, parser, enabled).
- Periodická synchronizace dat (nastavitelný interval v minutách).

## Spuštění

```bash
python3 -m http.server 8000
```

Aplikace bude dostupná na `http://localhost:8000`.

## Jak funguje import pro různé zdroje

V sekci **Nastavení API podle zdroje** má každý kanál vlastní konfiguraci:

- `Endpoint` – URL konkrétního API pro daný zdroj.
- `Auth token` – volitelně (odesílá se jako `Authorization` header).
- `Parser` – typ odpovědi API:
  - `standard-array` → API vrací přímo `[]` záznamů.
  - `wrapped-reviews` → API vrací `{ "reviews": [] }`.
  - `items-v2` → API vrací `{ "items": [] }` s mapováním polí.
- `Aktivní` – zdroj se bude/nebo nebude periodicky synchronizovat.

Po kliknutí na **Synchronizovat vše nyní** aplikace stáhne data ze všech aktivních zdrojů a sloučí je do dashboardu.

## Očekávaný normalizovaný záznam

```json
{
  "date": "2026-03-01",
  "country": "CZ",
  "channel": "heureka.cz",
  "score": 4.7,
  "reviews": 123
}
```

## Které kanály nabízejí API napojení?

> Většinou jde o partnerské/merchant API, ne veřejné anonymní API.

- **heureka.cz / heureka.sk**: partner API po schválení.
- **arukereso / compari**: zpravidla partner-only přístup.
- **ceneo**: merchant/partner integrace po registraci.
- **Trusted Shops**: API dostupné v jejich business ekosystému.
- **idealo.de / idealo.at**: partner onboarding + API/feed napojení.
