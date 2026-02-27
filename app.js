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

const channelDefaults = [
  { name: 'heureka.cz', country: 'CZ' },
  { name: 'heureka.sk', country: 'SK' },
  { name: 'arukereso', country: 'HU' },
  { name: 'ceneo', country: 'PL' },
  { name: 'compari', country: 'RO' },
  { name: 'trustedshop', country: 'DE' },
  { name: 'idealo.de', country: 'DE' },
  { name: 'idealo.at', country: 'AT' }
];

const storageKey = 'bruderland-channel-registry';

const dateFrom = document.querySelector('#dateFrom');
const dateTo = document.querySelector('#dateTo');
const countryFilter = document.querySelector('#countryFilter');
const channelFilter = document.querySelector('#channelFilter');
const summaryCards = document.querySelector('#summaryCards');
const countryRows = document.querySelector('#countryRows');
const channelRows = document.querySelector('#channelRows');
const resetFilters = document.querySelector('#resetFilters');
const channelForm = document.querySelector('#channelForm');
const channelName = document.querySelector('#channelName');
const channelCountry = document.querySelector('#channelCountry');
const channelRegistry = document.querySelector('#channelRegistry');

function loadRegistry() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return [...channelDefaults];
  try {
    return JSON.parse(saved);
  } catch {
    return [...channelDefaults];
  }
}

let registry = loadRegistry();

function saveRegistry() {
  localStorage.setItem(storageKey, JSON.stringify(registry));
}

function weightedAverage(records) {
  if (records.length === 0) return 0;
  const totals = records.reduce(
    (acc, item) => {
      acc.scoreSum += item.score * item.reviews;
      acc.reviewSum += item.reviews;
      return acc;
    },
    { scoreSum: 0, reviewSum: 0 }
  );
  return totals.reviewSum === 0 ? 0 : totals.scoreSum / totals.reviewSum;
}

function groupBy(records, key) {
  const groups = new Map();
  records.forEach((record) => {
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
  countryFilter.innerHTML = '';
  channelFilter.innerHTML = '';

  createOption(countryFilter, 'ALL', 'Všechny země');
  createOption(channelFilter, 'ALL', 'Všechny kanály');

  const countries = [...new Set(registry.map((entry) => entry.country))].sort();
  const channels = [...new Set(registry.map((entry) => entry.name))].sort();

  countries.forEach((country) => createOption(countryFilter, country, country));
  channels.forEach((channel) => createOption(channelFilter, channel, channel));
}

function renderRegistry() {
  channelRegistry.innerHTML = '';
  registry
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((entry) => {
      const item = document.createElement('li');
      item.textContent = `${entry.name} (${entry.country})`;
      channelRegistry.append(item);
    });
}

function filteredRecords() {
  return baseRecords.filter((record) => {
    if (countryFilter.value !== 'ALL' && record.country !== countryFilter.value) return false;
    if (channelFilter.value !== 'ALL' && record.channel !== channelFilter.value) return false;
    if (dateFrom.value && record.date < dateFrom.value) return false;
    if (dateTo.value && record.date > dateTo.value) return false;
    return true;
  });
}

function renderSummary(records) {
  const avg = weightedAverage(records);
  const totalReviews = records.reduce((sum, item) => sum + item.reviews, 0);
  const countries = new Set(records.map((r) => r.country)).size;
  const channels = new Set(records.map((r) => r.channel)).size;

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

function renderTable(rowsNode, rows, label) {
  rowsNode.innerHTML = '';
  if (rows.length === 0) {
    rowsNode.innerHTML = `<tr><td colspan="3">Žádná data pro zvolené filtry.</td></tr>`;
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

function renderDashboard() {
  const records = filteredRecords();
  renderSummary(records);
  renderTable(countryRows, groupBy(records, 'country'), 'Země');
  renderTable(channelRows, groupBy(records, 'channel'), 'Kanál');
}

function resetAllFilters() {
  dateFrom.value = '';
  dateTo.value = '';
  countryFilter.value = 'ALL';
  channelFilter.value = 'ALL';
  renderDashboard();
}

[channelFilter, countryFilter, dateFrom, dateTo].forEach((el) => {
  el.addEventListener('change', renderDashboard);
});

resetFilters.addEventListener('click', resetAllFilters);

channelForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = channelName.value.trim().toLowerCase();
  const country = channelCountry.value.trim().toUpperCase();

  if (!name || !country) return;

  const exists = registry.some((entry) => entry.name === name && entry.country === country);
  if (!exists) {
    registry.push({ name, country });
    saveRegistry();
    populateFilters();
    renderRegistry();
  }

  channelForm.reset();
});

populateFilters();
renderRegistry();
renderDashboard();
