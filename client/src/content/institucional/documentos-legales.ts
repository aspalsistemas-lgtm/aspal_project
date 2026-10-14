/**
 * Aviso de privacidad y términos del sitio (decisión del 2026-10-14).
 *
 * Copy literal de la página «Política de privacidad» de la comunidad en
 * WordPress (comunidad.asociacionesprofesionales.org/politica-privacidad/,
 * modificada el 2024-11-19), que junta dos documentos: el reglamento de la
 * comunidad va a /terminos y el aviso de privacidad a /aviso-de-privacidad.
 * Solo se quitaron los dobles espacios y el encabezado que pedía aceptar el
 * texto para entrar a la comunidad.
 *
 * PENDIENTE del responsable (no se corrige por cuenta propia, es texto legal):
 * - el correo de los derechos ARCO, «vinculación@anpr.org.mx», lleva tilde y
 *   es del dominio de ANPR; por eso se muestra sin enlace;
 * - los teléfonos no coinciden con el de `lib/marca.ts` (+52 999 163 4080);
 * - el responsable figura como «MEMBRESÍAS Y ASOCIACIONES DE AMÉRICA LATINA»;
 * - no menciona el boletín ni Mailchimp, Google o Stripe.
 */
import type { RutaEstatica } from "@/lib/rutas";

/** Un párrafo, o una lista de elementos. */
export type BloqueLegal = string | { elementos: string[]; ordenada?: boolean };

export interface ApartadoLegal {
  titulo: string;
  bloques: BloqueLegal[];
}

export interface DocumentoLegal {
  ruta: RutaEstatica;
  titulo: string;
  /** Mes y año de la última actualización, si el documento la declara. */
  actualizado?: string;
  /** Lo que va antes del primer apartado. */
  intro: BloqueLegal[];
  apartados: ApartadoLegal[];
}

/**
 * Un correo en medio del texto. Las letras con tilde cuentan como parte de la
 * dirección para que «vinculación@…» no se enlace como «n@…».
 */
export const CORREO =
  /(?<![\p{L}\p{N}._%+-])[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?![\p{L}\p{N}-])/giu;

export interface TrozoTexto {
  texto: string;
  esCorreo: boolean;
}

/** Parte un texto en trozos de texto normal y correos, para enlazar estos. */
export function partirCorreos(texto: string): TrozoTexto[] {
  const trozos: TrozoTexto[] = [];
  let desde = 0;
  for (const coincidencia of texto.matchAll(CORREO)) {
    const inicio = coincidencia.index;
    if (inicio > desde)
      trozos.push({ texto: texto.slice(desde, inicio), esCorreo: false });
    trozos.push({ texto: coincidencia[0], esCorreo: true });
    desde = inicio + coincidencia[0].length;
  }
  if (desde < texto.length || trozos.length === 0) {
    trozos.push({ texto: texto.slice(desde), esCorreo: false });
  }
  return trozos;
}

export const TERMINOS: DocumentoLegal = {
  ruta: "/terminos",
  titulo: "Términos de uso",
  intro: [
    "Gracias por ser parte de nuestra comunidad. Para asegurar la mejor experiencia posible a todos nuestros miembros, hemos establecidos algunas normas básicas de participación.",
    "Al unirse a nuestra comunidad y hacer uso de ella, acepta usted que ha leído y seguirá su reglamento y normativa. También acepta mantener las discusiones y compartir los archivos y contenido que mejor se adapten a nuestro entorno. Este es un gran foro en el cual puede solicitar consejo a sus colegas, aprender de su experiencia y participar en las conversaciones que se lleven a cabo. Las preguntas deben dirigirse a nuestro departamento de servicio al cliente vía el link “Contáctanos” de este sitio.",
    "Por favor tome un momento para familiarizarse con estas importantes reglas. Si tiene alguna duda, contacte al departamento de servicio al cliente. Con el fin de mantener un ambiente que fomente un diálogo fructífero y civilizado, nos reservamos el derecho de suspender o cancelar la membresía a esta comunidad a cualquier persona que viole estas reglas.",
  ],
  apartados: [
    {
      titulo: "Las Reglas",
      bloques: [
        {
          elementos: [
            "Respete a los demás. Centre su atención en el contenido de las publicaciones y no en quien las emite. Por favor, conceda el beneficio de la duda a los nuevos miembros e invitados; no existen las preguntas obvias, incluso una pregunta puede ayudarte a entender de otra manera el tema.",
            "Respete el propósito de esta comunidad. Utilice la comunidad para compartir éxitos, retos, críticas constructivas, preguntas y objetivos en lugar de promover sus productos o servicios. Si ha encontrado un producto o servicio que considera útil, por favor comparta su experiencia con el grupo de una manera respetuosa.",
            "Tenga cuidado cuando comente sobre algún producto. La información que se publica en los grupos de discusión y en las bibliotecas está disponible y a la vista de todos y los comentarios están sujetos a las leyes de difamación, calumnia y antimonopolio.",
            "Queda estrictamente prohibido todo material difamatorio, ofensivo, irrespetuoso, agresivo, insultante o ilegal. No publique nada que no quisiera que viera el mundo o que no quisiera que se sepa que provino de usted.",
            "Respete la propiedad intelectual. Publique contenido propio o que tenga el permiso de utilizar dándole el debido crédito al autor.",
            "Cuando publique artículos en nuestro entorno colaborativo, por favor indique si este puede ser reutilizado. Asimismo, es recomendable contactar al dueño de cualquier material en caso que desee reutilizarlo.",
            "Publique sus mensajes o documentos únicamente en las comunidades apropiadas. Esto asegura que todos los mensajes tengan la mejor acogida al eliminar el “ruido”.",
          ],
        },
      ],
    },
    {
      titulo: "Código de Etiqueta en los Grupos de Discusión",
      bloques: [
        {
          elementos: [
            "Establezca de una manera clara y concisa el tema de sus comentarios en el área de Asunto. Esto permite a los miembros responder mejor a su publicación y facilita la búsqueda de archivos por asunto.",
            "Envíe mensajes de “gracias por la información” o “yo también” individualmente y no a todo el grupo. Haga esto utilizando la liga “Responda al remitente” de cada mensaje.",
            "No envíe mensajes administrativos tales como “elimíneme de la lista” al grupo. Por el contrario, utilice la interfaz de la web para cambiar la configuración o eliminarse de una lista. Si va a cambiar de dirección de correo electrónico, no necesita eliminarse de la lista y volver a unirse con su nuevo correo. Simplemente cambie su configuración.",
          ],
        },
      ],
    },
    {
      titulo: "Asuntos legales",
      bloques: [
        "Este sitio es ofrecido como servicio para los miembros de ASPAL. ASPAL no es responsable de las opiniones e información publicadas en este sitio por otras personas. Renunciamos a todas las garantías con respecto a la información publicada en este sitio, ya sea por ASPAL o por terceros; este deslinde de responsabilidades incluye todas las garantías implícitas de mercadeo y adecuación. En ningún caso ASPAL será responsable por cualquier daño especial, directo, indirecto, en consecuencia o de cualquier tipo como resultado de la pérdida de uso, datos o regalías que surjan de o en conexión con el uso o interpretación de cualquier información publicada en este sitio.",
        "No publique materiales difamatorios, ofensivos, irrespetuosos, agresivos, insultantes o ilegales. No publique ninguna información u otro tipo de material protegido por derechos de autor sin el permiso del propietario. Al publicar cualquier material, quien publica garantiza y representa que es propietario de los derechos de autor con respecto a dicho material o que tiene el permiso del propietario de los derechos. Además, quien publica concede a la ASPAL y a los usuarios de este sitio el derecho no excluyente y el permiso para exponer, copiar, publicar, distribuir, transmitir, imprimir y usar dicha información u otro material.",
        "No se deben publicar mensajes que favorezcan o animen a los miembros a llegar a algún acuerdo que expresa o indirectamente lleven a fijar precios, boicotear negocios de terceros o cualquier otra conducta destinada a restringir ilegalmente el libre intercambio. Son inapropiados los mensajes que fomenten o alienten un acuerdo acerca de los siguientes asuntos: precios, descuentos, términos o condiciones de venta; salarios; ganancias, márgenes de ganancia o datos de costos; cuotas de mercado, áreas de venta o mercados; territorios o asignación de clientes; o selección, rechazo o ruptura con clientes o proveedores.",
        "ASPAL no monitorea activamente el sitio en busca de publicaciones inapropiadas y no asume por si misma el control editorial de las publicaciones. Sin embargo, en el caso de que se haga del conocimiento de ASPAL cualquier publicación inapropiada, tomaremos las acciones pertinentes.",
        "ASPAL se reserva el derecho de negar el acceso a cualquier usuario que no cumpla este reglamento.",
      ],
    },
  ],
};

export const AVISO_PRIVACIDAD: DocumentoLegal = {
  ruta: "/aviso-de-privacidad",
  titulo: "Aviso de privacidad",
  actualizado: "abril de 2024",
  intro: [
    "MEMBRESÍAS Y ASOCIACIONES DE AMÉRICA LATINA en adelante ASPAL, con domicilio en Calle 16 por 5 y 18 #100, Fraccionamiento Montecristo, C.P. 97133 en Mérida, Yucatán, es el responsable del uso y protección de sus datos personales, y al respecto le informamos lo siguiente:",
  ],
  apartados: [
    {
      titulo: "¿Para qué fines utilizaremos sus datos personales?",
      bloques: [
        "Los datos personales que recabamos de usted, los utilizaremos para las siguientes finalidades que son necesarias para el servicio que solicita:",
        {
          elementos: [
            "Personalizar su experiencia en nuestra plataforma (la información recabada nos sirve para atender mejor sus necesidades).",
            "Mejorar nuestra página web (siempre tratamos de mejorar nuestra propuesta de valor de acuerdo a la información y retroalimentación que recibimos de usted).",
            "Para realizar todas las gestiones internas necesarias vinculadas con la relación comercial vigente, incluyendo cuestiones de pagos.",
          ],
        },
        "De manera adicional, utilizaremos su información personal para las siguientes finalidades que no son necesarias para el servicio solicitado, pero que nos permiten y facilitan brindarle una mejor atención:",
        {
          elementos: [
            "Contactarlo y enviarle información relevante sobre nuestros productos y servicios.",
          ],
        },
        "En caso de que no desee que sus datos personales sean tratados para estos fines adicionales, desde este momento usted nos puede comunicar lo anterior mediante el envío de un correo electrónico a la dirección hola@asociacionesprofesionales.org",
        "La negativa para el uso de sus datos personales para estas finalidades no podrá ser un motivo para que le neguemos los servicios y productos que solicita o contrata con nosotros.",
      ],
    },
    {
      titulo: "¿Qué datos personales utilizaremos para estos fines?",
      bloques: [
        "Para llevar a cabo las finalidades descritas en el presente aviso de privacidad, utilizaremos los siguientes datos personales:",
        "1) Datos de identificación: Nombre completo, domicilio, correo electrónico, teléfonos de casa, de trabajo, número de celular, lugar y fecha de nacimiento, edad.",
        "2) Datos laborales: Ocupación, nombre de la empresa, institución o dependencia, puesto, área o departamento, domicilio, teléfono, correo electrónico de trabajo, giro de la empresa, institución o dependencia.",
        "3) Datos Financieros: N° de cuenta bancaria, CLABE, domicilio fiscal, número de tarjeta de crédito o débito, fecha de vencimiento, así como el número de seguridad de la misma y que Usted utilice para adquirir alguno de nuestros servicios, al proporcionar estos datos usted reconoce que está otorgándonos su consentimiento expreso para el tratamiento de estos datos.",
      ],
    },
    {
      titulo: "¿Con quién compartimos su información personal y para qué fines?",
      bloques: [
        "Si usted no manifiesta lo contrario ASPAL requiere transferir sus Datos Personales en la medida que sea necesario para la prestación de nuestros servicios.",
        "Empresas de mensajería, así como a nuestros aliados y Organizaciones de la Sociedad Civil con los que ASPAL mantiene vínculos de trabajo y colaboración y operan bajo los mismos procesos y políticas de respeto a la privacidad. ASPAL se compromete a velar porque se cumplan todos los principios legales de protección en torno a la transferencia de sus datos personales.",
      ],
    },
    {
      titulo: "Limitación en el Uso o Divulgación de los Datos Personales",
      bloques: [
        "Usted puede limitar el uso o divulgación de sus datos personales para dejar de recibir nuestros servicios así como las promociones, ofertas y publicidad respecto de ASPAL llamando al teléfono (52) 99 99 44 40 60",
      ],
    },
    {
      titulo: "Derechos ARCO",
      bloques: [
        "Estos derechos consisten en lo siguiente:",
        {
          ordenada: true,
          elementos: [
            "Acceso.- Implica conocer en todo momento sus datos personales en posesión de ASPAL, así como el Aviso de privacidad correspondiente.",
            "Rectificación.- Si alguno de sus datos es inexacto o incompleto, podrá solicitar su modificación, a nuestra área contable (52) 99 99 44 40 60 ext. 103, adjuntando la documentación que acredite dicha corrección.",
            "Cancelación.- Podrá requerir cuando así lo considere la cancelación de sus datos y, en caso de ser procedente, su información personal entrará en un periodo de bloqueo para proceder posteriormente a su eliminación. Al entrar a dicho periodo, su información ya no podrá ser tratada por ASPAL.",
            "Oposición.- Podrá en todo momento y por causa legítima objetar el tratamiento de sus datos personales. Si su solicitud resulta procedente, ASPAL ya no podrá hacer uso de los mismos.",
          ],
        },
      ],
    },
    {
      titulo: "Procedimiento para ejercer sus Derechos ARCO",
      bloques: [
        "El titular de los Datos Personales, por sí o mediante representante legal, debiendo identificarse o acreditarse correctamente, podrá ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición, así como revocar su consentimiento llamando al número telefónico de nuestra área contable (52) 99 99 44 40 60 ext. 103, o enviado un correo electrónico a vinculación@anpr.org.mx describiendo de manera clara y precisa los datos personales respecto de los que se busca ejercer alguno de estos Derechos. Es importante señalar que en la llamada para ejercer los derechos ARCO usted deberá proporcionar una dirección de correo electrónico y número de teléfono a efecto de que podamos notificarle la respuesta a su solicitud o poder contactarlo en caso de requerir información adicional en relación con su petición. Asimismo, deberá enviarnos copia de su identificación oficial para acreditar su identidad. Por último, le informamos que se le responderá en un plazo máximo de 08 (ocho) días hábiles, contados desde la fecha en que cumpla con todos los requisitos establecidos en la solicitud de acceso, rectificación, cancelación u oposición, si resulta procedente, se hará efectiva dentro de los 08(ocho) días hábiles siguientes a la fecha en que se le comunique respuesta.",
      ],
    },
    {
      titulo: "Cambios al Aviso de Privacidad",
      bloques: [
        "Cualquier cambio significativo o total que se realice al presente Aviso de Privacidad podrá ser realizado por ASPAL y será comunicado a través de nuestra página, o mediante correo electrónico a la dirección del titular que para tales efectos mantenga la Asociación registrada.",
      ],
    },
    {
      titulo: "Departamento de Datos Personales",
      bloques: [
        "Teléfono: Área Contable (52) 99 99 44 40 60 ext. 103.",
        "E-mail: hola@asociacionesprofesionales.org",
      ],
    },
    {
      titulo: "Área Contable",
      bloques: [
        "Teléfono: (52) 99 99 44 40 60 ext.111.",
        "E-mail: facturas@asociacionesprofesionales.org",
      ],
    },
    {
      titulo: "Área de Vinculación",
      bloques: [
        "Teléfono: 999 944 40 60",
        "Ileana Ramírez, Ejecutiva de Vinculación",
        "Correo: hola@asociacionesprofesionales.org",
        "Horario: de Lunes a Viernes de 9:00 A.M. a 17:00 P.M.",
      ],
    },
    {
      titulo: "El uso de tecnologías de rastreo en nuestro portal de Internet",
      bloques: [
        "Le informamos que en nuestra página de Internet utilizamos cookies, web beacons y otras tecnologías a través de las cuales es posible monitorear su comportamiento como usuario de Internet, así como brindarle un mejor servicio y experiencia de usuario al navegar en nuestra página. Al ingresar y continuar con el uso del Sitio de Internet, Usted consiente que ASPAL recabe y trate sus datos personales. El uso de estas tecnologías es necesario por motivos de operación, técnicos y de seguridad. ASPAL tratará sus Datos Personales única y exclusivamente conforme a los términos del presente Aviso de Privacidad que dan origen a la relación entre ASPAL en su carácter de Entidad Responsable y usted como Titular de los datos personales. Usted, al proporcionar sus datos personales, confirma y acepta que ha leído este Aviso de Privacidad y otorga su consentimiento para ajustarse a lo señalado en el mismo.",
      ],
    },
  ],
};
