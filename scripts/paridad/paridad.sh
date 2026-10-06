#!/bin/bash
# Compara, sobre una COPIA de la base, todos los informes y reglas de ContaWinPy (Python) con esta versión.
# Uso (desde contawin-web):  bash scripts/paridad/paridad.sh [ruta/contawin.db]
set -e
DB="${1:-../datos/contawin.db}"
TMP="$(mktemp -d)"
python3 scripts/paridad/dump_py.py "$DB" "$TMP/py.db" "$TMP/py.json"
npx tsx scripts/paridad/dump_ts.ts "$DB" "$TMP/ts.db" "$TMP/ts.json"
python3 scripts/paridad/comparar.py "$TMP/py.json" "$TMP/ts.json"
rm -rf "$TMP"
