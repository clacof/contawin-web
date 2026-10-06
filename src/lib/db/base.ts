/**
 * Conexión a la base: base sobre la que se montan los repositorios (db/base.py).
 *
 * Usa libSQL (`@libsql/client`): un archivo SQLite local (`file:../datos/contawin.db`, el mismo de ContaWinPy)
 * o una base Turso remota (`libsql://…`), que es la que se usa publicado en Vercel. Por eso todo es asíncrono.
 */
import { createClient, type Client, type InArgs, type ResultSet, type Transaction } from "@libsql/client";
import { CASCADAS, SCHEMA, TABLAS, USUARIOS_INICIALES } from "./esquema";
import { hashClave } from "./seguridad";

export type Params = unknown[];

/** Convierte valores JS a lo que SQLite acepta (booleanos como 0/1, igual que int(bool) en Python). */
function normalizar(p: Params): InArgs {
  return p.map((v) => (typeof v === "boolean" ? (v ? 1 : 0) : v === undefined ? null : v)) as InArgs;
}

/** Filas como objetos simples (se pasan tal cual a los componentes de cliente). */
function filas<T>(r: ResultSet): T[] {
  return r.rows.map((f) => Object.fromEntries(r.columns.map((c, i) => [c, f[i]])) as T);
}

type Ejecutor = Pick<Client | Transaction, "execute">;

export class BaseDatos {
  /** URL de la base (se muestra en Acerca de / Respaldar). */
  readonly ruta: string;
  protected cliente: Client;
  /** Donde se ejecutan las consultas: el cliente, o la transacción en curso (ver transaccion). */
  protected ex: Ejecutor;
  protected enTransaccion = false;
  private cola: Promise<unknown> = Promise.resolve();

  constructor(cliente: Client, ruta: string) {
    this.cliente = cliente;
    this.ex = cliente;
    this.ruta = ruta;
  }

  /** Abre la base, crea las tablas si faltan y, si no hay usuarios, los iniciales. */
  static async abrir<T extends BaseDatos>(this: new (cliente: Client, ruta: string) => T, url: string,
    authToken?: string): Promise<T> {
    const db = new this(createClient({ url, authToken }), url);
    await db.cliente.executeMultiple(SCHEMA + CASCADAS);
    if (!(await db.q1("SELECT 1 FROM usuario LIMIT 1"))) {
      for (const [u, n, c, a] of USUARIOS_INICIALES)
        await db.execute("INSERT OR IGNORE INTO usuario(usuario,nombre,clave_hash,es_admin) VALUES (?,?,?,?)",
          [u, n, hashClave(c), a]);
    }
    return db;
  }

  close() {
    this.cliente.close();
  }

  /**
   * with self.transaccion() as c: ... — confirma al terminar, deshace si hay error.
   * Dentro de fn todas las consultas deben ir por `c` (que apunta a la transacción). Las transacciones de
   * una misma conexión se ejecutan de a una, en orden.
   */
  async transaccion<T>(fn: (c: this) => Promise<T>): Promise<T> {
    if (this.enTransaccion) return fn(this);           // ya dentro de una transacción
    const turno = this.cola.then(async () => {
      const tx = await this.cliente.transaction("write");
      const c = Object.create(this) as this;
      c.ex = tx;
      c.enTransaccion = true;
      try {
        const r = await fn(c);
        await tx.commit();
        return r;
      } catch (e) {
        await tx.rollback().catch(() => undefined);
        throw e;
      } finally {
        tx.close();
      }
    });
    this.cola = turno.catch(() => undefined);
    return turno;
  }

  /** Ejecuta una instrucción; devuelve el id insertado (cursor.lastrowid). */
  async execute(sql: string, params: Params = []): Promise<number> {
    const r = await this.ex.execute({ sql, args: normalizar(params) });
    return Number(r.lastInsertRowid ?? 0);
  }

  async q<T = Record<string, unknown>>(sql: string, params: Params = []): Promise<T[]> {
    return filas<T>(await this.ex.execute({ sql, args: normalizar(params) }));
  }

  async q1<T = Record<string, unknown>>(sql: string, params: Params = []): Promise<T | undefined> {
    return (await this.q<T>(sql, params))[0];
  }

  /** Copia completa de la base en un archivo SQLite local (Útiles > Respaldar). */
  async respaldar(destino: string): Promise<string> {
    const otro = createClient({ url: `file:${destino}` });
    try {
      await otro.executeMultiple(SCHEMA + CASCADAS);
      await copiarTablas(this, otro);
    } finally {
      otro.close();
    }
    return destino;
  }
}

/** Copia todas las filas de `origen` en `destino` (que debe tener las tablas creadas y vacías). */
export async function copiarTablas(origen: BaseDatos, destino: Client, progreso?: (t: string) => void) {
  for (const tabla of TABLAS) {
    const datos = await origen.q(`SELECT * FROM ${tabla}`);
    progreso?.(`${tabla}: ${datos.length}`);
    for (let i = 0; i < datos.length; i += 500) {
      const trozo = datos.slice(i, i + 500);
      await destino.batch(trozo.map((f) => {
        const cols = Object.keys(f);
        return { sql: `INSERT INTO ${tabla}(${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
          args: normalizar(Object.values(f)) };
      }), "write");
    }
  }
}
