/** Usuarios y acceso (USUARIO.DBF) — db/usuarios.py. */
import { BaseDatos } from "./base";
import { ErrorDatos } from "./errores";
import { hashClave, verificarClave } from "./seguridad";
import type { Usuario, UsuarioPublico } from "./tipos";

export class UsuariosRepo extends BaseDatos {
  usuarios(): UsuarioPublico[] {
    return this.q("SELECT usuario, nombre, nivel, es_admin FROM usuario ORDER BY usuario");
  }

  usuario(usuario: string): Usuario | undefined {
    return this.q1("SELECT * FROM usuario WHERE usuario=?", [usuario.trim().toUpperCase()]);
  }

  login(usuario: string, clave: string): Usuario | null {
    const u = this.usuario(usuario);
    if (u && verificarClave(clave, u.clave_hash)) return u;
    return null;
  }

  guardarUsuario(usuario: string, nombre: string, clave: string | null, esAdmin = false, nuevo = false) {
    usuario = usuario.trim().toUpperCase();
    if (!usuario) throw new ErrorDatos("Debe ingresar el nombre de usuario.");
    if (!nombre.trim()) throw new ErrorDatos("Debe ingresar el nombre.");
    this.transaccion((c) => {
      if (nuevo) {
        if (this.usuario(usuario)) throw new ErrorDatos("Ya existe este nombre de USUARIO.");
        if (!clave) throw new ErrorDatos("Debe ingresar una clave.");
        c.execute("INSERT INTO usuario(usuario,nombre,clave_hash,es_admin) VALUES (?,?,?,?)",
          [usuario, nombre.trim().toUpperCase(), hashClave(clave), esAdmin ? 1 : 0]);
      } else {
        c.execute("UPDATE usuario SET nombre=?, es_admin=? WHERE usuario=?",
          [nombre.trim().toUpperCase(), esAdmin ? 1 : 0, usuario]);
        if (clave) c.execute("UPDATE usuario SET clave_hash=? WHERE usuario=?", [hashClave(clave), usuario]);
      }
    });
  }

  borrarUsuario(usuario: string) {
    const admins = this.q1<{ n: number }>("SELECT COUNT(*) n FROM usuario WHERE es_admin=1 AND usuario<>?", [usuario])!.n;
    const u = this.usuario(usuario);
    if (u && u.es_admin && admins === 0) throw new ErrorDatos("No se puede eliminar el último usuario administrador.");
    this.transaccion((c) => c.execute("DELETE FROM usuario WHERE usuario=?", [usuario]));
  }
}
