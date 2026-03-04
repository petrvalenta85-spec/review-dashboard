const baseRecords = [
  { date: '2026-01-05', country: 'CZ', channel: 'heureka.cz', score: 4.6, reviews: 320 },
  { date: '2026-01-14', country: 'SK', channel: 'heureka.sk', score: 4.5, reviews: 210 },
  { date: '2026-01-21', country: 'HU', channel: 'arukereso', score: 4.3, reviews: 145 },
  { date: '2026-01-20', country: 'PL', channel: 'ceneo', score: 4.1, reviews: 190 },
  { date: '2026-01-25', country: 'RO', channel: 'compari', score: 4.0, reviews: 128 },
  { date: '2026-02-02', country: 'DE', channel: 'trustedshop', score: 4.7, reviews: 460 },
  { date: '2026-02-05', country: 'DE', channel: 'idealo.de', score: 4.4, reviews: 255 },
  { date: '2026-02-11', country: 'AT', channel: 'idealo.at', score: 4.2, reviews: 174 },
  { date: '2026-02-17', country: 'CZ', channel: 'heureka.cz', score: 4.8, reviews: 289 },
  { date: '2026-02-23', country: 'SK', channel: 'heureka.sk', score: 4.6, reviews: 201 }
];

const apiAvailability = [
  {
    channel: 'heureka.cz / heureka.sk',
    status: 'Partnerské API',
    note: 'XML feed + ověřeno zákazníky; API přístup je obvykle partnerský po schválení.'
  },
  {
    channel: 'arukereso',
    status: 'Neveřejné / partner-only',
    note: 'Veřejná recenzní API dokumentace není běžně dostupná, řeší se individuálně.'
  },
  {
    channel: 'ceneo',
    status: 'Partnerské API',
    note: 'Integrace bývá přes merchant/partnerské rozhraní (po registraci).' 
  },
  {
    channel: 'compari',
    status: 'Partnerské API',
    note: 'Podobně jako Árukereső, napojení je typicky obchodní/partnerské.'
  },
  {
    channel: 'Trusted Shops',
    status: 'Ano',
    note: 'Trusted Shops poskytuje API endpointy (Business/Trustbadge ekosystém).'
  },
  {
    channel: 'idealo.de / idealo.at',
    status: 'Partnerské API',
    note: 'Merchant Center a feed/API přístup obvykle po onboarding procesu.'
  }
];

const dataStorageKey = 'bruderland-review-data';
const endpointStorageKey = 'bruderland-api-endpoint';
const intervalStorageKey = 'bruderland-api-refresh-minutes';

const dateFrom = document.querySelector('#dateFrom');
const dateTo = document.querySelector('#dateTo');
const countryFilter = document.querySelector('#countryFilter');
const channelFilter = document.querySelector('#channelFilter');
const summaryCards = document.querySelector('#summaryCards');
const countryRows = document.querySelector('#countryRows');
const channelRows = document.querySelector('#channelRows');
const resetFilters = document.querySelector('#resetFilters');

const apiEndpoint = document.querySelector('#apiEndpoint');
const refreshMinutes = document.querySelector('#refreshMinutes');
const syncNow = document.querySelector('#syncNow');
const resetToDemo = document.querySelector('#resetToDemo');
const syncStatus = document.querySelector('#syncStatus');
const apiAvailabilityRows = document.querySelector('#apiAvailabilityRows');

let records = loadRecords();
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

function normalizeRecord(record) {
  return {
    date: record.date,
    country: record.country.trim().toUpperCase(),
    channel: record.channel.trim().toLowerCase(),
    score: Number(record.score),
    reviews: Number(record.reviews)
  };
}

function loadRecords() {
  const saved = localStorage.getItem(dataStorageKey);
  if (!saved) return [...baseRecords];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [...baseRecords];
    const valid = parsed.filter(isValidRecord).map(normalizeRecord);
    return valid.length ? valid : [...baseRecords];
  } catch {
    return [...baseRecords];
  }
}

function saveRecords() {
  localStorage.setItem(dataStorageKey, JSON.stringify(records));
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

function renderDashboard() {
  const selectedRecords = filteredRecords();
  renderSummary(selectedRecords);
  renderTable(countryRows, groupBy(selectedRecords, 'country'));
  renderTable(channelRows, groupBy(selectedRecords, 'channel'));
}

function setSyncStatus(message) {
  syncStatus.textContent = `${new Date().toLocaleTimeString('cs-CZ')} · ${message}`;
}

async function fetchApiData() {
  const endpoint = apiEndpoint.value.trim();
  if (!endpoint) {
    setSyncStatus('Chybí API endpoint.');
    return;
  }

  try {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      setSyncStatus(`API chyba ${response.status}: ${response.statusText}`);
      return;
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      setSyncStatus('API musí vracet JSON pole záznamů.');
      return;
    }

    const valid = payload.filter(isValidRecord).map(normalizeRecord);
    const invalid = payload.length - valid.length;

    if (!valid.length) {
      setSyncStatus('API nevrátilo žádné validní záznamy.');
      return;
    }

    records = valid;
    saveRecords();
    populateFilters();
    renderDashboard();
    setSyncStatus(
      `Synchronizace hotová: ${valid.length} záznamů${invalid ? `, vyřazeno ${invalid}.` : '.'}`
    );
  } catch {
    setSyncStatus('Nepodařilo se načíst API (síť/CORS/autentizace).');
  }
}

function applyRefreshTimer() {
  const minutes = Number(refreshMinutes.value);
  if (!Number.isFinite(minutes) || minutes < 1) {
    setSyncStatus('Interval musí být alespoň 1 minuta.');
    return;
  }

  localStorage.setItem(intervalStorageKey, String(minutes));

  if (timerId) clearInterval(timerId);
  timerId = setInterval(fetchApiData, minutes * 60 * 1000);
}

function resetFiltersAll() {
  dateFrom.value = '';
  dateTo.value = '';
  countryFilter.value = 'ALL';
  channelFilter.value = 'ALL';
  renderDashboard();
}

function bootstrapApiSettings() {
  apiEndpoint.value = localStorage.getItem(endpointStorageKey) || '/api/reviews';
  refreshMinutes.value = localStorage.getItem(intervalStorageKey) || '5';
}

apiEndpoint.addEventListener('change', () => {
  localStorage.setItem(endpointStorageKey, apiEndpoint.value.trim());
});

refreshMinutes.addEventListener('change', applyRefreshTimer);
syncNow.addEventListener('click', fetchApiData);
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

bootstrapApiSettings();
populateFilters();
renderApiAvailability();
renderDashboard();
applyRefreshTimer();
fetchApiData();
