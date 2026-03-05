# Bruderland Review Dashboard

Jednoduchá webová aplikace pro centralizovaný přehled zákaznických hodnocení napříč jazykovými mutacemi a kanály.

## Co umí

- Záložky pro oddělení analytické části (**Dashboard**) a konfigurační části (**Nastavení zdrojů**).

- Agregace metrik na úrovni celku, zemí i jednotlivých kanálů.
- Filtrování dle období (`od` / `do`), země a kanálu.
- Přehledné souhrnné KPI karty.
- Automatický import dat přes API bez ručního uploadu souborů.
- Konfigurace **každého zdroje zvlášť** (URL exportu, auth token, parser, enabled).
- Možnost smazat vybraný kanál přímo v tabulce zdrojů.
- Periodická synchronizace dat 1x denně (1440 minut).
- Indikátor zdroje dat (Live API vs Demo) a čas poslední úspěšné synchronizace.
- Tlačítko synchronizace pro každý jednotlivý kanál (bez načítání všeho).
- Volba **Zachovat historická data (append)** pro API, která vrací jen klouzavé časové okno.

## Spuštění

```bash
python3 dev_server.py
```

Aplikace bude dostupná na `http://localhost:8000`.

### Spuštění ve VS Code

1. Otevřete projekt ve VS Code.
2. Otevřete **Terminal → New Terminal**.
3. Spusťte přesně tento příkaz:

```bash
python3 dev_server.py
```

4. V prohlížeči otevřete `http://localhost:8000` (ne Live Server extension).

> `dev_server.py` je lokální server s proxy endpointem `/proxy`, aby na localhostu fungovalo načítání Heureka XML exportu bez CORS blokace v browseru.


> Pokud vidíte chybu `404 /proxy`, aplikace pravděpodobně běží přes jiný server (`python3 -m http.server`).
> Pro funkční Heureka sync na localhostu používejte vždy `python3 dev_server.py` (funguje i na `localhost`, `127.0.0.1` i `::1`).

## Jak funguje import pro různé zdroje

V sekci **Nastavení API podle zdroje** má každý kanál vlastní konfiguraci:

- `URL pro stahování dat` – adresa konkrétního exportu/API pro daný zdroj.
- `Auth token` – volitelně (odesílá se jako `Authorization` header).
- `Parser` – typ odpovědi API/exportu:
  - `standard-array` → API vrací přímo `[]` záznamů.
  - `wrapped-reviews` → API vrací `{ "reviews": [] }`.
  - `items-v2` → API vrací `{ "items": [] }` s mapováním polí.
  - `heureka-xml` → XML export recenzí Heureka (`<reviews><review>...`).
- `Aktivní` – zdroj se bude/nebo nebude periodicky synchronizovat.

Po kliknutí na **Synchronizovat vše nyní** aplikace stáhne data ze všech aktivních zdrojů a sloučí je do dashboardu.

U každého kanálu je navíc tlačítko **Sync kanál** pro refresh jen jednoho zdroje.

Pokud API vrací jen část historie (klouzavé okno), zapněte **Zachovat historická data (append)**. Aplikace pak při globálním synci nepřepisuje vše, ale mergeuje data podle klíče `kanál + země + datum`.

Nové zdroje můžete přidat přímo formulářem **Přidat / upravit vybraný kanál** (kanál, země, URL, token, parser, aktivace).

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


## Heureka CZ – připravené nastavení

Pro zdroj `heureka.cz` je předvyplněná URL exportu:

```
https://www.heureka.cz/direct/dotaznik/export-review.php?key=3d1c95786eee7013da761a88cad80c60
```

Použijte parser `heureka-xml`. Aplikace mapuje `unix_timestamp`/`ordered` na datum, `total_rating` na `score` a každou recenzi počítá jako `reviews: 1`.


## Ukládání XML a databáze

- Stažené XML soubory se samostatně neukládají.
- XML/JSON odpověď se po načtení hned parsuje na normalizované záznamy.
- Tyto záznamy se ukládají pouze do `localStorage` v prohlížeči (`bruderland-review-data`).
- V této verzi není žádná serverová databáze.


> Pro produkci je vhodné backend + databáze (např. PostgreSQL), aby byla historie bezpečně uložená centrálně a nebyla vázaná jen na `localStorage` konkrétního prohlížeče.


## Proč sync tlačítka na localhostu někdy „nefungují“

Pokud běží aplikace lokálně (`http://localhost:8000`) a volá cizí API/export URL, může browser požadavek zablokovat kvůli CORS, HTTPS politice nebo partner whitelistu IP/domény.

Typický projev: status hlásí chybu `Failed to fetch` / blokaci požadavku.

Doporučené řešení pro reálný provoz:
- pro lokální vývoj používat `dev_server.py`, který poskytuje proxy endpoint `/proxy` pro Heureka XML,
- v produkci volat zdroje přes vlastní backend/proxy (server-to-server) a na frontendu číst sjednocené interní API.


## Propojení s dashboardem z lovable.dev (nový GitHub repozitář)

Ano, propojení je možné. Nejbezpečnější je převzít **UI z lovable.dev** a zachovat zdejší datovou logiku (sync/parsování/filtry) jako integrační vrstvu.

### Doporučený postup (MVP)

1. V novém repozitáři z lovable.dev vytvořte větev `integration/bruderland-sync`.
2. Z tohoto repozitáře přeneste minimálně soubory:
   - `app.js` (logika importu/sync/parsování),
   - `dev_server.py` (lokální proxy pro Heureka XML),
   - případně části `styles.css` jen pokud chybí základní styly tabulek/formulářů.
3. V lovable UI vytvořte stejné DOM elementy (nebo jejich ID mapování), které logika očekává:
   - filtry: `#dateFrom`, `#dateTo`, `#countryFilter`, `#channelFilter`,
   - dashboard výstupy: `#summaryCards`, `#countryRows`, `#channelRows`,
   - settings/sync: `#sourceRows`, `#syncNow`, `#syncStatus`, `#refreshMinutes`, ...
4. Ověřte, že v `index.html` je načten `app.js` až po renderu DOM (na konci `body`, nebo přes `defer`).
5. Spouštějte lokálně vždy přes:

```bash
python3 dev_server.py
```

6. Otevřete `http://localhost:8000` a otestujte:
   - přepínání záložek,
   - smazání/uložení kanálu,
   - `Sync kanál` pro `heureka.cz`.

### Varianta „spojit repozitáře“ přes git remote

Pokud chcete porovnat a spojit kód přímo přes git:

```bash
git remote add lovable <URL_VASEHO_NOVEHO_REPA>
git fetch lovable
git checkout -b merge/lovable-dashboard lovable/main
```

Pak přenášejte změny cíleně (nejlépe po modulech), ne "všechno najednou".

### Co budu potřebovat, abych to spojil přímo já

Pošlete URL nového repozitáře (nebo přidejte remote sem do prostředí) a cílovou větev. Pak můžu připravit konkrétní merge/integraci přímo v kódu.
