# daily-vizualization – Projektübersicht

## Zweck
Tägliche Kartenvisualisierung der aboutwater-Lieferscheine. Deployed via Vercel auf GitHub (`Safatreza/daily-vizualization`). Die Karte zeigt alle Lieferstandorte eines bestimmten Tages als interaktive Leaflet-Karte mit aboutwater-Branding.

## Deployment
- **Hosting:** Vercel (automatisches Re-Deploy bei Push auf `main`)
- **Einstiegspunkt:** `index.html` (muss im Root-Verzeichnis liegen)
- **Repository:** `https://github.com/Safatreza/daily-vizualization`

## Dateistruktur
```
daily-vizualization/
├── index.html              # Hauptdatei – Karte + alle Daten inline
├── Logo.png                # Offizielles aboutwater-Logo (Quelle: Map-vizualization-Repo)
├── lieferschine.csv        # Rohdaten des aktuellen Tages (gefiltert)
├── customers_for_map.json  # Kundenstammdaten mit Geokoordinaten (8.447 Einträge)
├── aboutwater-styles.css   # Aboutwater Design-System (Referenz, nicht direkt eingebunden)
└── CLAUDE.md               # Diese Datei
```

## Workflow: neuen Tag einpflegen

### 1. CSV filtern
Aus der originalen `lieferschine.csv` nur Zeilen des gewünschten Datums behalten:
```bash
head -1 lieferschine.csv > gefiltert.csv
grep "DD.MM.YYYY" lieferschine.csv >> gefiltert.csv
```

### 2. index.html aktualisieren
Drei Stellen in `index.html` anpassen:

**a) Seitentitel & Header** (Zeile ~6, ~100)
```html
<title>Lieferscheine DD.MM.YYYY – aboutwater</title>
<h1>Lieferscheine – DD. Monat YYYY</h1>
```

**b) `LIEFERSCHEINE`-Array** – Einträge aus der gefilterten CSV übertragen. Felder:
```javascript
{ ls, auftrags, lager, geprueft, bearbeiter, kundennr, kunde, strasse, plz, ort, land }
```

**c) `PLZ_COORDS`** – Falls neue Postleitzahlen vorkommen, Koordinaten ergänzen:
```javascript
"NNNNN|DE": {lat: 00.0000, lng: 00.0000},  // Stadtname
```
Koordinaten einmalig über [nominatim.openstreetmap.org](https://nominatim.openstreetmap.org) nachschlagen, dann fest hinterlegen. **Nicht** zur Laufzeit geocodieren – das verlangsamt den Seitenaufruf erheblich.

### 3. Deployen
```bash
git add index.html lieferschine.csv
git commit -m "Lieferscheine DD.MM.YYYY"
git push
```
Vercel deployt automatisch innerhalb ~30 Sekunden.

## Design-Konventionen
- **Sprache:** Benutzeroberfläche vollständig auf Deutsch
- **Font:** ASAP (Google Fonts)
- **Primärfarbe:** `#1c5975` (aboutwater Teal)
- **Logo:** `Logo.png` im Root – per `<img src="Logo.png">` eingebunden, weiß eingefärbt via CSS `filter: brightness(0) invert(1)`
- **Lager-Farben:** Fest definiert in `LAGER_FARBEN` in `index.html` – bei neuem Lager einfach ergänzen

## Lager-Farbpalette
| Lager | Farbe |
|---|---|
| Planegg | `#1c5975` |
| AMW Auersperg | `#667eea` |
| aboutwater Bünde | `#28a745` |
| aboutwater Frankfurt | `#fd7e14` |
| VST Plep | `#764ba2` |
| VST Schörling | `#e83e8c` |
| Kyffhäuser | `#20c997` |
| Emons | `#dc3545` |
| STK Service | `#6f42c1` |
| CJM | `#17a2b8` |
| AQUATRADE Bram | `#f0a500` |
| Gänshirt-Aufmbruch | `#6c757d` |

## Technische Entscheidungen
- **Keine Laufzeit-Geocodierung:** Koordinaten werden einmalig nachgeschlagen und in `PLZ_COORDS` fest hinterlegt. Das vermeidet eine ~60-Sekunden Ladezeit durch Nominatim-Anfragen (1 req/sec Rate-Limit).
- **Kein Build-Schritt:** Reines HTML/JS/CSS – keine npm, kein Bundler. Direkt editierbar und deploybar.
- **Inline-Daten:** Alle Lieferdaten sind direkt in `index.html` eingebettet. Keine separate JSON-Datei nötig.
- **Marker-Jitter:** Lieferungen an dieselbe PLZ bekommen einen minimalen Zufalls-Versatz (~400m), damit überlagerte Marker sichtbar bleiben.

## Referenz-Repo
Design-System und Logo stammen aus: `https://github.com/Safatreza/Map-vizualization`
