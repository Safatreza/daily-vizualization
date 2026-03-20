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
├── index.html              # Hauptdatei – Karte, lädt lieferschine.csv dynamisch
├── Logo.png                # Offizielles aboutwater-Logo (Quelle: Map-vizualization-Repo)
├── lieferschine.csv        # Kumulativer Lieferschein-Export (alle Daten seit 01.01.2026)
├── coords.json             # PLZ → Koordinaten-Lookup (29 KB, einmalig gecacht)
├── aboutwater-styles.css   # Aboutwater Design-System (Referenz, nicht direkt eingebunden)
└── CLAUDE.md               # Diese Datei
```

## CSV-Format
Die `lieferschine.csv` ist ein **kumulativer Export** aus dem ERP-System. Jeder neue Export enthält alle vorherigen Daten plus die neu hinzugekommenen Tage (n+1 enthält n).

**Header:**
```
Lagerkürzel;Auftragsnummer;LS-Nr.;geprüft j/n;Lieferdatum;Bearbeiter;Kundennummer;Kundenkürzel;L.-Name 1;L.-Straße;L.-PLZ;L.-Ort;;;
```
**Datumsformat:** `DD.MM.YYYY` (z.B. `19.03.2026`)

## Workflow: CSV aktualisieren

### 1. Neuen Export bereitstellen
Aus dem ERP einen neuen kumulativen Export herunterladen (z.B. `Lieferschine-DD-MM-YYYY.csv`). Dieser enthält automatisch alle vorherigen Daten plus neue Tage.

### 2. Alten Export löschen, neuen als Hauptdatei setzen
```bash
# Alten datierten Export löschen (er ist bereits im neuen enthalten)
rm lieferschine-ALT-DATUM.csv

# Neuen Export als lieferschine.csv übernehmen
cp Lieferschine-DD-MM-YYYY.csv lieferschine.csv
rm Lieferschine-DD-MM-YYYY.csv
```
Die App lädt `lieferschine.csv` automatisch und zeigt alle verfügbaren Daten mit Datumsnavigation.

### 3. Deployen
```bash
git add lieferschine.csv
git commit -m "Lieferscheine bis DD.MM.YYYY"
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
- **Dynamische CSV:** `index.html` lädt `lieferschine.csv` per `fetch()` zur Laufzeit. Alle verfügbaren Daten werden automatisch erkannt; die Datumsnavigation wird aus den vorhandenen Einträgen generiert.
- **Marker-Jitter:** Lieferungen an dieselbe PLZ bekommen einen minimalen Zufalls-Versatz (~400m), damit überlagerte Marker sichtbar bleiben.

## Referenz-Repo
Design-System und Logo stammen aus: `https://github.com/Safatreza/Map-vizualization`
