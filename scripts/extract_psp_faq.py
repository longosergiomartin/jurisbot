"""
Extrae el DataFrame limpio de preguntas frecuentes del Régimen Informativo PSP
(Com. "A" 8207) a partir del documento comparativo "Versión original" /
"Versión Nueva", conservando únicamente la Versión Nueva de cada respuesta.

Uso:
    python3 scripts/extract_psp_faq.py
"""
import json
import re
from pathlib import Path

import docx
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "source" / "psp_faq_modelo.docx"
OUT_DIR = ROOT / "data"

SECTION_CODES = {
    "Generales": "GEN",
    "APARTADO A: INFORMACIÓN PARA SUPERVISIÓN": "APDO_A",
    "APARTADO B: INFORMACIÓN ESTADÍSTICA": "APDO_B",
    "APARTADO C: INFORME ESPECIAL DEL AUDITOR EXTERNO": "APDO_C",
}


def clean(s: str) -> str:
    s = s.replace("\xad", "")  # guion suave introducido por Word
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def strip_prefix(s: str, patterns: list[str]) -> str:
    for pat in patterns:
        s = re.sub(pat, "", s, flags=re.IGNORECASE).strip()
    return s


def strip_editorial_notes(s: str) -> str:
    """Elimina anotaciones internas sueltas (p. ej. "RPTA NUEVO RAZONAMIENTO")
    que quedaron en el documento fuente y no forman parte de la respuesta."""
    lines = [
        line
        for line in s.split("\n")
        if not re.match(r"^[A-ZÁÉÍÓÚÑ ]{4,60}$", line.strip())
    ]
    return "\n".join(lines).strip()


def extract() -> pd.DataFrame:
    doc = docx.Document(str(SRC))
    table = doc.tables[0]

    current_section = None
    section_parts: dict[str, list[str]] = {}

    for row in table.rows:
        original = row.cells[0].text.strip()
        nueva = row.cells[1].text.strip()

        # Filas de encabezado de apartado: ambas columnas repiten el mismo texto.
        if original == nueva and original != "" and original.lower() != "versión original":
            current_section = clean(original)
            section_parts.setdefault(current_section, [])
            continue

        # Fila de encabezado "Versión original" / "Versión Nueva".
        if original.lower() == "versión original" or nueva.lower() == "versión nueva":
            continue

        if nueva == "":
            continue

        # Algunas celdas concatenan pregunta y respuesta ("...\n\nRespuesta: ...")
        # en un mismo registro de tabla; se separan para mantener la alternancia
        # pregunta/respuesta.
        parts = re.split(r"\n{1,2}(?=[Rr][Ee][Ss][Pp][Uu][Ee][Ss][Tt][Aa]:)", nueva)
        for part in parts:
            part = clean(part)
            if part:
                section_parts[current_section].append(part)

    records = []
    for section, parts in section_parts.items():
        assert len(parts) % 2 == 0, f"Cantidad impar de partes en el apartado {section}"
        code = SECTION_CODES.get(section, re.sub(r"\W+", "_", section).strip("_").upper())
        pair_num = 0
        for i in range(0, len(parts), 2):
            pair_num += 1
            question = strip_prefix(parts[i], [r"^Pregunta adicional sugerida:\s*"])
            answer = strip_prefix(parts[i + 1], [r"^Respuesta:\s*"])
            answer = strip_editorial_notes(answer)
            records.append(
                {
                    "id": f"{code}_{pair_num:02d}",
                    "apartado": section,
                    "pregunta": question,
                    "respuesta": answer,
                }
            )

    return pd.DataFrame(records)


if __name__ == "__main__":
    df = extract()
    print(df.shape)
    print(df["apartado"].value_counts())

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_DIR / "psp_faq_version_nueva.csv", index=False, encoding="utf-8-sig")
    df.to_json(OUT_DIR / "psp_faq_version_nueva.jsonl", orient="records", lines=True, force_ascii=False)
    with open(OUT_DIR / "psp_faq_version_nueva.json", "w", encoding="utf-8") as f:
        json.dump(df.to_dict(orient="records"), f, ensure_ascii=False, indent=2)
