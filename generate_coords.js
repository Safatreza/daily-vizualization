/**
 * generate_coords.js
 * ==================
 * Rebuilds coords.json by geocoding every unique PLZ+city combination
 * found in lieferschine.csv via the Nominatim OSM API.
 *
 * Run once after updating the CSV:
 *   node generate_coords.js
 *
 * Output: coords.json  (keys: "PLZ|COUNTRY", values: [lat, lng])
 * The app's normalizePLZ + KUNDEN_COORDS lookup handles the rest.
 *
 * Nominatim policy: max 1 req/sec, valid User-Agent.
 * Runtime: ~1 req per unique PLZ → typically 10–20 min for full CSV.
 */

const fs   = require('fs');
const https = require('https');

// ── Config ───────────────────────────────────────────────────────────────────
const CSV_PATH    = './lieferschine.csv';
const OUTPUT_PATH = './coords.json';
const DELAY_MS    = 1100;   // 1.1 s to stay well under 1 req/s limit
const USER_AGENT  = 'aboutwater-delivery-map/1.0 (internal tool)';

// ── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function nominatimLookup(postalCode, city, countryCode) {
  return new Promise((resolve, reject) => {
    const q   = encodeURIComponent(`${city}`);
    const plz = encodeURIComponent(postalCode);
    const cc  = encodeURIComponent(countryCode.toLowerCase());
    const path = `/search?postalcode=${plz}&city=${q}&countrycodes=${cc}&format=json&limit=1&addressdetails=0`;
    const opts = {
      hostname: 'nominatim.openstreetmap.org',
      path,
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'de' },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json[0]) {
            resolve([parseFloat(json[0].lat), parseFloat(json[0].lon)]);
          } else {
            // Retry without city name (PLZ-only lookup)
            const path2 = `/search?postalcode=${plz}&countrycodes=${cc}&format=json&limit=1`;
            const req2 = https.request({ ...opts, path: path2 }, res2 => {
              let d2 = '';
              res2.on('data', c => d2 += c);
              res2.on('end', () => {
                try {
                  const j2 = JSON.parse(d2);
                  resolve(j2 && j2[0] ? [parseFloat(j2[0].lat), parseFloat(j2[0].lon)] : null);
                } catch { resolve(null); }
              });
            });
            req2.on('error', () => resolve(null));
            req2.end();
          }
        } catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Detect country from PLZ + city ───────────────────────────────────────────
function detectCountry(plz, ort) {
  const ortLower = (ort || '').toLowerCase();
  // Austrian cities
  const atCities = ['wien', 'graz', 'linz', 'salzburg', 'innsbruck', 'klagenfurt',
                    'villach', 'wels', 'st. pölten', 'steyr', 'feldkirch', 'bregenz',
                    'dornbirn', 'leonding', 'klosterneuburg', 'leoben', 'traun'];
  if (atCities.some(c => ortLower.includes(c))) return 'AT';

  // Hungarian cities
  const huCities = ['budapest', 'debrecen', 'miskolc', 'pécs', 'győr', 'nyíregyháza',
                    'kecskemét', 'székesfehérvár', 'szombathely', 'érd', 'sopron'];
  if (huCities.some(c => ortLower.includes(c))) return 'HU';

  // 4-digit PLZ: could be AT/HU/CH
  if (/^\d{4}$/.test(plz)) {
    const n = parseInt(plz, 10);
    if (n >= 1000 && n <= 9999) {
      // CH PLZs are 1xxx-9xxx too — check city for Swiss cities
      const chCities = ['zürich', 'zurich', 'bern', 'basel', 'genf', 'genève',
                        'lausanne', 'luzern', 'winterthur', 'st. gallen'];
      if (chCities.some(c => ortLower.includes(c))) return 'CH';
    }
    return 'AT';  // Best guess for remaining 4-digit codes
  }
  return 'DE';
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Reading CSV:', CSV_PATH);
  const csv = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = csv.split('\n').filter(l => l.trim());

  // Collect unique PLZ+city+country combos
  const seen = new Map();  // key "PLZ|CC" → { plz, city, country }
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(';');
    if (f.length < 12) continue;
    const rawPlz = (f[10] || '').trim();
    const ort    = (f[11] || '').trim();
    if (!rawPlz || !/^\d{4,5}$/.test(rawPlz)) continue;

    // Normalise German leading-zero
    let plz = rawPlz;
    const country = detectCountry(rawPlz, ort);
    if (country === 'DE' && /^\d{4}$/.test(rawPlz)) plz = '0' + rawPlz;

    const key = `${plz}|${country}`;
    if (!seen.has(key)) seen.set(key, { plz, city: ort, country });
  }

  console.log(`Found ${seen.size} unique PLZ+country combinations.`);

  // Load existing output to resume interrupted runs
  let result = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    try { result = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8')); } catch {}
  }

  let done = 0, skipped = 0, failed = 0;
  const entries = [...seen.entries()];

  for (const [key, { plz, city, country }] of entries) {
    if (result[key]) { skipped++; continue; }  // already geocoded

    process.stdout.write(`[${done + skipped + failed + 1}/${entries.length}] ${key} (${city}) ... `);
    await sleep(DELAY_MS);

    try {
      const coords = await nominatimLookup(plz, city, country);
      if (coords) {
        result[key] = coords;
        process.stdout.write(`${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}\n`);
        done++;
      } else {
        process.stdout.write('NOT FOUND\n');
        failed++;
      }
    } catch (err) {
      process.stdout.write(`ERROR: ${err.message}\n`);
      failed++;
    }

    // Save progress every 10 entries so you can resume if interrupted
    if ((done + failed) % 10 === 0) {
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`\nDone. Geocoded: ${done}, skipped (cached): ${skipped}, failed: ${failed}`);
  console.log(`Saved to ${OUTPUT_PATH}`);
}

main().catch(console.error);
