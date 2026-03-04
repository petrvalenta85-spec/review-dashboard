const baseRecords = [
  { date: '2026-01-05', country: 'CZ', channel: 'heureka.cz', score: 4.6, reviews: 320 },
  { date: '2026-01-14', country: 'SK', channel: 'heureka.sk', score: 4.5, reviews: 210 },
  { date: '2026-01-21', country: 'HU', channel: 'arukereso', score: 4.3, reviews: 145 },
  { date: '2026-01-20', country: 'PL', channel: 'ceneo', score: 4.1, reviews: 190 },
  { date: '2026-01-25', country: 'RO', channel: 'compari', score: 4.0, reviews: 128 },
  { date: '2026-02-02', country: 'DE', channel: 'trustedshop', score: 4.7, reviews: 460 },
  { date: '2026-02-05', country: 'DE', channel: 'idealo.de', score: 4.4, reviews: 255 },
  { date: '2026-02-11', country: 'AT', channel: 'idealo.at', score: 4.2, reviews: 174 }
];

const apiAvailability = [
  {
    channel: 'heureka.cz / heureka.sk',
    status: 'Partnerské API',
    note: 'Merchant/partner integrace po schválení.'
  },
  {
    channel: 'arukereso / compari',
    status: 'Neveřejné / partner-only',
    note: 'Běžně se řeší obchodně, ne veřejným API klíčem.'
  },
  { channel: 'ceneo', status: 'Partnerské API', note: 'Merchant napojení po registraci.' },
  {
    channel: 'Trusted Shops',
    status: 'Ano',
    note: 'Dostupná API v rámci Trusted Shops ekosystému.'
  },
  {
    channel: 'idealo.de / idealo.at',
    status: 'Partnerské API',
    note: 'Přístup po merchant onboarding procesu.'
  }
];

const defaultSources = [
  {
    id: 'heureka-cz',
    channel: 'heureka.cz',
    country: 'CZ',
    endpoint: 'https://www.heureka.cz/direct/dotaznik/export-review.php?key=3d1c95786eee7013da761a88cad80c60',
    token: '',
    parser: 'heureka-xml',
    enabled: true
  },
  {
    id: 'heureka-sk',
    channel: 'heureka.sk',
    country: 'SK',
    endpoint: 'https://api.example.com/heureka-sk/reviews',
    token: '',
    parser: 'wrapped-reviews',
    enabled: true
  },
  {
    id: 'arukereso',
    channel: 'arukereso',
    country: 'HU',
    endpoint: 'https://api.example.com/arukereso/ratings',
    token: '',
    parser: 'items-v2',
    enabled: false
  },
  {
    id: 'ceneo',
    channel: 'ceneo',
    country: 'PL',
    endpoint: 'https://api.example.com/ceneo/reviews',
    token: '',
    parser: 'standard-array',
    enabled: false
  },
  {
    id: 'compari',
    channel: 'compari',
    country: 'RO',
    endpoint: 'https://api.example.com/compari/ratings',
    token: '',
    parser: 'items-v2',
    enabled: false
  },
  {
    id: 'trusted-shops',
    channel: 'trustedshop',
    country: 'DE',
    endpoint: 'https://api.example.com/trusted-shops/reviews',
    token: '',
    parser: 'wrapped-reviews',
    enabled: false
  },
  {
    id: 'idealo-de',
    channel: 'idealo.de',
    country: 'DE',
    endpoint: 'https://api.example.com/idealo-de/reviews',
    token: '',
    parser: 'standard-array',
    enabled: false
  },
  {
    id: 'idealo-at',
    channel: 'idealo.at',
    country: 'AT',
    endpoint: 'https://api.example.com/idealo-at/reviews',
    token: '',
    parser: 'standard-array',
    enabled: false
  }
];

const parserOptions = [
  { value: 'standard-array', label: 'standard-array ([])' },
  { value: 'wrapped-reviews', label: 'wrapped-reviews ({ reviews: [] })' },
  { value: 'items-v2', label: 'items-v2 ({ items: [] })' },
  { value: 'heureka-xml', label: 'heureka-xml (<reviews><review>)' }
];

const dataStorageKey = 'bruderland-review-data';
const sourceStorageKey = 'bruderland-source-configs';
const intervalStorageKey = 'bruderland-api-refresh-minutes';

const dateFrom = document.querySelector('#dateFrom');
const dateTo = document.querySelector('#dateTo');
const countryFilter = document.querySelector('#countryFilter');
const channelFilter = document.querySelector('#channelFilter');
const summaryCards = document.querySelector('#summaryCards');
const countryRows = document.querySelector('#countryRows');
const channelRows = document.querySelector('#channelRows');
const resetFilters = document.querySelector('#resetFilters');

const sourceRows = document.querySelector('#sourceRows');
const refreshMinutes = document.querySelector('#refreshMinutes');
const syncNow = document.querySelector('#syncNow');
const resetToDemo = document.querySelector('#resetToDemo');
const saveSources = document.querySelector('#saveSources');
const syncStatus = document.querySelector('#syncStatus');
const apiAvailabilityRows = document.querySelector('#apiAvailabilityRows');

let records = loadRecords();
let sourceConfigs = loadSourceConfigs();
let timerId = null;

function isValidRecord(record) {
  if (!record || typeof record !== 'object') return false;
  const validDate = typeof record.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.date);
  const validCountry = typeof record.country === 'string' && record.country.trim().length === 2;
  const validChannel = typeof record.channel === 'string' && record.channel.trim().length > 0;
  const validScore = Number.isFinite(Number(record.score)) && Number(record.score) >= 0;
  const validReviews = Number.isInteger(Number(record.reviews)) && Number(record.reviews) >= 0;
  return validDate && validCountry && validChannel && validScore && validReviews;
}

function normalizeRecord(record, fallback) {
  return {
    date: record.date,
    country: (record.country || fallback.country).trim().toUpperCase(),
    channel: (record.channel || fallback.channel).trim().toLowerCase(),
    score: Number(record.score),
    reviews: Number(record.reviews)
  };
}

function unixToDateString(unixValue) {
  const unix = Number(unixValue);
  if (!Number.isFinite(unix) || unix <= 0) return '';
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

function parseHeurekaXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Neplatné XML v Heureka exportu.');
  }

  return [...doc.querySelectorAll('review')].map((review) => {
    const ordered = review.querySelector('ordered')?.textContent?.trim();
    const unixTimestamp = review.querySelector('unix_timestamp')?.textContent?.trim();
    const ratingRaw = review.querySelector('total_rating')?.textContent?.trim() || '0';
    const rating = Number(ratingRaw.replace(',', '.'));

    return {
      date: unixToDateString(unixTimestamp || ordered),
      score: Number.isFinite(rating) ? rating : 0,
      reviews: 1
    };
  });
}

function parseByType(payload, parser, source) {
  if (parser === 'standard-array' && Array.isArray(payload)) {
    return payload;
  }

  if (parser === 'wrapped-reviews' && payload && Array.isArray(payload.reviews)) {
    return payload.reviews;
  }

  if (parser === 'items-v2' && payload && Array.isArray(payload.items)) {
    return payload.items.map((item) => ({
      date: item.review_date,
      country: item.country_code,
      channel: item.source,
      score: item.rating,
      reviews: item.count
    }));
  }

  if (parser === 'heureka-xml' && typeof payload === 'string') {
    return parseHeurekaXml(payload);
  }

  throw new Error(`Nepodporovaný formát odpovědi pro parser ${parser}`);
}

function loadRecords() {
  const saved = localStorage.getItem(dataStorageKey);
  if (!saved) return [...baseRecords];

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [...baseRecords];
    const valid = parsed.filter(isValidRecord).map((record) => normalizeRecord(record, record));
    return valid.length ? valid : [...baseRecords];
  } catch {
    return [...baseRecords];
  }
}

function saveRecords() {
  localStorage.setItem(dataStorageKey, JSON.stringify(records));
}

function loadSourceConfigs() {
  const saved = localStorage.getItem(sourceStorageKey);
  if (!saved) return [...defaultSources];

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [...defaultSources];
    const knownIds = new Set(parsed.map((item) => item.id));
    const mergedWithNewDefaults = [...parsed];
    defaultSources.forEach((source) => {
      if (!knownIds.has(source.id)) mergedWithNewDefaults.push(source);
    });
    return mergedWithNewDefaults;
  } catch {
    return [...defaultSources];
  }
}

function saveSourceConfigs() {
  localStorage.setItem(sourceStorageKey, JSON.stringify(sourceConfigs));
}

function weightedAverage(inputRecords) {
  if (!inputRecords.length) return 0;
  const totals = inputRecords.reduce(
    (acc, item) => {
      acc.scoreSum += item.score * item.reviews;
      acc.reviewSum += item.reviews;
      return acc;
    },
    { scoreSum: 0, reviewSum: 0 }
  );
  return totals.reviewSum ? totals.scoreSum / totals.reviewSum : 0;
}

function groupBy(inputRecords, key) {
  const groups = new Map();
  inputRecords.forEach((record) => {
    const target = groups.get(record[key]) || [];
    target.push(record);
    groups.set(record[key], target);
  });

  return [...groups.entries()].map(([name, items]) => ({
    name,
    avg: weightedAverage(items),
    reviews: items.reduce((sum, item) => sum + item.reviews, 0)
  }));
}

function createOption(select, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function populateFilters() {
  const selectedCountry = countryFilter.value || 'ALL';
  const selectedChannel = channelFilter.value || 'ALL';

  countryFilter.innerHTML = '';
  channelFilter.innerHTML = '';
  createOption(countryFilter, 'ALL', 'Všechny země');
  createOption(channelFilter, 'ALL', 'Všechny kanály');

  const countries = [...new Set(records.map((entry) => entry.country))].sort();
  const channels = [...new Set(records.map((entry) => entry.channel))].sort();

  countries.forEach((country) => createOption(countryFilter, country, country));
  channels.forEach((channel) => createOption(channelFilter, channel, channel));

  countryFilter.value = countries.includes(selectedCountry) ? selectedCountry : 'ALL';
  channelFilter.value = channels.includes(selectedChannel) ? selectedChannel : 'ALL';
}

function filteredRecords() {
  return records.filter((record) => {
    if (countryFilter.value !== 'ALL' && record.country !== countryFilter.value) return false;
    if (channelFilter.value !== 'ALL' && record.channel !== channelFilter.value) return false;
    if (dateFrom.value && record.date < dateFrom.value) return false;
    if (dateTo.value && record.date > dateTo.value) return false;
    return true;
  });
}

function renderSummary(inputRecords) {
  const avg = weightedAverage(inputRecords);
  const totalReviews = inputRecords.reduce((sum, item) => sum + item.reviews, 0);
  const countries = new Set(inputRecords.map((r) => r.country)).size;
  const channels = new Set(inputRecords.map((r) => r.channel)).size;

  summaryCards.innerHTML = [
    ['Průměrné hodnocení', avg.toFixed(2)],
    ['Počet recenzí', totalReviews.toLocaleString('cs-CZ')],
    ['Aktivní země', countries],
    ['Aktivní kanály', channels]
  ]
    .map(
      ([title, value]) => `<div class="card"><div>${title}</div><strong>${value}</strong></div>`
    )
    .join('');
}

function renderTable(rowsNode, rows) {
  rowsNode.innerHTML = '';

  if (!rows.length) {
    rowsNode.innerHTML = '<tr><td colspan="3">Žádná data pro zvolené filtry.</td></tr>';
    return;
  }

  rows
    .sort((a, b) => b.avg - a.avg)
    .forEach((entry) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${entry.name}</td>
        <td>${entry.avg.toFixed(2)} / 5</td>
        <td>${entry.reviews.toLocaleString('cs-CZ')}</td>
      `;
      rowsNode.append(row);
    });
}

function renderApiAvailability() {
  apiAvailabilityRows.innerHTML = '';
  apiAvailability.forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${item.channel}</td><td>${item.status}</td><td>${item.note}</td>`;
    apiAvailabilityRows.append(row);
  });
}

function renderSourceSettings() {
  sourceRows.innerHTML = '';

  sourceConfigs.forEach((source) => {
    const row = document.createElement('tr');

    const parserSelect = parserOptions
      .map(
        (opt) =>
          `<option value="${opt.value}" ${opt.value === source.parser ? 'selected' : ''}>${opt.label}</option>`
      )
      .join('');

    row.innerHTML = `
      <td><input type="checkbox" data-field="enabled" data-id="${source.id}" ${source.enabled ? 'checked' : ''} /></td>
      <td>${source.channel}</td>
      <td>${source.country}</td>
      <td><input data-field="endpoint" data-id="${source.id}" value="${source.endpoint}" /></td>
      <td><input data-field="token" data-id="${source.id}" value="${source.token}" placeholder="Bearer ..." /></td>
      <td>
        <select data-field="parser" data-id="${source.id}">
          ${parserSelect}
        </select>
      </td>
    `;

    sourceRows.append(row);
  });
}

function setSyncStatus(message) {
  syncStatus.textContent = `${new Date().toLocaleTimeString('cs-CZ')} · ${message}`;
}

function updateSourceConfigFromUI() {
  sourceConfigs = sourceConfigs.map((source) => {
    const enabledEl = sourceRows.querySelector(`[data-field="enabled"][data-id="${source.id}"]`);
    const endpointEl = sourceRows.querySelector(`[data-field="endpoint"][data-id="${source.id}"]`);
    const tokenEl = sourceRows.querySelector(`[data-field="token"][data-id="${source.id}"]`);
    const parserEl = sourceRows.querySelector(`[data-field="parser"][data-id="${source.id}"]`);

    return {
      ...source,
      enabled: Boolean(enabledEl?.checked),
      endpoint: endpointEl?.value.trim() || '',
      token: tokenEl?.value.trim() || '',
      parser: parserEl?.value || source.parser
    };
  });
}

async function fetchSource(source) {
  if (!source.enabled || !source.endpoint) {
    return { source: source.channel, records: [], invalid: 0, skipped: true };
  }

  const headers = { Accept: 'application/json' };
  if (source.token) headers.Authorization = source.token;

  const response = await fetch(source.endpoint, { headers });
  if (!response.ok) {
    throw new Error(`${source.channel}: ${response.status} ${response.statusText}`);
  }

  const payload = source.parser === 'heureka-xml' ? await response.text() : await response.json();
  const extracted = parseByType(payload, source.parser, source);
  const normalized = extracted.map((record) => normalizeRecord(record, source));
  const valid = normalized.filter(isValidRecord);

  return {
    source: source.channel,
    records: valid,
    invalid: normalized.length - valid.length,
    skipped: false
  };
}

async function fetchAllSources() {
  updateSourceConfigFromUI();
  saveSourceConfigs();

  const enabledCount = sourceConfigs.filter((source) => source.enabled).length;
  if (!enabledCount) {
    setSyncStatus('Není aktivní žádný zdroj. Zapněte aspoň jeden kanál.');
    return;
  }

  const settled = await Promise.allSettled(sourceConfigs.map((source) => fetchSource(source)));
  const merged = [];
  let invalidTotal = 0;
  const failed = [];
  let successSources = 0;

  settled.forEach((result) => {
    if (result.status === 'fulfilled') {
      if (!result.value.skipped) successSources += 1;
      invalidTotal += result.value.invalid;
      merged.push(...result.value.records);
      return;
    }
    failed.push(result.reason?.message || 'Neznámá chyba');
  });

  if (!merged.length) {
    setSyncStatus(
      `Synchronizace bez validních dat. Úspěšné zdroje: ${successSources}, chyby: ${failed.length}.`
    );
    return;
  }

  records = merged;
  saveRecords();
  populateFilters();
  renderDashboard();

  let message = `Synchronizace hotová: ${records.length} záznamů z ${successSources} zdrojů.`;
  if (invalidTotal) message += ` Vyřazeno ${invalidTotal} nevalidních.`;
  if (failed.length) message += ` Chyby: ${failed.join(' | ')}.`;
  setSyncStatus(message);
}

function applyRefreshTimer() {
  const minutes = Number(refreshMinutes.value);
  if (!Number.isFinite(minutes) || minutes < 1) {
    setSyncStatus('Interval musí být alespoň 1 minuta.');
    return;
  }

  localStorage.setItem(intervalStorageKey, String(minutes));

  if (timerId) clearInterval(timerId);
  timerId = setInterval(fetchAllSources, minutes * 60 * 1000);
}

function renderDashboard() {
  const selectedRecords = filteredRecords();
  renderSummary(selectedRecords);
  renderTable(countryRows, groupBy(selectedRecords, 'country'));
  renderTable(channelRows, groupBy(selectedRecords, 'channel'));
}

function resetFiltersAll() {
  dateFrom.value = '';
  dateTo.value = '';
  countryFilter.value = 'ALL';
  channelFilter.value = 'ALL';
  renderDashboard();
}

function bootstrapSettings() {
  refreshMinutes.value = localStorage.getItem(intervalStorageKey) || '5';
}

saveSources.addEventListener('click', () => {
  updateSourceConfigFromUI();
  saveSourceConfigs();
  setSyncStatus('Nastavení zdrojů uloženo.');
});

syncNow.addEventListener('click', fetchAllSources);
refreshMinutes.addEventListener('change', applyRefreshTimer);

resetToDemo.addEventListener('click', () => {
  records = [...baseRecords];
  localStorage.removeItem(dataStorageKey);
  populateFilters();
  resetFiltersAll();
  setSyncStatus('Použita lokální demo data.');
});

[channelFilter, countryFilter, dateFrom, dateTo].forEach((el) => {
  el.addEventListener('change', renderDashboard);
});

resetFilters.addEventListener('click', resetFiltersAll);

bootstrapSettings();
renderSourceSettings();
renderApiAvailability();
populateFilters();
renderDashboard();
applyRefreshTimer();
fetchAllSources();
