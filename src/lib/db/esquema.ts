/** Esquema SQLite y datos iniciales (idéntico a ContaWinPy db/esquema.py). */

export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS empresa (
    id           INTEGER PRIMARY KEY,
    rut          TEXT NOT NULL UNIQUE,
    razon_social TEXT NOT NULL DEFAULT '',
    giro         TEXT NOT NULL DEFAULT '',
    direccion    TEXT NOT NULL DEFAULT '',
    ciudad       TEXT NOT NULL DEFAULT '',
    rep_legal    TEXT NOT NULL DEFAULT '',
    sucursal     TEXT NOT NULL DEFAULT '',
    honorarios   INTEGER NOT NULL DEFAULT 0,
    directorio   TEXT NOT NULL DEFAULT '',
    impuestos    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS periodo (
    id         INTEGER PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    ano        INTEGER NOT NULL,
    UNIQUE (empresa_id, ano)
);

CREATE TABLE IF NOT EXISTS cuenta (
    empresa_id INTEGER NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    codigo     TEXT NOT NULL,
    nombre     TEXT NOT NULL DEFAULT '',
    cdocum     INTEGER NOT NULL DEFAULT 0,      -- 1 = pide documento de compra
    PRIMARY KEY (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS ccosto (
    empresa_id INTEGER NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    codigo     TEXT NOT NULL,
    nombre     TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS proveedor (
    empresa_id INTEGER NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    rut        TEXT NOT NULL,
    nombre     TEXT NOT NULL DEFAULT '',
    direccion  TEXT NOT NULL DEFAULT '',
    ciudad     TEXT NOT NULL DEFAULT '',
    giro       TEXT NOT NULL DEFAULT '',
    telefono   TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (empresa_id, rut)
);

CREATE TABLE IF NOT EXISTS asiento (
    id         INTEGER PRIMARY KEY,
    periodo_id INTEGER NOT NULL REFERENCES periodo(id) ON DELETE CASCADE,
    numero     INTEGER NOT NULL,
    tipo       TEXT NOT NULL DEFAULT 'T',      -- I Ingreso / E Egreso / T Traspaso
    fecha      TEXT,                           -- ISO aaaa-mm-dd
    glosa      TEXT NOT NULL DEFAULT '',
    debe       INTEGER NOT NULL DEFAULT 0,
    haber      INTEGER NOT NULL DEFAULT 0,
    cdcosto    TEXT NOT NULL DEFAULT '',
    UNIQUE (periodo_id, numero)
);
CREATE INDEX IF NOT EXISTS ix_asiento_fecha ON asiento(periodo_id, fecha, numero);
CREATE INDEX IF NOT EXISTS ix_asiento_tipo  ON asiento(periodo_id, tipo, fecha, numero);

CREATE TABLE IF NOT EXISTS detalle (
    id         INTEGER PRIMARY KEY,
    asiento_id INTEGER NOT NULL REFERENCES asiento(id) ON DELETE CASCADE,
    linea      INTEGER NOT NULL DEFAULT 0,
    codigo     TEXT NOT NULL,
    debe       INTEGER NOT NULL DEFAULT 0,
    haber      INTEGER NOT NULL DEFAULT 0,
    fecha      TEXT
);
CREATE INDEX IF NOT EXISTS ix_detalle_asiento ON detalle(asiento_id, linea);
CREATE INDEX IF NOT EXISTS ix_detalle_codigo  ON detalle(codigo, fecha);

CREATE TABLE IF NOT EXISTS compra (
    id          INTEGER PRIMARY KEY,
    detalle_id  INTEGER NOT NULL UNIQUE REFERENCES detalle(id) ON DELETE CASCADE,
    tdocum      INTEGER NOT NULL DEFAULT 1,
    fecha_doc   TEXT,
    numero_doc  INTEGER NOT NULL DEFAULT 0,
    rut_prov    TEXT NOT NULL DEFAULT '',
    neto        INTEGER NOT NULL DEFAULT 0,
    iva         INTEGER NOT NULL DEFAULT 0,
    adicional   INTEGER NOT NULL DEFAULT 0,
    total       INTEGER NOT NULL DEFAULT 0,
    cdcosto     TEXT NOT NULL DEFAULT '',
    detalle     TEXT NOT NULL DEFAULT '',
    fecha_pago  TEXT
);

CREATE TABLE IF NOT EXISTS usuario (
    usuario    TEXT PRIMARY KEY,
    nombre     TEXT NOT NULL DEFAULT '',
    clave_hash TEXT NOT NULL,
    nivel      TEXT NOT NULL DEFAULT '0000100000',
    es_admin   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS parametro (
    clave TEXT PRIMARY KEY,
    valor TEXT
);
`;

// Usuarios que el original tenía "fijos" en el código (BrowUsuar en CONTAB.PRG).
// Aquí se crean como usuarios normales para que se puedan cambiar o borrar.
export const USUARIOS_INICIALES: ReadonlyArray<readonly [string, string, string, boolean]> = [
  ["ADMIN", "ADMINISTRADOR", "ADMIN", true],
  ["CAC", "CLAUDIO COFRE V", "CAC", true],
  ["CONTA", "CONTABILIDAD", "CONTA", false],
];

/**
 * Borrado en cascada con triggers (solo en la versión web). Con Turso cada consulta remota va por su propia
 * conexión y `PRAGMA foreign_keys` no se mantiene, así que los ON DELETE CASCADE del esquema no siempre se
 * aplican; estos triggers hacen lo mismo siempre. Si las claves foráneas sí están activas no hacen nada extra.
 */
export const CASCADAS = `
CREATE TRIGGER IF NOT EXISTS cascada_empresa AFTER DELETE ON empresa BEGIN
    DELETE FROM periodo   WHERE empresa_id=OLD.id;
    DELETE FROM cuenta    WHERE empresa_id=OLD.id;
    DELETE FROM ccosto    WHERE empresa_id=OLD.id;
    DELETE FROM proveedor WHERE empresa_id=OLD.id;
END;
CREATE TRIGGER IF NOT EXISTS cascada_periodo AFTER DELETE ON periodo BEGIN
    DELETE FROM asiento WHERE periodo_id=OLD.id;
END;
CREATE TRIGGER IF NOT EXISTS cascada_asiento AFTER DELETE ON asiento BEGIN
    DELETE FROM detalle WHERE asiento_id=OLD.id;
END;
CREATE TRIGGER IF NOT EXISTS cascada_detalle AFTER DELETE ON detalle BEGIN
    DELETE FROM compra WHERE detalle_id=OLD.id;
END;
`;

/** Tablas en orden de dependencia (para copiar la base completa: respaldo y traspaso a Turso). */
export const TABLAS = ["empresa", "periodo", "cuenta", "ccosto", "proveedor", "asiento", "detalle", "compra",
  "usuario", "parametro"] as const;
