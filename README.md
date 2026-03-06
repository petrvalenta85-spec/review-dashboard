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


### Jak přidat remote a cílovou větev (přesné příkazy)

Spusťte v terminálu v tomto repozitáři:

```bash
# 1) zkontrolovat aktuální remotes
git remote -v

# 2) přidat nový remote (název si můžete změnit, zde používáme "lovable")
git remote add lovable <URL_NOVEHO_REPOZITARE>

# 3) stáhnout větve z nového repozitáře
git fetch lovable

# 4) vypsat dostupné remote větve (Linux/macOS/Git Bash)
git branch -r | grep lovable/

# 4b) PowerShell alternativa (Windows)
git branch -r | Select-String "lovable/"

# 5) vytvořit lokální integrační větev z cílové remote větve
git checkout -b integration/lovable lovable/<CILOVA_VETEV>
```

Příklad (pokud cílová větev je `main`):

```bash
git remote add lovable https://github.com/<ORG_NEBO_UZIVATEL>/<REPO>.git
git fetch lovable
git checkout -b integration/lovable lovable/main
```

Pokud je repo privátní a HTTPS se ptá na heslo, použijte Personal Access Token (PAT) jako password nebo SSH remote (`git@github.com:...`).


Na Windows PowerShell `grep` standardně není dostupný, proto použijte `Select-String`.

Pro kontrolu, že jste na správné větvi:

```bash
git status
git branch --show-current
```


### Co dál po `git checkout -b integration/lovable lovable/main`

Výsledek, který píšete, je správně – jste na integrační větvi od lovable repozitáře.

Doporučený pokračující postup:

```bash
# 1) ověřit, kde jste
git branch --show-current
git status

# 2) najít správnou složku projektu (musí obsahovat dev_server.py)
pwd
ls

# 3) pokud dev_server.py nevidíte, přejděte do správné složky
cd <slozka-kde-je-dev_server.py>

# 4) spusťte lokální server
python3 dev_server.py
```

Na Windows je vaše chyba:

`can't open file ...\review-dashboard\review-dashboard\dev_server.py`

známka toho, že jste ve špatném adresáři (o úroveň vedle), nebo pracujete v jiném klonu bez `dev_server.py`.

Rychlá kontrola na Windows PowerShell:

```powershell
Get-Location
Get-ChildItem
```

Po spuštění serveru otevřete `http://localhost:8000` a pak můžeme udělat první cílený merge (např. jen data sync vrstvu).


### Když jste v lovable projektu (React/Vite) a `dev_server.py` tam není

Podle vašeho výpisu jste už v **jiném repozitáři** (lovable scaffold: `src/`, `public/`, `vite.config.ts`, `package.json`).
V takovém projektu je správné spuštění jiné:

```powershell
npm install
npm run dev
```

A pak otevřít URL, které vypíše Vite (typicky `http://localhost:5173`).

`python3 dev_server.py` funguje jen v tomto původním repozitáři, kde soubor `dev_server.py` fyzicky existuje.

#### Co udělat teď prakticky

1. V lovable projektu spusťte `npm run dev` a ověřte, že UI běží.
2. Potom integrujte sync vrstvu z původního dashboardu:
   - přenést logiku z `app.js` (parsing/sync/storage),
   - napojit ji na komponenty ve `src/` (React state + event handlery),
   - pro Heureka XML přidat backend proxy (např. Vite server proxy / Firebase Function / vlastní backend).
3. Pokud chcete, připravím vám další krok: přesný seznam souborů ve `src/`, které upravit jako první.




### Jedním skriptem (Windows) – bez ručního kopírování příkazů

Přidal jsem skript `windows-dev-run.ps1`, který udělá:
- dočasné `ExecutionPolicy Bypass` jen pro aktuální okno,
- `npm install`,
- `npm run dev`.

Použití v PowerShellu (v kořeni projektu):

```powershell
./windows-dev-run.ps1
```

Volitelné parametry:

```powershell
# když už jsou balíčky nainstalované
./windows-dev-run.ps1 -SkipInstall

# vynutí použití npm.cmd (když je problém s npm.ps1)
./windows-dev-run.ps1 -UseNpmCmd
```

### Windows PowerShell chyba: `npm.ps1 cannot be loaded`

Tato chyba není problém projektu, ale PowerShell bezpečnostní politiky (Execution Policy).

#### Nejrychlejší bezpečné řešení jen pro aktuální okno

Spusťte v PowerShellu:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
npm run dev
```

`-Scope Process` platí jen pro aktuální terminál (po zavření se vrátí původní stav).

#### Alternativa bez změny policy (spustit `.cmd` variantu)

```powershell
npm.cmd install
npm.cmd run dev
```

#### Doporučený dlouhodobý kompromis pro uživatele

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Potom znovu otevřete terminál a spusťte:

```powershell
npm install
npm run dev
```

Pokud ve firmě spravuje policy IT oddělení (GPO), použijte `npm.cmd` nebo požádejte IT o povolení.


### Chyba: `./windows-dev-run.ps1 ... is not recognized`

V PowerShellu na Windows použijte raději zpětné lomítko:

```powershell
.\windows-dev-run.ps1
```

Pokud to stále hlásí, že skript neexistuje, jste v jiném adresáři/repozitáři.
Ověření:

```powershell
Get-Location
Get-ChildItem windows-dev-run.ps1
```

Když soubor nenajde:
- přejděte do složky, kde skript je, nebo
- pokud jste v lovable repozitáři, spusťte přímo:

```powershell
npm.cmd install
npm.cmd run dev
```

Pozn.: `./script.ps1` je běžné pro bash; v PowerShellu funguje standardně `.\script.ps1`.


### Co dál po `npm.cmd run dev` (cíleně ke sloučení)

Pokud UI běží, další krok je udělat **integrační commit** (ne jen spouštět server):

```powershell
# 1) ujistit se, že jste na integrační větvi
git branch --show-current

# 2) vytvořit pracovní branch pro merge krok
git checkout -b feat/merge-sync-layer

# 3) přenést logiku ze starého dashboard repa (ručně nebo cherry-pickem)
# minimálně: parsování + sync + storage vrstva

# 4) průběžně kontrolovat změny
git status
git diff

# 5) otestovat build + lint + dev
npm.cmd run build
npm.cmd run dev

# 6) commitnout integrační krok
git add .
git commit -m "Integrate review sync layer into lovable dashboard"

# 7) pushnout branch a otevřít PR
git push -u origin feat/merge-sync-layer
```

#### Doporučené pořadí sloučení (aby to šlo bez chaosu)

1. Nejprve jen datový model a storage (`records`, `sources`, `sync meta`).
2. Potom parsery (`heureka-xml`, `wrapped-reviews`, `items-v2`, `standard-array`).
3. Nakonec UI napojení na komponenty (`src/`) a tlačítka sync.

Takto vzniknou 2–3 menší PR místo jednoho velkého rizikového merge.
<<<<<<< HEAD
=======


## Firebase init – co odpovědět (pro tento repozitář)

Pro tento projekt (statický dashboard v rootu: `index.html`, `app.js`, `styles.css`) odpovězte ve `firebase init` takto:

1. **Project Setup**
   - `Use an existing project`
   - vybrat: `bruderland-review-dashboard`

2. **Hosting Setup**
   - `What do you want to use as your public directory?` → `.`

3. **Configure as a single-page app (rewrite all urls to /index.html)?**
   - `No` (dashboard nepoužívá client-side routování typu `/route`)

4. **Set up automatic builds and deploys with GitHub?**
   - doporučení pro první krok: `No` (lze zapnout později)

5. **File ./index.html already exists. Overwrite?**
   - `No`

Poté nasazení:

```bash
firebase deploy --only hosting
```

### Poznámka k `public` vs `.`

CLI nabízí výchozí `public`, ale tento repozitář má statické soubory v kořeni. Pokud nechcete přesouvat soubory do složky `public/`, použijte `.` jako public directory.


### Heureka sync na Firebase (aby nepadal CORS)

V live prostředí na Firebase je pro `heureka-xml` potřeba backend proxy na cestě `/proxy`.
Frontend nyní pro Heureka XML volá vždy `/proxy?url=...`.

#### 1) Hosting rewrite na function

Do `firebase.json` přidejte rewrite:

```json
{
  "hosting": {
    "rewrites": [
      { "source": "/proxy", "function": "proxy" },
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

#### 2) Function `proxy` (Node.js) – minimální kostra

```js
// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");

exports.proxy = onRequest(async (req, res) => {
  const target = String(req.query.url || "").trim();
  if (!target) return res.status(400).json({ error: "Missing url" });

  const parsed = new URL(target);
  if (parsed.hostname !== "www.heureka.cz") {
    return res.status(403).json({ error: "Host not allowed" });
  }

  const upstream = await fetch(target, { headers: { "User-Agent": "BruderlandReviewDashboard/1.0" } });
  const body = await upstream.text();
  res.set("Content-Type", upstream.headers.get("content-type") || "application/xml; charset=utf-8");
  return res.status(upstream.status).send(body);
});
```

Pak deploy:

```bash
firebase deploy --only functions,hosting
```


### Aktualizace existujícího PR #5 (bez zakládání nového PR)

Pokud už máte otevřený PR `#5` z větve `feat/merge-sync-layer-2`, postup je:

```powershell
# 1) přepnout se na stejnou větev PR
git checkout feat/merge-sync-layer-2

# 2) stáhnout aktuální base větev (např. main)
git fetch origin
git merge origin/main
# (případné konflikty vyřešit, uložit, pak: git add . && git commit)

# 3) udělat vaše změny
git add .
git commit -m "Resolve merge conflicts and update sync integration"

# 4) pushnout zpět do stejné větve
git push origin feat/merge-sync-layer-2
```

Tím se **stejný PR #5 automaticky aktualizuje** – není potřeba zakládat nový PR.
>>>>>>> 00dc4b1 (Document how to update existing PR #5 on same branch)
