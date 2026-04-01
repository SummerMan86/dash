#!/usr/bin/env python3
import argparse
import csv
import hashlib
import re
import statistics
import subprocess
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


PROJECT_ROOT_DEFAULT = Path("/home/orl/Shl/КА")
OUTPUT_ROOT_RELATIVE = Path("MS BI/bsc_model")

PDF_EXTENSIONS = {".pdf"}
OFFICE_EXTENSIONS = {".pptx", ".docx"}
SUPPORTED_EXTENSIONS = PDF_EXTENSIONS | OFFICE_EXTENSIONS

WORD_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
SLIDE_NS = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main"}

HORIZON_ORDER = {"LT": 0, "MT": 1, "ST": 2, "OT": 3}

DEPARTMENT_MAP = {
    "01. Технический Директорат (9 of 9)": {"code": "TD", "default_perspective": "OPS"},
    "02. Производственные Директорат (15 of 23)": {"code": "PrD", "default_perspective": "OPS"},
    "03. Коммерческий Директорат (6 of 7)": {"code": "ComD", "default_perspective": "FIN"},
    "04. Директорат Проектно-инвестиционной деятельности (2 of 4)": {"code": "DPID", "default_perspective": "FIN"},
    "05. Управление корпоративных отношений (1 of 4)": {"code": "UKO", "default_perspective": "RISK"},
    "06. Депаратамент Материально-техническое снабжение и организации подрядных работ (1 of 2)": {
        "code": "DMTS",
        "default_perspective": "OPS",
    },
    "07. Финансовый Директорат (3 of 5)": {"code": "FD", "default_perspective": "FIN"},
    "09. Служба Информационных Технологий (4 of 6)": {"code": "IT", "default_perspective": "OPS"},
    "10. Служба Главного инженера (2 of 7)": {"code": "GI", "default_perspective": "RISK"},
    "11. Кадровый директорат (2 of 3)": {"code": "HR", "default_perspective": "PEOPLE"},
    "12. Департамент логистических операций (4 of 6)": {"code": "DLO", "default_perspective": "OPS"},
    "13. Служба устойчивого развития и новаций (2 of 7)": {"code": "SRN", "default_perspective": "RISK"},
    "14. Контрольно-ревизионное управление (1 of 1)": {"code": "KRU", "default_perspective": "RISK"},
    "16. ДПО (1 of 1)": {"code": "DPO", "default_perspective": "OPS"},
    "17. ДЭиРИ (1 of 1)": {"code": "DERI", "default_perspective": "RISK"},
    "18. ОАП (1 of 1)": {"code": "OAP", "default_perspective": "FIN"},
    "19. ДКЗ (1 of 1)": {"code": "DKZ", "default_perspective": "RISK"},
}

INCLUDE_DOC_KINDS = {"strategy", "forecast", "program", "plan", "report", "concept", "kpi"}
EXCLUDED_CORE_HINTS = (
    "таблица",
    "таблич",
    "графич",
    "карта",
    "разрез",
    "схема",
    "гп ",
    "гп_",
    "титул",
    "ведомост",
    "backup",
    "_back",
    "не применимо",
    "приложение",
)

RUS_MONTHS = {
    "январ": "01",
    "феврал": "02",
    "март": "03",
    "апрел": "04",
    "ма": "05",
    "июн": "06",
    "июл": "07",
    "август": "08",
    "сентябр": "09",
    "октябр": "10",
    "ноябр": "11",
    "декабр": "12",
}

UNIT_HINTS = [
    ("млрд руб", "rub_bn"),
    ("миллиард руб", "rub_bn"),
    ("млн руб", "rub_mn"),
    ("миллион руб", "rub_mn"),
    ("тыс руб", "rub_k"),
    ("руб", "rub"),
    ("usd", "usd"),
    ("$", "usd"),
    ("млрд м3", "bcm"),
    ("bcm", "bcm"),
    ("bcma", "bcm"),
    ("млн м3", "mln_m3"),
    ("м3", "m3"),
    ("тыс. т", "kt"),
    ("тыс т", "kt"),
    ("kt", "kt"),
    ("млн т/год", "million_tonnes_per_year"),
    ("million tonnes per year", "million_tonnes_per_year"),
    ("млн т", "million_tonnes"),
    ("тыс. тонн co2", "ktco2e"),
    ("тонн co2", "tco2e"),
    ("co2", "tco2e"),
    ("%", "percent"),
    ("процент", "percent"),
    ("дней", "days"),
    ("день", "days"),
    ("day", "days"),
    ("суток", "days"),
    ("человеко-час", "person_hours"),
    ("чел.-час", "person_hours"),
    ("часов", "hours"),
    ("час", "hours"),
    ("кроват", "beds"),
    ("суд", "vessels"),
    ("танкер", "vessels"),
    ("газовоз", "vessels"),
    ("скважин", "wells"),
    ("скважина", "wells"),
    ("cargo", "cargoes"),
    ("парти", "cargoes"),
]


@dataclass(frozen=True)
class MetricPattern:
    code: str
    name: str
    perspective: str
    aggregation_rule: str
    unit_default: str
    higher_is_better: bool
    tolerance_abs: float
    tolerance_pct: float
    entity_level: str
    subject_area: str
    keywords: tuple[str, ...]


METRIC_PATTERNS = [
    MetricPattern(
        "GAS_RESERVES",
        "Gas reserves",
        "OPS",
        "LAST",
        "mln_m3",
        True,
        100.0,
        0.05,
        "company",
        "gas_reserves",
        ("запасы газа", "извлекаемые запасы газа", "gas reserves"),
    ),
    MetricPattern(
        "LIQUID_RESERVES",
        "Liquid reserves",
        "OPS",
        "LAST",
        "kt",
        True,
        10.0,
        0.05,
        "company",
        "liquid_reserves",
        ("запасы жидких", "запасы конденсата", "liquid reserves"),
    ),
    MetricPattern(
        "GAS_PRODUCTION",
        "Gas production",
        "OPS",
        "SUM",
        "bcm",
        True,
        0.5,
        0.05,
        "department",
        "gas_production",
        ("добыча газа", "объем добычи газа", "gas production", "gas total", "суммарной добычи газа"),
    ),
    MetricPattern(
        "OIL_PRODUCTION",
        "Oil production",
        "OPS",
        "SUM",
        "kt",
        True,
        10.0,
        0.05,
        "department",
        "oil_production",
        ("добыча нефти", "oil production"),
    ),
    MetricPattern(
        "CONDENSATE_PRODUCTION",
        "Condensate production",
        "OPS",
        "SUM",
        "kt",
        True,
        10.0,
        0.05,
        "department",
        "condensate_production",
        ("добыча конденсата", "condensate production"),
    ),
    MetricPattern(
        "OIL_COND_PRODUCTION",
        "Oil and condensate production",
        "OPS",
        "SUM",
        "kt",
        True,
        10.0,
        0.05,
        "department",
        "oil_condensate_production",
        ("нефти и конденсата", "oil and condensate", "oil condensate total"),
    ),
    MetricPattern(
        "LNG_OUTPUT",
        "LNG output",
        "OPS",
        "SUM",
        "cargoes",
        True,
        1.0,
        0.05,
        "company",
        "lng_output",
        ("отгрузка спг", "производство спг", "партии спг", "lng output", "lng cargo", "поставок спг"),
    ),
    MetricPattern(
        "LNG_CAPACITY",
        "LNG capacity",
        "OPS",
        "LAST",
        "million_tonnes_per_year",
        True,
        0.1,
        0.05,
        "company",
        "lng_capacity",
        ("мощность завода спг", "lng capacity", "млн тонн спг"),
    ),
    MetricPattern(
        "WELL_COUNT",
        "Well count",
        "OPS",
        "LAST",
        "wells",
        True,
        1.0,
        0.05,
        "field",
        "well_count",
        ("скважин", "скважина", "эксплуатационными скважинами", "well count"),
    ),
    MetricPattern(
        "DRILLING_METERS",
        "Drilling meters",
        "OPS",
        "SUM",
        "meters",
        True,
        100.0,
        0.05,
        "department",
        "drilling",
        ("проходки", "бурени", "drilling", "метров"),
    ),
    MetricPattern(
        "CAPEX",
        "Capital expenditure",
        "FIN",
        "SUM",
        "rub_mn",
        False,
        50.0,
        0.1,
        "department",
        "capex",
        ("капитальные затраты", "capex"),
    ),
    MetricPattern(
        "OPEX",
        "Operating expenditure",
        "FIN",
        "SUM",
        "rub_mn",
        False,
        50.0,
        0.1,
        "department",
        "opex",
        ("эксплуатационные затраты", "opex"),
    ),
    MetricPattern(
        "BUDGET",
        "Budget",
        "FIN",
        "SUM",
        "rub_mn",
        True,
        50.0,
        0.1,
        "department",
        "budget",
        ("бюджет", "budget", "смета расходов"),
    ),
    MetricPattern(
        "NPV",
        "Net present value",
        "FIN",
        "LAST",
        "rub_mn",
        True,
        10.0,
        0.1,
        "project",
        "npv",
        ("npv", "чистая приведенная стоимость"),
    ),
    MetricPattern(
        "IRR",
        "Internal rate of return",
        "FIN",
        "LAST",
        "percent",
        True,
        1.0,
        0.05,
        "project",
        "irr",
        ("irr", "внутренняя норма доходности"),
    ),
    MetricPattern(
        "PI",
        "Profitability index",
        "FIN",
        "LAST",
        "ratio",
        True,
        0.1,
        0.05,
        "project",
        "profitability_index",
        ("индекс доходности", "profitability index", "pi "),
    ),
    MetricPattern(
        "PROFIT",
        "Profit",
        "FIN",
        "SUM",
        "rub_mn",
        True,
        20.0,
        0.1,
        "department",
        "profit",
        ("прибыл", "profit"),
    ),
    MetricPattern(
        "REVENUE",
        "Revenue",
        "FIN",
        "SUM",
        "rub_mn",
        True,
        20.0,
        0.1,
        "department",
        "revenue",
        ("доход", "выручк", "revenue"),
    ),
    MetricPattern(
        "CASH_FLOW",
        "Cash flow",
        "FIN",
        "SUM",
        "rub_mn",
        True,
        20.0,
        0.1,
        "department",
        "cash_flow",
        ("денежных поток", "cash flow"),
    ),
    MetricPattern(
        "HEADCOUNT",
        "Headcount",
        "PEOPLE",
        "LAST",
        "persons",
        True,
        5.0,
        0.05,
        "department",
        "headcount",
        ("численность", "штат", "персонал", "сотрудник", "headcount"),
    ),
    MetricPattern(
        "TRAINING_HOURS",
        "Training hours",
        "PEOPLE",
        "SUM",
        "hours",
        True,
        10.0,
        0.1,
        "department",
        "training_hours",
        ("обучени", "компетенц", "training", "человеко-час"),
    ),
    MetricPattern(
        "EMISSIONS_CO2",
        "Emissions",
        "RISK",
        "SUM",
        "tco2e",
        False,
        10.0,
        0.1,
        "company",
        "emissions",
        ("выброс", "co2", "парниковых газов", "scope 1", "scope 2", "ghg"),
    ),
    MetricPattern(
        "INCIDENT_COUNT",
        "Incident count",
        "RISK",
        "COUNT",
        "events",
        False,
        1.0,
        0.0,
        "department",
        "incidents",
        ("инцидент", "травм", "разлив", "loss of containment", "потерь над контролем"),
    ),
    MetricPattern(
        "RISK_COUNT",
        "Risk count",
        "RISK",
        "COUNT",
        "events",
        False,
        1.0,
        0.0,
        "department",
        "risks",
        ("риски", "risk register", "risk"),
    ),
    MetricPattern(
        "AUDIT_FINDINGS",
        "Audit findings",
        "RISK",
        "COUNT",
        "events",
        False,
        1.0,
        0.0,
        "department",
        "audit",
        ("аудит", "audit", "нарушен"),
    ),
    MetricPattern(
        "SHUTDOWN_DAYS",
        "Shutdown duration",
        "RISK",
        "SUM",
        "days",
        False,
        1.0,
        0.05,
        "asset",
        "shutdown",
        ("останов", "shutdown", "5-месяч", "дней"),
    ),
    MetricPattern(
        "MAINTENANCE_COUNT",
        "Maintenance activity count",
        "OPS",
        "COUNT",
        "events",
        True,
        1.0,
        0.0,
        "asset",
        "maintenance",
        ("техническому обслуживанию", "обслуживан", "ремонт", "maintenance", "тоир", "ппр"),
    ),
    MetricPattern(
        "VESSEL_COUNT",
        "Vessel count",
        "OPS",
        "COUNT",
        "vessels",
        True,
        1.0,
        0.0,
        "department",
        "fleet",
        ("судна", "флот", "танкер", "газовоз", "дежурные суда"),
    ),
    MetricPattern(
        "AVAILABILITY_BEDS",
        "Accommodation capacity",
        "OPS",
        "LAST",
        "beds",
        True,
        5.0,
        0.05,
        "asset",
        "accommodation",
        ("кроват", "пнб", "beds"),
    ),
    MetricPattern(
        "PERSON_HOURS",
        "Person hours",
        "OPS",
        "SUM",
        "person_hours",
        True,
        100.0,
        0.05,
        "department",
        "person_hours",
        ("человеко-час", "чел.-час", "person hours"),
    ),
    MetricPattern(
        "PROJECT_COUNT",
        "Project count",
        "OPS",
        "COUNT",
        "projects",
        True,
        1.0,
        0.0,
        "department",
        "projects",
        ("проектов", "projects", "портфель проектов", "инициатив"),
    ),
    MetricPattern(
        "KPI_VALUE",
        "KPI value",
        "FIN",
        "LAST",
        "percent",
        True,
        1.0,
        0.05,
        "department",
        "kpi",
        ("ключевые показатели", "kpi", "целевые показатели", "показатели эффективности"),
    ),
    MetricPattern(
        "PLAN_YEAR_START",
        "Planning period start year",
        "OPS",
        "LAST",
        "year",
        True,
        0.0,
        0.0,
        "document",
        "planning_range",
        ("__meta_plan_year_start__",),
    ),
    MetricPattern(
        "PLAN_YEAR_END",
        "Planning period end year",
        "OPS",
        "LAST",
        "year",
        True,
        0.0,
        0.0,
        "document",
        "planning_range",
        ("__meta_plan_year_end__",),
    ),
    MetricPattern(
        "PLAN_DURATION_YEARS",
        "Planning duration",
        "OPS",
        "LAST",
        "years",
        True,
        0.0,
        0.0,
        "document",
        "planning_range",
        ("__meta_plan_duration__",),
    ),
]

PATTERN_BY_CODE = {pattern.code: pattern for pattern in METRIC_PATTERNS}


@dataclass
class Segment:
    locator: str
    text: str


@dataclass
class DocumentInfo:
    relative_path: str
    absolute_path: Path
    top_folder: str
    department_code: str
    default_perspective: str
    document_code: str
    document_name: str
    extension: str
    text: str
    segments: list[Segment]
    doc_kind: str
    core_planning_flag: bool
    horizon_code: str | None
    perspective_code: str
    year_start: int | None
    year_end: int | None
    extraction_status: str


def parse_args():
    parser = argparse.ArgumentParser(description="Build full strategy DWH input package from project files.")
    parser.add_argument(
        "--project-root",
        type=Path,
        default=PROJECT_ROOT_DEFAULT,
        help="Root folder with project documents.",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=None,
        help="Output folder for generated CSV files. Defaults to <project-root>/MS BI/bsc_model.",
    )
    parser.add_argument(
        "--max-facts-per-doc",
        type=int,
        default=30,
        help="Cap extracted business facts per document.",
    )
    return parser.parse_args()


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_match_text(value: str) -> str:
    lowered = value.lower().replace("ё", "е")
    return normalize_spaces(lowered)


def make_document_code(relative_path: str, department_code: str) -> str:
    digest = hashlib.sha1(relative_path.encode("utf-8")).hexdigest()[:10].upper()
    return f"{department_code}_DOC_{digest}"


def ensure_text(value: str | None) -> str:
    return value if value else ""


def read_pdf(path: Path) -> tuple[str, list[Segment]]:
    result = subprocess.run(
        ["pdftotext", "-layout", str(path), "-"],
        capture_output=True,
        text=True,
        check=True,
    )
    text = result.stdout.replace("\x00", " ")
    pages = text.split("\f")
    segments: list[Segment] = []
    for page_idx, page in enumerate(pages, start=1):
        for line_idx, raw_line in enumerate(page.splitlines(), start=1):
            clean = normalize_spaces(raw_line)
            if not clean:
                continue
            segments.append(Segment(locator=f"page{page_idx}_line{line_idx}", text=clean))
    return text, segments


def read_docx(path: Path) -> tuple[str, list[Segment]]:
    segments: list[Segment] = []
    text_parts: list[str] = []
    with zipfile.ZipFile(path) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
        for idx, paragraph in enumerate(root.findall(".//w:p", WORD_NS), start=1):
            texts = [t.text.strip() for t in paragraph.findall(".//w:t", WORD_NS) if t.text and t.text.strip()]
            if not texts:
                continue
            line = normalize_spaces(" ".join(texts))
            if not line:
                continue
            text_parts.append(line)
            segments.append(Segment(locator=f"paragraph{idx}", text=line))
    return "\n".join(text_parts), segments


def read_pptx(path: Path) -> tuple[str, list[Segment]]:
    segments: list[Segment] = []
    text_parts: list[str] = []
    with zipfile.ZipFile(path) as zf:
        slides = sorted(
            name for name in zf.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml")
        )
        for slide_name in slides:
            root = ET.fromstring(zf.read(slide_name))
            tokens = [t.text.strip() for t in root.findall(".//a:t", SLIDE_NS) if t.text and t.text.strip()]
            if not tokens:
                continue
            slide_number = re.search(r"slide(\d+)\.xml$", slide_name)
            locator = f"slide{slide_number.group(1) if slide_number else len(segments) + 1}"
            line = normalize_spaces(" ".join(tokens))
            text_parts.append(line)
            segments.append(Segment(locator=locator, text=line))
    return "\n".join(text_parts), segments


def extract_text(path: Path) -> tuple[str, list[Segment], str]:
    try:
        if path.suffix.lower() == ".pdf":
            text, segments = read_pdf(path)
        elif path.suffix.lower() == ".docx":
            text, segments = read_docx(path)
        elif path.suffix.lower() == ".pptx":
            text, segments = read_pptx(path)
        else:
            return "", [], "unsupported"
    except Exception as exc:  # noqa: BLE001
        return "", [], f"failed:{exc.__class__.__name__}"

    if not text.strip():
        return text, segments, "empty"
    return text, segments, "ok"


def infer_doc_kind(relative_path: str, normalized_text: str, extension: str) -> str:
    source = f"{relative_path.lower()} {normalized_text[:2000]}"
    source = source.replace("ё", "е")

    if any(token in source for token in ("карта", "разрез", "схема", "графическ", "гп ", "гп_", "profile")):
        return "graphic"
    if any(token in source for token in ("таблица", "таблич", "table ")):
        return "table"
    if any(token in source for token in ("титул", "ведомост", "лист согласован", "содержание")):
        return "admin"
    if "протокол" in source:
        return "protocol"
    if "kpi" in source or "ключевые показатели" in source:
        return "kpi"
    if "концепц" in source:
        return "concept"
    if "отчет" in source or "report" in source:
        return "report"
    if "прогноз" in source or "forecast" in source:
        return "forecast"
    if "стратег" in source or "strategy" in source:
        return "strategy"
    if "программа" in source or "program" in source:
        return "program"
    if "план" in source or "roadmap" in source:
        return "plan"
    if extension == ".pptx":
        return "presentation"
    return "other"


def extract_years(text: str) -> tuple[int | None, int | None]:
    years = sorted({int(match) for match in re.findall(r"(?<!\d)(20\d{2})(?!\d)", text)})
    if not years:
        return None, None
    valid_years = [year for year in years if 2000 <= year <= 2100]
    if not valid_years:
        return None, None
    return valid_years[0], valid_years[-1]


def infer_horizon(relative_path: str, normalized_text: str, year_start: int | None, year_end: int | None) -> str | None:
    source = f"{relative_path.lower()} {normalized_text[:3000]}"
    source = source.replace("ё", "е")
    scores = {"LT": 0, "MT": 0, "ST": 0, "OT": 0}

    if any(token in source for token in ("долгоср", "ltf", "ltds", "дтср", "тпр", "укпо", "iso 2023", "проект укпо", "проект исо")):
        scores["LT"] += 5
    if any(token in source for token in ("среднеср", "strategy 2023-2027", "strategy 2025-2029", "5 лет")):
        scores["MT"] += 4
    if any(token in source for token in ("краткоср", "stds", "1 год", "2 года", "annual", "ежегодн", "2025.pdf", "2025.docx", "2025.pptx")):
        scores["ST"] += 3
    if any(token in source for token in ("операцион", "суточ", "еженед", "месячн", "weekly", "daily", "оператив")):
        scores["OT"] += 6
    if any(token in source for token in ("комплексный план деятельности", "комплексный план технологических остановов")):
        scores["ST"] += 3
    if any(token in source for token in ("программа поставок", "смета расходов", "программа работ")):
        scores["ST"] += 3
    if "долгосрочный план по тех" in source or "долгосрочный план маркетинга" in source:
        scores["LT"] += 4

    if year_start and year_end:
        span = year_end - year_start
        if span >= 10:
            scores["LT"] += 3
        elif span >= 4:
            scores["MT"] += 2
        elif span >= 1:
            scores["ST"] += 2
        else:
            scores["OT"] += 1

    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else None


def infer_perspective(relative_path: str, normalized_text: str, default_perspective: str) -> str:
    source = f"{relative_path.lower()} {normalized_text[:2500]}"
    source = source.replace("ё", "е")

    if any(token in source for token in ("финанс", "бюджет", "смета", "затрат", "npv", "irr", "денежных поток", "прибыл", "маркетинг", "поставок", "тенкер", "танкер")):
        return "FIN"
    if any(token in source for token in ("кадр", "персонал", "обучен", "компетенц", "талант", "развитие кадрового потенциала")):
        return "PEOPLE"
    if any(token in source for token in ("риск", "audit", "аудит", "комплаенс", "отос", "безопасн", "климат", "esg", "устойчив", "репутац", "выброс")):
        return "RISK"
    return default_perspective


def is_core_planning_doc(doc_kind: str, relative_path: str) -> bool:
    normalized = relative_path.lower().replace("ё", "е")
    if any(token in normalized for token in EXCLUDED_CORE_HINTS):
        return False
    return doc_kind in INCLUDE_DOC_KINDS


def scan_project_files(project_root: Path, output_root: Path) -> list[Path]:
    files = []
    for path in project_root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        try:
            path.relative_to(output_root)
            continue
        except ValueError:
            pass
        relative = path.relative_to(project_root)
        if not relative.parts:
            continue
        if relative.parts[0] == "MS BI":
            continue
        files.append(path)
    return sorted(files)


def build_document_info(project_root: Path, path: Path) -> DocumentInfo | None:
    relative_path = str(path.relative_to(project_root))
    top_folder = relative_path.split("/", 1)[0]
    dept_meta = DEPARTMENT_MAP.get(top_folder)
    if not dept_meta:
        return None

    text, segments, extraction_status = extract_text(path)
    normalized_text = normalize_match_text(text)
    year_start, year_end = extract_years(f"{relative_path} {normalized_text[:4000]}")
    doc_kind = infer_doc_kind(relative_path, normalized_text, path.suffix.lower())
    core_flag = is_core_planning_doc(doc_kind, relative_path)
    horizon_code = infer_horizon(relative_path, normalized_text, year_start, year_end)
    perspective_code = infer_perspective(relative_path, normalized_text, dept_meta["default_perspective"])

    return DocumentInfo(
        relative_path=relative_path,
        absolute_path=path,
        top_folder=top_folder,
        department_code=dept_meta["code"],
        default_perspective=dept_meta["default_perspective"],
        document_code=make_document_code(relative_path, dept_meta["code"]),
        document_name=path.stem,
        extension=path.suffix.lower(),
        text=text,
        segments=segments,
        doc_kind=doc_kind,
        core_planning_flag=core_flag,
        horizon_code=horizon_code,
        perspective_code=perspective_code,
        year_start=year_start,
        year_end=year_end,
        extraction_status=extraction_status,
    )


def detect_unit(text: str, default_unit: str) -> str:
    normalized = normalize_match_text(text)
    for alias, unit in UNIT_HINTS:
        if alias in normalized:
            return unit
    return default_unit


def safe_number(value: str) -> float | None:
    candidate = value.replace("\u00a0", " ").replace(" ", "").replace(",", ".").strip()
    if not candidate:
        return None
    if candidate.endswith("."):
        candidate = candidate[:-1]
    try:
        parsed = float(candidate)
    except ValueError:
        return None
    if not (-1e15 < parsed < 1e15):
        return None
    return parsed


def find_numeric_tokens(text: str) -> list[str]:
    tokens = []
    for match in re.finditer(r"(?<![A-Za-zА-Яа-я0-9])(\d{1,3}(?:[ \u00A0]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?![A-Za-zА-Яа-я0-9])", text):
        token = match.group(1).strip()
        if re.fullmatch(r"20\d{2}", token):
            continue
        if re.fullmatch(r"\d+(?:\.\d+)+", token):
            continue
        tokens.append(token)
    return tokens


def extract_date_values(text: str) -> list[str]:
    values = []
    values.extend(re.findall(r"\b\d{2}\.\d{2}\.\d{4}\b", text))
    for month_root, month_number in RUS_MONTHS.items():
        for year in re.findall(rf"\b[А-Яа-яA-Za-z]*{month_root}[А-Яа-яA-Za-z]*\s+(20\d{{2}})\b", text, flags=re.I):
            values.append(f"{year}-{month_number}-01")
    return values


def pair_year_value_matches(text: str) -> list[tuple[str, str]]:
    matches = re.findall(
        r"(?<!\d)(20\d{2})(?!\d)[^\d\n]{0,18}(\d{1,3}(?:[ \u00A0]\d{3})*(?:[.,]\d+)?)",
        text,
        flags=re.I,
    )
    if matches:
        return [(year, value) for year, value in matches]

    years = re.findall(r"(?<!\d)(20\d{2})(?!\d)", text)
    values = find_numeric_tokens(text)
    if years and values and len(years) <= len(values) <= len(years) + 4:
        return list(zip(years, values[: len(years)]))
    return []


def is_probable_contents_line(text: str) -> bool:
    normalized = normalize_spaces(text)
    if not normalized:
        return False
    lowered = normalize_match_text(normalized)
    if lowered.startswith("содержание") or lowered.startswith("contents"):
        return True
    if re.match(r"^\d+(?:\.\d+){1,}\s+.+\s+\d{1,4}$", normalized):
        return True
    if re.match(r"^\d+\s+[A-Za-zА-Яа-я].+\s+\d{1,4}$", normalized) and len(find_numeric_tokens(normalized)) <= 2:
        return True
    if re.match(r"^\d+\s+[A-Za-zА-Яа-я][A-Za-zА-Яа-я\s\-]{3,}$", normalized) and len(find_numeric_tokens(normalized)) == 1:
        return True
    return False


def confidence_rank(level: str) -> int:
    if level == "high":
        return 0
    if level == "medium":
        return 1
    return 2


def build_note(document: DocumentInfo, excerpt: str) -> str:
    return normalize_spaces(
        f"{document.doc_kind}; core={int(document.core_planning_flag)}; years={document.year_start}-{document.year_end}; excerpt={excerpt[:180]}"
    )[:500]


def pattern_matches_context(pattern: MetricPattern, context: str) -> bool:
    if not any(keyword in context for keyword in pattern.keywords):
        return False

    if pattern.code == "MAINTENANCE_COUNT":
        return any(token in context for token in ("техническ", "обслужив", "ремонт", "maintenance", "тоир", "ппр"))

    if pattern.code == "PROJECT_COUNT":
        return any(
            token in context
            for token in ("количество проектов", "число проектов", "number of projects", "projects in portfolio", "портфель проектов")
        )

    if pattern.code == "LNG_OUTPUT":
        has_lng = any(token in context for token in ("спг", "lng"))
        has_output = any(token in context for token in ("отгруз", "производ", "парт", "cargo", "output", "постав"))
        return has_lng and has_output

    if pattern.code == "KPI_VALUE":
        return any(
            token in context
            for token in ("ключевые показатели", "целевые показатели", "показатели эффективности", "kpi")
        )

    if pattern.code == "WELL_COUNT":
        return any(
            token in context
            for token in ("количество скважин", "эксплуатационными скважинами", "добывающими скважинами", "нагнетательными скважинами", "well count")
        )

    return True


def value_is_plausible(pattern: MetricPattern, value: float, unit: str) -> bool:
    if pattern.code == "PROJECT_COUNT":
        return unit == "projects" and 0 < value <= 50
    if pattern.code == "MAINTENANCE_COUNT":
        return unit == "events" and 0 < value <= 100
    if pattern.code == "VESSEL_COUNT":
        return unit == "vessels" and 0 <= value <= 50
    if pattern.code == "WELL_COUNT":
        return unit == "wells" and 0 < value <= 120
    if pattern.code == "KPI_VALUE":
        return 0 <= value <= 100
    if pattern.code == "LNG_OUTPUT":
        return unit in {"cargoes", "million_tonnes", "million_tonnes_per_year"} and value > 0
    if pattern.code == "HEADCOUNT":
        return unit == "persons" and 0 < value <= 5000
    if pattern.code == "TRAINING_HOURS":
        return unit in {"hours", "person_hours"} and value > 0
    if pattern.code == "SHUTDOWN_DAYS":
        return unit == "days" and 0 < value <= 365
    return True


def add_fact(
    facts: list[dict],
    *,
    document: DocumentInfo,
    pattern: MetricPattern,
    period_key: str,
    metric_value: str,
    unit: str,
    source_locator: str,
    confidence: str,
    extraction_method: str,
    note: str,
):
    facts.append(
        {
            "parser_name": extraction_method,
            "source_file": document.relative_path,
            "horizon_code": document.horizon_code or "",
            "entity_level": pattern.entity_level,
            "subject_area": pattern.subject_area,
            "metric_code": pattern.code,
            "metric_name": pattern.name,
            "period_key": period_key,
            "metric_value": metric_value,
            "unit": unit,
            "source_locator": source_locator,
            "confidence": confidence,
            "extraction_method": extraction_method,
            "note": note,
            "perspective_code": pattern.perspective,
            "department_code": document.department_code,
            "document_code": document.document_code,
            "document_name": document.document_name,
        }
    )


def extract_business_facts(document: DocumentInfo, max_facts_per_doc: int) -> list[dict]:
    facts: list[dict] = []
    heading_context = ""
    previous_segment = ""

    if document.core_planning_flag and document.year_start:
        add_fact(
            facts,
            document=document,
            pattern=PATTERN_BY_CODE["PLAN_YEAR_START"],
            period_key=str(document.year_start),
            metric_value=str(document.year_start),
            unit="year",
            source_locator="document_meta",
            confidence="medium",
            extraction_method="document_range",
            note=f"Document planning start year for {document.document_name}",
        )
    if document.core_planning_flag and document.year_end and document.year_end != document.year_start:
        add_fact(
            facts,
            document=document,
            pattern=PATTERN_BY_CODE["PLAN_YEAR_END"],
            period_key=str(document.year_end),
            metric_value=str(document.year_end),
            unit="year",
            source_locator="document_meta",
            confidence="medium",
            extraction_method="document_range",
            note=f"Document planning end year for {document.document_name}",
        )
        add_fact(
            facts,
            document=document,
            pattern=PATTERN_BY_CODE["PLAN_DURATION_YEARS"],
            period_key=str(document.year_start or document.year_end),
            metric_value=str(document.year_end - (document.year_start or document.year_end)),
            unit="years",
            source_locator="document_meta",
            confidence="medium",
            extraction_method="document_range",
            note=f"Document planning duration for {document.document_name}",
        )

    if document.doc_kind in {"graphic", "table", "admin"}:
        return facts

    for segment in document.segments:
        if len(facts) >= max_facts_per_doc:
            break
        text = normalize_spaces(segment.text)
        if not text:
            continue
        if re.search(r"\.{4,}\s*\d+\s*$", text):
            previous_segment = normalize_match_text(text)
            continue
        if is_probable_contents_line(text):
            previous_segment = normalize_match_text(text)
            continue
        normalized_segment = normalize_match_text(text)
        if len(normalized_segment) < 6:
            continue

        if not re.search(r"[A-Za-zА-Яа-я]", normalized_segment):
            continue

        if not re.search(r"\d", normalized_segment):
            if len(normalized_segment) <= 120:
                heading_context = normalized_segment
            previous_segment = normalized_segment
            continue

        context = normalize_spaces(" ".join(part for part in (heading_context, previous_segment, normalized_segment) if part))
        matched_patterns = [
            pattern
            for pattern in METRIC_PATTERNS
            if not pattern.code.startswith("PLAN_") and pattern_matches_context(pattern, context)
        ]
        if not matched_patterns:
            previous_segment = normalized_segment
            continue

        for pattern in matched_patterns:
            if len(facts) >= max_facts_per_doc:
                break

            unit = "percent" if pattern.code == "KPI_VALUE" else detect_unit(context, pattern.unit_default)
            excerpt = text[:220]
            note = build_note(document, excerpt)
            year_pairs = pair_year_value_matches(context)

            if year_pairs:
                for year, raw_value in year_pairs[:3]:
                    value = safe_number(raw_value)
                    if value is None:
                        continue
                    if not value_is_plausible(pattern, value, unit):
                        continue
                    add_fact(
                        facts,
                        document=document,
                        pattern=pattern,
                        period_key=year,
                        metric_value=f"{value:g}",
                        unit=unit,
                        source_locator=segment.locator,
                        confidence="high",
                        extraction_method="line_year_value",
                        note=note,
                    )
                continue

            if pattern.unit_default == "date":
                for date_value in extract_date_values(context)[:2]:
                    add_fact(
                        facts,
                        document=document,
                        pattern=pattern,
                        period_key=date_value,
                        metric_value=date_value,
                        unit="date",
                        source_locator=segment.locator,
                        confidence="medium",
                        extraction_method="line_date",
                        note=note,
                    )
                continue

            numeric_tokens = find_numeric_tokens(context)
            if not numeric_tokens:
                continue

            selected_tokens = numeric_tokens[:2]
            inferred_period = None
            if document.year_start and document.year_end and document.year_start == document.year_end:
                inferred_period = str(document.year_start)
            elif document.year_start and document.horizon_code in {"ST", "OT"}:
                inferred_period = str(document.year_start)
            elif document.year_start and document.core_planning_flag:
                inferred_period = str(document.year_start)

            confidence = "medium" if inferred_period else "low"
            for raw_value in selected_tokens:
                value = safe_number(raw_value)
                if value is None:
                    continue
                if not value_is_plausible(pattern, value, unit):
                    continue
                add_fact(
                    facts,
                    document=document,
                    pattern=pattern,
                    period_key=inferred_period or (document.horizon_code or "UNSPECIFIED"),
                    metric_value=f"{value:g}",
                    unit=unit,
                    source_locator=segment.locator,
                    confidence=confidence,
                    extraction_method="line_numeric",
                    note=note,
                )

        previous_segment = normalized_segment

    deduped = {}
    for fact in facts:
        key = (
            fact["source_file"],
            fact["metric_code"],
            fact["period_key"],
            fact["metric_value"],
            fact["unit"],
            fact["source_locator"],
        )
        existing = deduped.get(key)
        if existing is None or confidence_rank(fact["confidence"]) < confidence_rank(existing["confidence"]):
            deduped[key] = fact

    return list(deduped.values())[:max_facts_per_doc]


def build_document_inventory_rows(documents: Iterable[DocumentInfo]) -> list[dict]:
    rows = []
    for document in documents:
        comment_parts = [
            f"doc_kind={document.doc_kind}",
            f"core_planning_flag={int(document.core_planning_flag)}",
            f"extraction_status={document.extraction_status}",
        ]
        if document.year_start:
            comment_parts.append(f"year_start={document.year_start}")
        if document.year_end:
            comment_parts.append(f"year_end={document.year_end}")
        rows.append(
            {
                "document_code": document.document_code,
                "document_name": document.document_name,
                "document_file": document.relative_path,
                "horizon_code": document.horizon_code or "",
                "department_code": document.department_code,
                "perspective_code": document.perspective_code,
                "source_system": "project_documents",
                "source_kind": "project_file_inventory",
                "record_origin": "document_inventory_full",
                "version_label": "current",
                "status": "current",
                "current_flag": "1",
                "source_locator": "",
                "comment": "; ".join(comment_parts),
            }
        )
    return rows


def prepare_metric_dictionary_rows(existing_rows: list[dict], facts: list[dict]) -> list[dict]:
    existing_codes = {row["metric_code"] for row in existing_rows}
    rows = list(existing_rows)
    used_codes = {fact["metric_code"] for fact in facts if fact["metric_code"]}

    for code in sorted(used_codes):
        if code in existing_codes:
            continue
        pattern = PATTERN_BY_CODE.get(code)
        if not pattern:
            continue
        rows.append(
            {
                "metric_code": pattern.code,
                "metric_name": pattern.name,
                "metric_type": "date" if pattern.unit_default == "date" else "numeric",
                "perspective_code": pattern.perspective,
                "aggregation_rule": pattern.aggregation_rule,
                "unit": pattern.unit_default,
                "higher_is_better_flag": "1" if pattern.higher_is_better else "0",
                "default_grain": "year",
                "default_tolerance_abs": f"{pattern.tolerance_abs:g}",
                "default_tolerance_pct": f"{pattern.tolerance_pct:g}",
                "requires_actual_flag": "0",
                "metric_status": "generated",
                "comment": "Generated from bulk strategy extraction patterns",
            }
        )
    return rows


def median_value(values: list[float]) -> float:
    if len(values) == 1:
        return values[0]
    return float(statistics.median(values))


def choose_best_fact(facts: list[dict]) -> dict:
    def sort_key(fact: dict):
        return (
            confidence_rank(fact["confidence"]),
            fact["document_code"],
            fact["source_locator"],
        )

    return sorted(facts, key=sort_key)[0]


def aggregate_kpi_nodes(facts: list[dict]) -> list[dict]:
    business_facts = []
    for fact in facts:
        if fact["metric_code"].startswith("PLAN_"):
            continue
        value = safe_number(fact["metric_value"])
        if value is None:
            continue
        if not fact["horizon_code"] or fact["horizon_code"] not in HORIZON_ORDER:
            continue
        business_facts.append({**fact, "_numeric_value": value})

    grouped: dict[tuple[str, str, str, str], list[dict]] = defaultdict(list)
    for fact in business_facts:
        key = (
            fact["department_code"],
            fact["metric_code"],
            fact["unit"],
            fact["perspective_code"],
        )
        grouped[key].append(fact)

    nodes: list[dict] = []
    for (department_code, metric_code, unit, perspective_code), grouped_facts in grouped.items():
        by_horizon: dict[str, list[dict]] = defaultdict(list)
        for fact in grouped_facts:
            by_horizon[fact["horizon_code"]].append(fact)

        horizons_present = sorted(by_horizon, key=lambda code: HORIZON_ORDER[code])
        if not horizons_present:
            continue

        period_keys = sorted(
            {
                fact["period_key"]
                for fact in grouped_facts
                if fact.get("period_key") and fact["period_key"] not in {"UNSPECIFIED", "LT", "MT", "ST", "OT"}
            }
        )
        period_label = period_keys[0] if len(period_keys) == 1 else (period_keys[-1] if period_keys else "ALL")
        period_fragment = re.sub(r"[^A-Za-z0-9]+", "_", period_label)[:40] or "ALL"
        chain_id = f"{department_code}_{metric_code}_{unit}_{period_fragment}"
        previous_node_id = None
        previous_horizon = None

        for horizon_code in horizons_present:
            facts_in_horizon = by_horizon[horizon_code]
            values = [fact["_numeric_value"] for fact in facts_in_horizon]
            representative_value = median_value(values)
            representative_fact = choose_best_fact(facts_in_horizon)
            pattern = PATTERN_BY_CODE.get(metric_code)
            if not pattern:
                continue

            node_id = f"{chain_id}_{horizon_code}"
            parent_node_id = None
            if previous_node_id and previous_horizon is not None:
                if HORIZON_ORDER[horizon_code] - HORIZON_ORDER[previous_horizon] == 1:
                    parent_node_id = previous_node_id

            representative_period = representative_fact.get("period_key") or period_label
            if representative_period in {"UNSPECIFIED", "LT", "MT", "ST", "OT", ""}:
                representative_period = period_label or horizon_code

            nodes.append(
                {
                    "node_id": node_id,
                    "parent_node_id": parent_node_id or "",
                    "chain_id": chain_id,
                    "document_id": representative_fact["document_code"],
                    "document_name": representative_fact["document_name"],
                    "horizon_code": horizon_code,
                    "perspective_code": perspective_code,
                    "metric_code": metric_code,
                    "metric_name": representative_fact["metric_name"],
                    "period_key": representative_period,
                    "target_value": f"{representative_value:g}",
                    "actual_value": "",
                    "unit": unit,
                    "aggregation_rule": pattern.aggregation_rule,
                    "weight_pct": "",
                    "tolerance_abs": f"{pattern.tolerance_abs:g}",
                    "tolerance_pct": f"{pattern.tolerance_pct:g}",
                    "department_code": department_code,
                    "project_code": "ALL",
                    "object_code": "ALL",
                    "source_page": representative_fact["source_locator"],
                    "comment": (
                        f"Auto-generated KPI node from {len(facts_in_horizon)} extracted facts; "
                        f"chain_period={period_label}; horizons_in_chain={','.join(horizons_present)}"
                    ),
                }
            )

            previous_node_id = node_id
            previous_horizon = horizon_code

    return nodes


def build_cascade_rows(documents: list[DocumentInfo], facts: list[dict]) -> list[dict]:
    fact_count_by_document = defaultdict(int)
    for fact in facts:
        fact_count_by_document[fact["document_code"]] += 1

    documents_by_dept_horizon: dict[tuple[str, str], list[DocumentInfo]] = defaultdict(list)
    for document in documents:
        if not document.horizon_code or not document.core_planning_flag:
            continue
        documents_by_dept_horizon[(document.department_code, document.horizon_code)].append(document)

    def rank_document(document: DocumentInfo):
        name = normalize_match_text(document.document_name)
        priority = 0
        if "стратег" in name:
            priority -= 4
        if "прогноз" in name:
            priority -= 3
        if "программа" in name:
            priority -= 2
        if "план" in name:
            priority -= 1
        return (
            priority,
            -fact_count_by_document.get(document.document_code, 0),
            document.relative_path,
        )

    rows = []
    transitions = [("LT", "MT"), ("MT", "ST"), ("ST", "OT")]
    departments = sorted({document.department_code for document in documents})

    for department_code in departments:
        best_docs = {}
        for horizon_code in HORIZON_ORDER:
            candidates = documents_by_dept_horizon.get((department_code, horizon_code), [])
            if candidates:
                best_docs[horizon_code] = sorted(candidates, key=rank_document)[0]

        chain_id = f"{department_code}_CHAIN_MAIN"
        for idx, (parent_horizon, child_horizon) in enumerate(transitions, start=1):
            parent_doc = best_docs.get(parent_horizon)
            child_doc = best_docs.get(child_horizon)
            transition_exists = bool(parent_doc and child_doc)
            rows.append(
                {
                    "cascade_link_id": f"{chain_id}_{idx}",
                    "chain_id": chain_id,
                    "parent_document_id": parent_doc.document_code if parent_doc else "",
                    "parent_document_name": parent_doc.document_name if parent_doc else "",
                    "parent_horizon_code": parent_horizon,
                    "child_document_id": child_doc.document_code if child_doc else "",
                    "child_document_name": child_doc.document_name if child_doc else "",
                    "child_horizon_code": child_horizon,
                    "department_code": department_code,
                    "project_code": "ALL",
                    "object_code": "ALL",
                    "cascade_subject": "department_master_planning",
                    "transition_required": "1",
                    "transition_exists": "1" if transition_exists else "0",
                    "coverage_status": "covered" if transition_exists else "gap",
                    "source_page": "",
                    "comment": "Auto-generated department planning cascade",
                }
            )
    return rows


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def read_csv(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def finalize_fact_rows(facts: list[dict]) -> list[dict]:
    rows = []
    for idx, fact in enumerate(facts, start=1):
        row = {
            "record_id": f"FULL_REC_{idx:06d}",
            "parser_name": fact["parser_name"],
            "source_file": fact["source_file"],
            "horizon_code": fact["horizon_code"],
            "entity_level": fact["entity_level"],
            "subject_area": fact["subject_area"],
            "metric_code": fact["metric_code"],
            "metric_name": fact["metric_name"],
            "period_key": fact["period_key"],
            "metric_value": fact["metric_value"],
            "unit": fact["unit"],
            "source_locator": fact["source_locator"],
            "confidence": fact["confidence"],
            "extraction_method": fact["extraction_method"],
            "note": fact["note"],
            "perspective_code": fact["perspective_code"],
            "department_code": fact["department_code"],
            "document_code": fact["document_code"],
            "document_name": fact["document_name"],
        }
        rows.append(row)
    return rows


def main():
    args = parse_args()
    project_root = args.project_root.resolve()
    output_root = (args.output_root or (project_root / OUTPUT_ROOT_RELATIVE)).resolve()

    files = scan_project_files(project_root, output_root)
    print(f"[strategy:build-full] scanning files={len(files)} project_root={project_root}")

    documents: list[DocumentInfo] = []
    for index, path in enumerate(files, start=1):
        info = build_document_info(project_root, path)
        if info is None:
            continue
        documents.append(info)
        if index % 25 == 0:
            print(f"[strategy:build-full] prepared document metadata {index}/{len(files)}")

    all_facts: list[dict] = []
    for index, document in enumerate(documents, start=1):
        extracted = extract_business_facts(document, args.max_facts_per_doc)
        all_facts.extend(extracted)
        if index % 25 == 0:
            print(f"[strategy:build-full] extracted facts {index}/{len(documents)} docs -> {len(all_facts)} facts")

    inventory_rows = build_document_inventory_rows(documents)
    auto_fact_rows = finalize_fact_rows(all_facts)
    kpi_rows = aggregate_kpi_nodes(all_facts)
    cascade_rows = build_cascade_rows(documents, all_facts)

    metrics_seed_path = output_root / "dim_metric_dictionary_template.csv"
    metrics_rows = prepare_metric_dictionary_rows(read_csv(metrics_seed_path), all_facts)

    write_csv(
        output_root / "document_inventory_full.csv",
        [
            "document_code",
            "document_name",
            "document_file",
            "horizon_code",
            "department_code",
            "perspective_code",
            "source_system",
            "source_kind",
            "record_origin",
            "version_label",
            "status",
            "current_flag",
            "source_locator",
            "comment",
        ],
        inventory_rows,
    )
    write_csv(
        output_root / "auto_extracted_facts_full.csv",
        [
            "record_id",
            "parser_name",
            "source_file",
            "horizon_code",
            "entity_level",
            "subject_area",
            "metric_code",
            "metric_name",
            "period_key",
            "metric_value",
            "unit",
            "source_locator",
            "confidence",
            "extraction_method",
            "note",
            "perspective_code",
            "department_code",
            "document_code",
            "document_name",
        ],
        auto_fact_rows,
    )
    write_csv(
        output_root / "fact_kpi_decomposition_full.csv",
        [
            "node_id",
            "parent_node_id",
            "chain_id",
            "document_id",
            "document_name",
            "horizon_code",
            "perspective_code",
            "metric_code",
            "metric_name",
            "period_key",
            "target_value",
            "actual_value",
            "unit",
            "aggregation_rule",
            "weight_pct",
            "tolerance_abs",
            "tolerance_pct",
            "department_code",
            "project_code",
            "object_code",
            "source_page",
            "comment",
        ],
        kpi_rows,
    )
    write_csv(
        output_root / "fact_planning_cascade_full.csv",
        [
            "cascade_link_id",
            "chain_id",
            "parent_document_id",
            "parent_document_name",
            "parent_horizon_code",
            "child_document_id",
            "child_document_name",
            "child_horizon_code",
            "department_code",
            "project_code",
            "object_code",
            "cascade_subject",
            "transition_required",
            "transition_exists",
            "coverage_status",
            "source_page",
            "comment",
        ],
        cascade_rows,
    )
    write_csv(
        output_root / "dim_metric_dictionary_full.csv",
        [
            "metric_code",
            "metric_name",
            "metric_type",
            "perspective_code",
            "aggregation_rule",
            "unit",
            "higher_is_better_flag",
            "default_grain",
            "default_tolerance_abs",
            "default_tolerance_pct",
            "requires_actual_flag",
            "metric_status",
            "comment",
        ],
        metrics_rows,
    )

    print(f"[strategy:build-full] documents={len(inventory_rows)}")
    print(f"[strategy:build-full] auto_facts={len(auto_fact_rows)}")
    print(f"[strategy:build-full] kpi_rows={len(kpi_rows)}")
    print(f"[strategy:build-full] cascade_rows={len(cascade_rows)}")
    print(f"[strategy:build-full] output_root={output_root}")


if __name__ == "__main__":
    main()
