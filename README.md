# Bruderland Review Dashboard

Jednoduchá webová aplikace pro centralizovaný přehled zákaznických hodnocení napříč jazykovými mutacemi a kanály.

## Co umí

- Agregace metrik na úrovni celku, zemí i jednotlivých kanálů.
- Filtrování dle období (`od` / `do`), země a kanálu.
- Přehledné souhrnné KPI karty.
- Automatický import dat přes API endpoint (bez ručního nahrávání souborů).
- Periodická synchronizace dat (nastavitelný interval v minutách).
- Přehled dostupnosti API napojení pro jednotlivé kanály.

## Spuštění

```bash
python3 -m http.server 8000
```

Aplikace bude dostupná na `http://localhost:8000`.

## API režim (bez ručního uploadu)

Dashboard očekává endpoint, který vrací JSON pole záznamů ve tvaru:

```json
[
  {
    "date": "2026-03-01",
    "country": "CZ",
    "channel": "heureka.cz",
    "score": 4.7,
    "reviews": 123
  }
]
```

Výchozí endpoint je `/api/reviews` (lze přepsat v UI). Po startu proběhne automatická synchronizace a následně pravidelné obnovování dle nastaveného intervalu.

## Které kanály nabízejí API napojení?

> Pozn.: U většiny srovnávačů jde o **partnerské/merchant API**, ne veřejné anonymní API.

- **heureka.cz / heureka.sk**: partnerské rozhraní (merchant feed + ověřeno zákazníky, přístup po schválení).
- **arukereso**: veřejná API dokumentace není běžně dostupná, obvykle individuální partner integrace.
- **ceneo**: merchant/partnerské napojení (po registraci a schválení).
- **compari**: partnerská integrace obdobně jako Árukereső.
- **Trusted Shops**: dostupná API v rámci Trusted Shops ekosystému (business/trustbadge služby).
- **idealo.de / idealo.at**: merchant onboarding + feed/API přístup typicky po schválení.

Prakticky doporučuji používat **jeden interní integrační endpoint** (ETL/API gateway), který data z těchto zdrojů sjednotí do společného formátu pro dashboard.
