/** Conexión SQLite: base sobre la que se montan los repositorios (db/base.py). */
import fs from "node:fs";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { SCHEMA, USUARIOS_INICIALES } from "./esquema";
import { hashClave } from "./seguridad";

export type Params = unknown[] | Record<string, unknown>;

/** Convierte valores JS a lo que SQLite acepta (booleanos como 0/1, igual que int(bool) en Python). */
function normalizar(p: Params): unknown[] | Record<string, unknown> {
  const conv = (v: unknown) => (typeof v === "boolean" ? (v ? 1 : 0) : v === undefined ? null : v);
  if (Array.isArray(p)) return p.map(conv);
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, conv(v)]));
}

export class BaseDatos {
  readonly ruta: string;
  readonly con: BetterSqlite3.Database;
  private profundidad = 0;

  constructor(ruta: string) {
    this.ruta = ruta;
    const nuevo = ruta === ":memory:" || !fs.existsSync(ruta);
    if (ruta !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(ruta)), { recursive: true });
    this.con = new BetterSqlite3(ruta);
    this.con.pragma("foreign_keys = ON");
    this.con.exec(SCHEMA);
    if (nuevo || !this.con.prepare("SELECT 1 FROM usuario LIMIT 1").get()) {
      const ins = this.con.prepare(
        "INSERT OR IGNORE INTO usuario(usuario,nombre,clave_hash,es_admin) VALUES (?,?,?,?)");
      for (const [u, n, c, a] of USUARIOS_INICIALES) ins.run(u, n, hashClave(c), a ? 1 : 0);
    }
  }

  close() {
    this.con.close();
  }

  /** with self.transaccion() as c: ... — confirma al terminar, deshace si hay error. */
  transaccion<T>(fn: (c: this) => T): T {
    if (this.profundidad > 0) return fn(this);           // ya dentro de una transacción
    this.profundidad++;
    try {
      return this.con.transaction(() => fn(this))();
    } finally {
      this.profundidad--;
    }
  }

  /** Ejecuta una instrucción; devuelve el id insertado (cursor.lastrowid). */
  execute(sql: string, params: Params = []): number {
    const r = this.con.prepare(sql).run(normalizar(params) as never);
    return Number(r.lastInsertRowid);
  }

  q<T = Record<string, unknown>>(sql: string, params: Params = []): T[] {
    return this.con.prepare(sql).all(normalizar(params) as never) as T[];
  }

  q1<T = Record<string, unknown>>(sql: string, params: Params = []): T | undefined {
    return this.con.prepare(sql).get(normalizar(params) as never) as T | undefined;
  }

  /** Copia consistente de la base (opción Útiles > Respaldar). */
  async respaldar(destino: string): Promise<string> {
    await this.con.backup(destino);
    return destino;
  }
}
