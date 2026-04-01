#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# update.sh  –  Täglicher Lieferschein-Update für daily-vizualization
# Verwendung: ./update.sh <Pfad-zur-neuen-CSV> <Stichtag DD.MM.YYYY>
# Beispiel:   ./update.sh ~/Downloads/Lieferschine-01-04-2026.csv 01.04.2026
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

usage() {
  echo "Verwendung: $0 <CSV-Datei> <Stichtag DD.MM.YYYY>"
  echo "Beispiel:   $0 ~/Downloads/Lieferschine-01-04-2026.csv 01.04.2026"
  exit 1
}

[ $# -lt 2 ] && usage

NEUE_CSV="$1"
STICHTAG="$2"

# Stichtag-Format validieren (DD.MM.YYYY)
if ! echo "$STICHTAG" | grep -qE '^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$'; then
  echo "Fehler: Stichtag muss im Format DD.MM.YYYY sein (z.B. 01.04.2026)"
  exit 1
fi

if [ ! -f "$NEUE_CSV" ]; then
  echo "Fehler: Datei nicht gefunden: $NEUE_CSV"
  exit 1
fi

SKRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATUM_DIR="$SKRIPT_DIR/$STICHTAG"

echo "──────────────────────────────────────"
echo "  aboutwater Lieferschein-Update"
echo "  Stichtag: $STICHTAG"
echo "──────────────────────────────────────"

# 1. Datum-Backup-Ordner anlegen
mkdir -p "$DATUM_DIR"
cp "$NEUE_CSV" "$DATUM_DIR/lieferschine.csv"
echo "✓ Backup → $DATUM_DIR/lieferschine.csv"

# 2. Hauptdatei ersetzen
cp "$NEUE_CSV" "$SKRIPT_DIR/lieferschine.csv"
echo "✓ lieferschine.csv aktualisiert"

# 3. Zeilen- und Datums-Info anzeigen
ZEILEN=$(wc -l < "$SKRIPT_DIR/lieferschine.csv")
echo "  Einträge: ~$ZEILEN Zeilen"

# 4. Git commit + push
cd "$SKRIPT_DIR"
git add lieferschine.csv "$DATUM_DIR/lieferschine.csv"
git commit -m "Lieferscheine 01.01.–${STICHTAG}"
git push

echo ""
echo "✓ Deployed. Vercel baut automatisch innerhalb ~30 Sek."
echo "  → https://daily-vizualization.vercel.app"
