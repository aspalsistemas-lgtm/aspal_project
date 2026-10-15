/**
 * Qué direcciones de correo admite la plataforma (auditoría del 3b, M1).
 *
 * Una lista **cerrada**, no «cualquier ASCII imprimible»: nodemailer (y otros) interpretan
 * comentarios `victima(1)@…`, grupos `x:victima@…` o un punto final, y entregarían todos
 * al mismo buzón que `victima@…` esquivando el cupo por destinatario y la comprobación de
 * «ya tiene cuenta». Aquí solo pasa `usuario@dominio.tld` en minúsculas con caracteres
 * corrientes, sin puntos finales ni consecutivos.
 */
const USUARIO = /^[a-z0-9](?:[a-z0-9._%+'-]{0,62}[a-z0-9_'+-])?$/;
const ETIQUETA = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^[a-z0-9-]{2,63}$/;

export function esDireccionSegura(direccion: string): boolean {
  if (direccion.length < 3 || direccion.length > 254) return false;
  const partes = direccion.split("@");
  if (partes.length !== 2) return false;
  const [usuario = "", dominio = ""] = partes;
  if (!USUARIO.test(usuario) || usuario.includes("..")) return false;
  const etiquetas = dominio.split(".");
  if (etiquetas.length < 2) return false;
  const tld = etiquetas[etiquetas.length - 1]!;
  return TLD.test(tld) && etiquetas.slice(0, -1).every((e) => ETIQUETA.test(e));
}
