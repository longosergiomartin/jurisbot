"""
Convierte el Texto Ordenado del Régimen Informativo PSP que ofrecen Cuentas de
Pago (Com. "A" 8284, archivo data/source/tripsp_texto_ordenado.pdf) en una base
de conocimiento estructurada, para que el agente pueda consultar por sección,
código de partida o término de glosario en lugar de releer el PDF completo en
cada consulta.

El contenido se transcribió a mano a partir del texto extraído del PDF
(pdftotext -layout) porque es un documento normativo corto (14 páginas) con
tablas de layout irregular: la transcripción manual es más confiable que un
parser genérico de tablas para este caso.

Salidas (en data/):
    tripsp_normativa.json        Documento completo, jerárquico (secciones/subsecciones).
    tripsp_partidas.csv/.json    Tabla plana: un registro por código de partida.
    tripsp_glosario.csv/.json    Tabla plana: un registro por término definido.

Uso:
    python3 scripts/build_tripsp_kb.py
"""
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data"

DOCUMENTO = {
    "titulo": "Régimen Informativo Proveedores de Servicios de Pago que ofrecen Cuentas de Pago",
    "comunicacion_base": "Com. \"A\" 8284",
    "fuente": "data/source/tripsp_texto_ordenado.pdf",
    "nota": (
        "Texto ordenado: cada sección/subsección tiene su propia fecha de "
        "vigencia y comunicación de origen, ya que se actualizan de forma "
        "independiente. El PDF fuente incluye al final un bloque duplicado "
        "del Apartado C bajo la numeración antigua 'SECCIÓN VI' "
        "(Com. \"A\" 7972, 31/03/2024), superseded por la SECCIÓN IV vigente; "
        "ese bloque no se incorporó a esta base de conocimiento."
    ),
}

SECCIONES = {
    "I": {
        "titulo": "Instrucciones generales",
        "vigencia": {"version": "6a.", "comunicacion": "A 8284", "fecha": "01/07/2025"},
        "texto": (
            "El vencimiento para la presentación de las informaciones comprendidas en los "
            "Apartados A y B operará -para todos los proveedores de servicios de pago que "
            "ofrecen cuentas de pago (PSPCP)- el día 22 del mes siguiente al mes al que "
            "corresponden los datos (o día hábil inmediato posterior), mientras que el "
            "vencimiento para la presentación del Apartado C operará el día 20 del mes "
            "subsiguiente a la finalización de cada trimestre calendario.\n\n"
            "El primer periodo para el que deberán presentar información -mes para el caso "
            "de los Apartados A y B, trimestre calendario para el Apartado C- será aquel en "
            "que la Superintendencia de Entidades Financieras y Cambiarias haya emitido el "
            "certificado de inscripción en el \"Registro de proveedores de servicios de pago\".\n\n"
            "Los importes se registrarán en miles de pesos, sin decimales. A los fines del "
            "redondeo de las magnitudes se incrementarán los valores en una unidad cuando el "
            "primer digito de las fracciones sea igual o mayor que 5, desechando las que "
            "resulten inferiores.\n\n"
            "La información se presentará de acuerdo con lo establecido en las normas sobre "
            "\"Presentación de informaciones al Banco Central de la República Argentina\"."
        ),
    },
    "II": {
        "titulo": "APARTADO A: Información para supervisión",
        "subsecciones": {
            "II.1": {
                "titulo": "Instrucciones particulares",
                "vigencia": {"version": "4a.", "comunicacion": "A 8284", "fecha": "01/07/2025"},
                "texto": (
                    "Respecto de cada uno de los días del mes bajo informe, se deberán "
                    "integrar los datos que se detallan en el presente Apartado. Asimismo, "
                    "los inventarios de clientes, los extractos bancarios y toda "
                    "documentación respaldatoria de la información solicitada sobre las "
                    "cuentas de pago y los fondos comunes de dinero, deberán mantenerse a "
                    "disposición del B.C.R.A.\n\n"
                    "a. Cuentas de pago de clientes\n"
                    "a.1. Saldo correspondiente a los fondos acreditados en cuentas de pago "
                    "de los clientes.\n"
                    "a.2. Cantidad de cuentas de pago que cuenten con saldo de los clientes.\n"
                    "a.3. Cantidad total de cuentas de pago de los clientes.\n"
                    "a.4. Por cada entidad financiera en la que se encuentren acreditados "
                    "fondos de cuentas de pago de clientes, se deberá informar: Clave "
                    "Bancaria Uniforme (CBU) y Saldo en cuenta a la vista.\n\n"
                    "b. Saldos invertidos en fondos comunes de dinero informados a los clientes\n"
                    "b.1. Saldo de clientes invertidos en fondos comunes de dinero.\n"
                    "b.2. Cantidad de clientes con inversiones en fondos comunes de dinero.\n"
                    "b.3. Por cada fondo común de dinero en el que se encuentren invertidos "
                    "fondos de clientes, se deberá informar: número de registro del fondo "
                    "(CNV), denominación o razón social del fondo, saldo del fondo "
                    "correspondiente a fondos de clientes del PSPCP, tipo de Agente (I. "
                    "Agente de Administración de Productos de Inversión Colectiva o "
                    "Sociedad Gerente; II. Agente de Custodia de Productos de Inversión "
                    "Colectiva o Sociedad Depositaria; III. Agente de Colocación y "
                    "Distribución), denominación o razón social del Agente y CUIT del Agente.\n\n"
                    "c. Saldos a liquidar\n"
                    "c.1. Saldo pendiente de acreditación en cuentas de pago de los clientes.\n"
                    "c.2. Cantidad de cuentas de pago que cuenten con saldo pendiente de "
                    "liquidación.\n"
                    "Corresponde a aquellos saldos que se encuentren pendientes de ser "
                    "acreditados en las cuentas de pago de los clientes, tal el caso de las "
                    "ventas realizadas por comercios cuyos cobros se efectúen utilizando un "
                    "medio de pago que no resulte en la acreditación inmediata de los fondos "
                    "(por ejemplo, tarjeta de crédito), en razón de haberse pactado con el "
                    "PSPCP -y en función de la normativa de fondo vigente- un determinado "
                    "plazo para su efectiva liquidación en la cuenta de pago."
                ),
            },
            "II.2": {
                "titulo": "Modelo de información",
                "vigencia": {"version": "4a.", "comunicacion": "A 8284", "fecha": "01/07/2025"},
                "nota": (
                    "El sufijo 'dd' en los códigos de partida corresponde al día del mes "
                    "bajo informe, ya que la información del Apartado A se integra "
                    "diariamente (ver II.1)."
                ),
                "grupos": [
                    {
                        "grupo": "Cuentas de pago de clientes",
                        "partidas": [
                            {"codigo": "10000dd", "concepto": "Sumatoria de saldos de cuentas de pago de clientes", "campos": ["Saldo", "Cantidad"]},
                            {"codigo": "50000dd", "concepto": "Cantidad total de cuentas de pago de los clientes", "campos": ["Cantidad"]},
                            {"codigo": "20000dd", "concepto": "Saldos en cuentas a la vista por entidad financiera", "campos": ["Saldo", "CBU/Nro registro del Fondo"]},
                        ],
                    },
                    {
                        "grupo": "Inversiones en fondos comunes de dinero",
                        "partidas": [
                            {"codigo": "30000dd", "concepto": "Sumatoria de saldos invertidos en fondos comunes de dinero", "campos": ["Saldo", "Cantidad"]},
                            {"codigo": "40000dd", "concepto": "Saldos invertidos por fondo común de dinero", "campos": ["Saldo", "Cantidad", "CBU/Nro registro del Fondo"]},
                        ],
                    },
                    {
                        "grupo": None,
                        "partidas": [
                            {"codigo": "60000dd", "concepto": "Sumatoria de saldos a liquidar en cuentas de pago", "campos": ["Saldo", "Cantidad"]},
                        ],
                    },
                ],
            },
        },
    },
    "III": {
        "titulo": "APARTADO B: Información estadística – Sistema Nacional de Pagos",
        "subsecciones": {
            "III.1": {
                "titulo": "Instrucciones particulares",
                "vigencia": {"version": "3a.", "comunicacion": "A 8284", "fecha": "01/07/2025"},
                "texto": (
                    "Se deberán integrar los siguientes datos agrupados en forma mensual de "
                    "acuerdo con los atributos detallados en los puntos a, b y d del presente "
                    "apartado y según el \"Modelo de información\" del punto III.2.: "
                    "1. Cantidad de operaciones; 2. Monto total. Asimismo, se deberán "
                    "integrar las cantidades respecto de los datos adicionales detallados en "
                    "el punto c.\n\n"
                    "a. Para todas las transacciones realizadas\n"
                    "Se clasificarán en función de si corresponden a créditos y/o débitos "
                    "realizados por el PSPCP, el tipo de cuenta a acreditar, el tipo de "
                    "titular (cuando se refieran a \"Cuenta de pago propia\") y el método de "
                    "iniciación, según el detalle de partidas incluido en el \"Modelo de "
                    "información\" del punto III.2. A su vez, cada una esas partidas se "
                    "agruparán de acuerdo con el medio de pago y el esquema de pago "
                    "correspondientes a las Tablas 1 y 2, respectivamente, detalladas en el "
                    "punto III.3.\n"
                    "Se deberán informar las transacciones en el momento en que fueron "
                    "liquidadas independientemente de su fecha de concertación.\n"
                    "Los créditos y/o débitos se informarán cuando haya afectación de una "
                    "cuenta de pago de los clientes del PSPCP. Esto incluye los movimientos "
                    "de los fondos que se invierten y se rescatan, así como los intereses "
                    "obtenidos.\n"
                    "Los créditos se deberán informar netos de comisiones e impuestos. Solo "
                    "deben informarse los montos efectivamente ingresados en las cuentas de "
                    "pago de los clientes.\n"
                    "En el caso de los débitos, se deberán informar los montos efectivamente "
                    "egresados de las cuentas de pago de los clientes.\n\n"
                    "b. Para las transferencias\n"
                    "Se clasificarán en función del detalle de partidas incluido en el "
                    "\"Modelo de información\" del punto III.2. según correspondan a: "
                    "b.1. De CVU a CBU; b.2. De CBU a CVU; b.3. De CVU a CVU enviadas; "
                    "b.4. De CVU a CVU recibidas.\n"
                    "La información incluida en el presente punto (partidas 500X000 de "
                    "Transferencias) también deberá ser reportada en forma desagregada "
                    "dentro de las partidas 10XXXXX (créditos) y 20XXXXX (débitos), según "
                    "corresponda, y de acuerdo con las tablas 1 \"Medios de pago\" "
                    "(transferencias inmediatas \"push\" o \"pull\") y 2 \"Esquemas de pago\" "
                    "(transferencias bancarias desde/hacia CBU o CVU).\n"
                    "Debe ser completado con las transferencias que se realicen a través de "
                    "la CVU y no son administradas por el PSPCP. Es decir, quedan excluidas "
                    "del presente punto todas aquellas otras transferencias realizadas "
                    "mediante algún esquema propio del PSPCP que no hubieran sido cursadas a "
                    "través de una CVU, por ejemplo: número de teléfono, correo electrónico, "
                    "etc. Las transferencias efectuadas mediante esquemas de pago propio "
                    "deben ser incluidas en las partidas 10XXXXX (créditos) y 20XXXXX "
                    "(débitos), según corresponda, como transferencias \"push\" / \"pull\".\n\n"
                    "c. Información adicional sobre clientes y cuentas (por tipo de titular)\n"
                    "c.1. Cantidad total de clientes involucrados en los puntos a y b del "
                    "presente Apartado, desagregados por uso comercial o personal/no "
                    "comercial.\n"
                    "c.2. Cantidad total de cuentas de pago involucradas en los puntos a y b "
                    "del presente Apartado, desagregadas por uso comercial o personal/no "
                    "comercial.\n"
                    "c.3. Cantidad total de clientes, desagregados por uso comercial o "
                    "personal/no comercial.\n"
                    "c.4. Cantidad total de cuentas de pago, desagregadas por uso comercial "
                    "o personal/no comercial.\n\n"
                    "d. Préstamos\n"
                    "En los casos de aquellos PSPCP que a su vez se encuentren habilitados "
                    "normativamente para el otorgamiento de financiaciones en su carácter de "
                    "proveedores no financieros de crédito, deberán informar los datos de "
                    "los préstamos otorgados y cancelados que se hubieran acreditado o "
                    "debitado -respectivamente- en las cuentas de pago de sus clientes "
                    "durante el mes bajo informe. La información incluida en el presente "
                    "punto (partidas 70XX000 de Préstamos) también deberá ser reportada de "
                    "forma desagregada dentro de las partidas 10XXXXX (créditos) y 20XXXXX "
                    "(débitos) según corresponda y de acuerdo con las tablas 1 (Medios de "
                    "pago) y 2 (Esquemas de pago).\n\n"
                    "e. Control de razonabilidad respecto de los saldos informados en el "
                    "Apartado A\n"
                    "El saldo total de los fondos acreditados en las cuentas de pago de los "
                    "clientes correspondiente al último día del mes bajo informe reportado "
                    "en el Apartado A, debe ser igual al que se haya remitido para el último "
                    "día del mes anterior al bajo informe en dicho Apartado A más la suma de "
                    "los créditos y menos la suma de los débitos del Apartado B "
                    "correspondientes al mes bajo informe."
                ),
            },
            "III.2": {
                "titulo": "Modelo de información",
                "vigencia": {"version": "3a./4a.", "comunicacion": "A 8284", "fecha": "01/07/2025"},
                "nota": (
                    "En los códigos de partida, 'XX' se reemplaza por el tipo de titular: "
                    "10 = personas humanas, 20 = personas jurídicas. Cada partida se "
                    "clasifica además por Medio de pago (Tabla 1) y Esquema de pago (Tabla 2), "
                    "ver III.3."
                ),
                "grupos": [
                    {
                        "grupo": "CREDITOS EN / Cuenta de pago propia – Comercial",
                        "partidas": [
                            {"codigo": "10101XX", "concepto": "ApMovil-Cercanía Sin Contacto"},
                            {"codigo": "10102XX", "concepto": "ApMovil-QR"},
                            {"codigo": "10103XX", "concepto": "ApMovil-Botón de pago"},
                            {"codigo": "10104XX", "concepto": "ApWeb-Botón de pago"},
                            {"codigo": "10105XX", "concepto": "TPV/TPVMovil-Banda magnética"},
                            {"codigo": "10106XX", "concepto": "TPV/TPVMovil-Cercanía Sin Contacto"},
                            {"codigo": "10107XX", "concepto": "TPV/TPVMovil-Chip"},
                            {"codigo": "10108XX", "concepto": "Sucursal/Agente/Comercio"},
                            {"codigo": "10109XX", "concepto": "Cajero automático"},
                            {"codigo": "10199XX", "concepto": "No disponible/No conocida"},
                        ],
                    },
                    {
                        "grupo": "CREDITOS EN / Cuenta de pago propia – Personal/No comercial",
                        "partidas": [
                            {"codigo": "10201XX", "concepto": "ApMovil-Cercanía Sin Contacto"},
                            {"codigo": "10202XX", "concepto": "ApMovil-QR"},
                            {"codigo": "10203XX", "concepto": "ApMovil-Botón de pago"},
                            {"codigo": "10204XX", "concepto": "ApWeb-Botón de pago"},
                            {"codigo": "10205XX", "concepto": "TPV/TPVMovil-Banda magnética"},
                            {"codigo": "10206XX", "concepto": "TPV/TPVMovil-Cercanía Sin Contacto"},
                            {"codigo": "10207XX", "concepto": "TPV/TPVMovil-Chip"},
                            {"codigo": "10208XX", "concepto": "Sucursal/Agente/Comercio"},
                            {"codigo": "10209XX", "concepto": "Cajero automático"},
                            {"codigo": "10299XX", "concepto": "No disponible/No conocida"},
                        ],
                    },
                    {
                        "grupo": "DEBITOS A / Cuenta de pago propia – Comercial",
                        "partidas": [
                            {"codigo": "20101XX", "concepto": "ApMovil-Cercanía Sin Contacto"},
                            {"codigo": "20102XX", "concepto": "ApMovil-QR"},
                            {"codigo": "20103XX", "concepto": "ApMovil-Botón de pago"},
                            {"codigo": "20104XX", "concepto": "ApWeb-Botón de pago"},
                            {"codigo": "20105XX", "concepto": "TPV/TPVMovil-Banda magnética"},
                            {"codigo": "20106XX", "concepto": "TPV/TPVMovil-Cercanía Sin Contacto"},
                            {"codigo": "20107XX", "concepto": "TPV/TPVMovil-Chip"},
                        ],
                    },
                    {
                        "grupo": "DEBITOS A / Cuenta de pago propia – Personal/No comercial",
                        "partidas": [
                            {"codigo": "20201XX", "concepto": "ApMovil-Cercanía Sin Contacto"},
                            {"codigo": "20202XX", "concepto": "ApMovil-QR"},
                            {"codigo": "20203XX", "concepto": "ApMovil-Botón de pago"},
                            {"codigo": "20204XX", "concepto": "ApWeb-Botón de pago"},
                            {"codigo": "20205XX", "concepto": "TPV/TPVMovil-Banda magnética"},
                            {"codigo": "20206XX", "concepto": "TPV/TPVMovil-Cercanía Sin Contacto"},
                            {"codigo": "20207XX", "concepto": "TPV/TPVMovil-Chip"},
                        ],
                    },
                    {
                        "grupo": "DEBITOS A / Cuenta de otro PSPCP",
                        "partidas": [
                            {"codigo": "2030100", "concepto": "ApMovil-Cercanía Sin Contacto"},
                            {"codigo": "2030200", "concepto": "ApMovil-QR"},
                            {"codigo": "2030300", "concepto": "ApMovil-Botón de pago"},
                            {"codigo": "2030400", "concepto": "ApWeb-Botón de pago"},
                            {"codigo": "2030500", "concepto": "TPV/TPVMovil-Banda magnética"},
                            {"codigo": "2030600", "concepto": "TPV/TPVMovil-Cercanía Sin Contacto"},
                            {"codigo": "2030700", "concepto": "TPV/TPVMovil-Chip"},
                        ],
                    },
                    {
                        "grupo": "DEBITOS A / Cuenta de EF",
                        "partidas": [
                            {"codigo": "2040100", "concepto": "ApMovil-Cercanía Sin Contacto"},
                            {"codigo": "2040200", "concepto": "ApMovil-QR"},
                            {"codigo": "2040300", "concepto": "ApMovil-Botón de pago"},
                            {"codigo": "2040400", "concepto": "ApWeb-Botón de pago"},
                            {"codigo": "2040500", "concepto": "TPV/TPVMovil-Banda magnética"},
                            {"codigo": "2040600", "concepto": "TPV/TPVMovil-Cercanía Sin Contacto"},
                            {"codigo": "2040700", "concepto": "TPV/TPVMovil-Chip"},
                        ],
                    },
                    {
                        "grupo": "DEBITOS A / Otros",
                        "partidas": [
                            {"codigo": "2050100", "concepto": "Sucursal/Agente/Comercio"},
                            {"codigo": "2050200", "concepto": "Cajero automático"},
                        ],
                    },
                    {
                        "grupo": "TRANSFERENCIAS",
                        "partidas": [
                            {"codigo": "5001000", "concepto": "De CVU a CBU"},
                            {"codigo": "5002000", "concepto": "De CBU a CVU"},
                            {"codigo": "5003000", "concepto": "De CVU a CVU acreditadas"},
                            {"codigo": "5004000", "concepto": "De CVU a CVU debitadas"},
                        ],
                    },
                    {
                        "grupo": "CLIENTES Y CUENTAS / Total de clientes involucrados en transacciones",
                        "partidas": [
                            {"codigo": "60110XX", "concepto": "Comercial"},
                            {"codigo": "60120XX", "concepto": "Personal/No comercial"},
                        ],
                    },
                    {
                        "grupo": "CLIENTES Y CUENTAS / Total de clientes involucrados en transferencias",
                        "partidas": [
                            {"codigo": "60130XX", "concepto": "Comercial"},
                            {"codigo": "60140XX", "concepto": "Personal/No comercial"},
                        ],
                    },
                    {
                        "grupo": "CLIENTES Y CUENTAS / Total de cuentas de pago involucradas en transacciones",
                        "partidas": [
                            {"codigo": "60210XX", "concepto": "Comercial"},
                            {"codigo": "60220XX", "concepto": "Personal/No comercial"},
                        ],
                    },
                    {
                        "grupo": "CLIENTES Y CUENTAS / Total de cuentas de pago involucradas en transferencias",
                        "partidas": [
                            {"codigo": "60230XX", "concepto": "Comercial"},
                            {"codigo": "60240XX", "concepto": "Personal/No comercial"},
                        ],
                    },
                    {
                        "grupo": "CLIENTES Y CUENTAS / Total de clientes",
                        "partidas": [
                            {"codigo": "60310XX", "concepto": "Comercial"},
                            {"codigo": "60320XX", "concepto": "Personal/No comercial"},
                        ],
                    },
                    {
                        "grupo": "CLIENTES Y CUENTAS / Total de cuentas de pago",
                        "partidas": [
                            {"codigo": "60410XX", "concepto": "Comercial"},
                            {"codigo": "60420XX", "concepto": "Personal/No comercial"},
                        ],
                    },
                    {
                        "grupo": "PRÉSTAMOS",
                        "partidas": [
                            {"codigo": "7011000", "concepto": "Otorgados a clientes"},
                            {"codigo": "7012000", "concepto": "Cancelados por parte de clientes"},
                        ],
                    },
                ],
            },
            "III.3": {
                "titulo": "Tablas complementarias",
                "vigencia": {"version": "2a.", "comunicacion": "A 8284", "fecha": "01/07/2025"},
                "tabla_1_medios_de_pago": [
                    {"codigo": "1", "descripcion": "Tarjeta de crédito"},
                    {"codigo": "2", "descripcion": "Tarjeta de débito"},
                    {"codigo": "3", "descripcion": "Tarjeta prepaga"},
                    {"codigo": "5", "descripcion": "Efectivo"},
                    {"codigo": "6", "descripcion": "Transferencias inmediatas \"push\""},
                    {"codigo": "7", "descripcion": "Transferencias inmediatas \"pull\""},
                    {"codigo": "8", "descripcion": "Pagos con transferencia (PCT)"},
                    {"codigo": "9", "descripcion": "Débito inmediato – Spot"},
                    {"codigo": "10", "descripcion": "Débito inmediato – Recurrente"},
                ],
                "tabla_2_esquemas_de_pago": {
                    "nota": (
                        "De haberse consignado como medio de pago tarjeta de crédito / "
                        "débito / prepaga, se debe integrar el código de marca de la 'Tabla "
                        "marcas de tarjetas' publicada en https://www3.bcra.gob.ar. En los "
                        "demás casos, se completa según:"
                    ),
                    "codigos": [
                        {"codigo": "00007", "descripcion": "Transferencias bancarias desde/hacia CBU"},
                        {"codigo": "00008", "descripcion": "Transferencias bancarias desde/hacia CVU"},
                        {"codigo": "00009", "descripcion": "Esquema de pago propio"},
                    ],
                },
            },
            "III.4": {
                "titulo": "Descripción de conceptos solicitados",
                "vigencia": {"version": "2a.", "comunicacion": "A 8284", "fecha": "01/07/2025"},
                "glosario": {
                    "Método de iniciación/Canal de acceso": [
                        {"termino": "ApMovil-Cercanía Sin Contacto", "definicion": "Método de iniciación donde quien realiza el pago (cliente ordenante) apoya su celular en un lector de NFC (tecnología sin contacto) del comercio (cliente receptor)."},
                        {"termino": "ApMovil-QR", "definicion": "Método de iniciación donde quien realiza el pago (cliente ordenante) escanea con su celular un código QR expuesto por el comercio (cliente receptor)."},
                        {"termino": "ApMovil-Botón de pago", "definicion": "Método de iniciación donde el cliente ordenante realiza el pago o transferencia ingresando a un link/botón dentro de una aplicación móvil."},
                        {"termino": "ApWeb-Botón de pago", "definicion": "Método de iniciación donde el cliente ordenante realiza el pago o transferencia ingresando a un link/botón que se encuentra en un sitio Web."},
                        {"termino": "TPV/TPVMovil-Banda magnética", "definicion": "Método de iniciación donde el pago se realiza leyendo, con una terminal de punto de venta (POS), las credenciales de una tarjeta de pago a través de la banda magnética."},
                        {"termino": "TPV/TPVMovil-Cercanía Sin Contacto", "definicion": "Método de iniciación donde el pago se realiza leyendo, con una terminal de punto de venta (POS), las credenciales de una tarjeta de pago a través del chip NFC de tecnología sin contacto."},
                        {"termino": "TPV/TPVMovil-Chip", "definicion": "Método de iniciación donde el pago se realiza leyendo, con una terminal de punto de venta (POS), las credenciales de una tarjeta de pago a través del chip EMV."},
                        {"termino": "Sucursal/Agente/Comercio", "definicion": "Canal de acceso utilizado cuando un pago, depósito o extracción se realiza con efectivo en un comercio o agencia de recaudación."},
                        {"termino": "Cajero automático", "definicion": "Canal de acceso utilizado cuando un pago, depósito o extracción se realiza con efectivo a través de un cajero automático."},
                        {"termino": "No disponible/No conocida", "definicion": "Concepto para utilizar en caso de no contar con la información del método de iniciación o canal de acceso de las operaciones."},
                    ],
                    "Cuenta a acreditar": [
                        {"termino": "Cuenta de pago \"comercial\"", "definicion": "Se debe utilizar cuando los movimientos habituales de la cuenta están relacionados con la actividad comercial del cliente (puede ser persona humana o jurídica). El criterio para definir la categoría a partir de la habitualidad es atribución de cada PSPCP."},
                        {"termino": "Cuenta de pago \"personal/no comercial\"", "definicion": "Se debe utilizar cuando los movimientos no se relacionan con actividades comerciales (puede ser persona humana o jurídica)."},
                        {"termino": "Cuenta de otro PSPCP", "definicion": "Se utiliza en el caso de que quien recibe el pago o transferencia acredite sus fondos en una cuenta de pago de otro PSPCP distinto a quien realiza la presentación al RI."},
                        {"termino": "Cuenta de EF", "definicion": "Se utiliza en el caso de que quien recibe el pago o transferencia acredite sus fondos en una cuenta bancaria."},
                        {"termino": "Otros", "definicion": "Se utiliza en el caso de que los fondos no se acreditan en una cuenta, sino que son extraídos en efectivo."},
                    ],
                    "Transferencias": [
                        {"termino": "De CVU a CBU", "definicion": "Transferencias cursadas desde CVU de clientes del PSPCP a cuentas en entidades financieras."},
                        {"termino": "De CBU a CVU", "definicion": "Transferencias recibidas desde cuentas en entidades financieras a CVU de clientes del PSPCP."},
                        {"termino": "De CVU a CVU acreditadas", "definicion": "Transferencias recibidas desde cuentas de pago (de otro PSPCP o del PSPCP que realiza la presentación) a la CVU de clientes del PSPCP."},
                        {"termino": "De CVU a CVU debitadas", "definicion": "Transferencias cursadas desde CVU de clientes del PSPCP a cuentas de pago (de otro PSPCP o del PSPCP que realiza la presentación)."},
                    ],
                    "Medios de pago": [
                        {"termino": "Transferencias inmediatas \"push\"", "definicion": "Envíos de fondos que debitan la cuenta del cliente ordenante y acreditan la cuenta del cliente receptor de forma instantánea."},
                        {"termino": "Transferencias inmediatas \"pull\"", "definicion": "Solicitudes o pedidos de fondos que permiten mediante el débito de la cuenta -a la vista o de pago- del cliente receptor de la solicitud y previa autorización o consentimiento, tanto tácito como explícito, la acreditación inmediata de fondos en la cuenta del cliente solicitante."},
                        {"termino": "Pago con transferencia (PCT)", "definicion": "Transferencias inmediatas utilizadas para realizar un pago por la adquisición de un bien y/o servicio con participación de un aceptador. El aceptador ofrece a los comercios las herramientas para cobrar con ese medio de pago. Los PCT cuentan con reglas comerciales distintas al resto de las transferencias inmediatas."},
                        {"termino": "Débito inmediato (DEBIN)", "definicion": "Transferencia en línea en la cual quien cobra inicia el trámite y quien paga solo debe aceptarlo (con una autorización operación por operación que se denomina \"DEBIN spot\" o con una autorización general para el caso de \"DEBIN recurrente\"); no se informarán como DEBIN las transacciones de fondeo de cuentas propias, que se deben informar como transferencias inmediatas \"pull\"."},
                    ],
                },
            },
        },
    },
    "IV": {
        "titulo": "APARTADO C: Información trimestral",
        "vigencia": {"version": "5a.", "comunicacion": "A 8284", "fecha": "01/07/2025"},
        "texto": (
            "Se deberá remitir un Informe especial de auditor externo que certifique el "
            "cumplimiento de las normas establecidas por el BCRA que resulten aplicables a "
            "los \"Proveedores de servicios de pago que ofrecen cuentas de pago\" y la "
            "integridad de la información contenida en el Apartado A del presente régimen "
            "informativo, con la pertinente certificación por el Consejo Profesional de "
            "Ciencias Económicas en el que se encuentren matriculados.\n\n"
            "Cuando se trate del trimestre finalizado el 31 de diciembre, deberá contener "
            "además la opinión sobre el cumplimiento de las normas sobre \"Protección de los "
            "usuarios de servicios financieros\".\n\n"
            "El informe deberá realizarse conforme al modelo y procedimientos establecidos "
            "en el T.O. \"Informe de Contadores Públicos Independientes sobre el "
            "cumplimiento de las Normas del BCRA por parte de los Proveedores de Servicios "
            "de Pago\"."
        ),
    },
}


def build_partidas_df() -> pd.DataFrame:
    records = []
    for sec in SECCIONES.values():
        for sub_id, sub in sec.get("subsecciones", {}).items():
            for grupo in sub.get("grupos", []):
                for partida in grupo["partidas"]:
                    records.append(
                        {
                            "codigo_partida": partida["codigo"],
                            "apartado": sec["titulo"],
                            "punto": sub_id,
                            "grupo": grupo["grupo"],
                            "concepto": partida["concepto"],
                            "campos": ", ".join(partida.get("campos", [])) or None,
                        }
                    )
    return pd.DataFrame(records)


def build_glosario_df() -> pd.DataFrame:
    records = []
    glosario = SECCIONES["III"]["subsecciones"]["III.4"]["glosario"]
    for categoria, terminos in glosario.items():
        for t in terminos:
            records.append({"categoria": categoria, "termino": t["termino"], "definicion": t["definicion"]})
    return pd.DataFrame(records)


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(OUT_DIR / "tripsp_normativa.json", "w", encoding="utf-8") as f:
        json.dump({"documento": DOCUMENTO, "secciones": SECCIONES}, f, ensure_ascii=False, indent=2)

    partidas_df = build_partidas_df()
    partidas_df.to_csv(OUT_DIR / "tripsp_partidas.csv", index=False, encoding="utf-8-sig")
    partidas_df.to_json(OUT_DIR / "tripsp_partidas.json", orient="records", force_ascii=False, indent=2)

    glosario_df = build_glosario_df()
    glosario_df.to_csv(OUT_DIR / "tripsp_glosario.csv", index=False, encoding="utf-8-sig")
    glosario_df.to_json(OUT_DIR / "tripsp_glosario.json", orient="records", force_ascii=False, indent=2)

    print(f"Partidas: {len(partidas_df)}")
    print(partidas_df["apartado"].value_counts())
    print(f"\nGlosario: {len(glosario_df)}")
    print(glosario_df["categoria"].value_counts())
