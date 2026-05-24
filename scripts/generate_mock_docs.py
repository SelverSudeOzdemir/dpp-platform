"""
Mock SAP belgelerini oluşturur.
Çıktı: frontend/public/mock-sap-docs/
"""
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
import os, sys

OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "mock-sap-docs")
os.makedirs(OUT, exist_ok=True)

# ── Renkler ──────────────────────────────────────────────────────────────────
STEEL_BLUE  = "1B4F8A"
LIGHT_BLUE  = "D6E4F0"
MID_BLUE    = "85B4D8"
WHITE       = "FFFFFF"
LIGHT_GRAY  = "F5F7FA"
MID_GRAY    = "E2E8F0"
DARK_GRAY   = "374151"
GREEN_DARK  = "15803D"
GREEN_LIGHT = "DCFCE7"

def thin():
    s = Side(style="thin", color="CBD5E1")
    return Border(top=s, bottom=s, left=s, right=s)

def fill(color):
    return PatternFill("solid", fgColor=color)

def font(color=DARK_GRAY, bold=False, size=10, italic=False):
    return Font(name="Calibri", bold=bold, color=color, size=size, italic=italic)

def align(h="left", indent=0):
    return Alignment(horizontal=h, vertical="center", indent=indent, wrap_text=False)

def set_widths(ws, widths):
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

def title_row(ws, row, cols, text, sub=None):
    ws.row_dimensions[row].height = 44
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=cols)
    c = ws.cell(row=row, column=1, value=text)
    c.fill = fill(STEEL_BLUE); c.font = font(WHITE, True, 14); c.alignment = align("center")
    if sub:
        ws.row_dimensions[row+1].height = 18
        ws.merge_cells(start_row=row+1, start_column=1, end_row=row+1, end_column=cols)
        c2 = ws.cell(row=row+1, column=1, value=sub)
        c2.fill = fill(MID_BLUE); c2.font = font(WHITE, False, 10); c2.alignment = align("center")

def section(ws, row, cols, text):
    ws.row_dimensions[row].height = 20
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=cols)
    c = ws.cell(row=row, column=1, value=text)
    c.fill = fill(LIGHT_BLUE); c.font = font(STEEL_BLUE, True, 10); c.alignment = align("left", 1)
    c.border = thin()

def kv(ws, row, label, value, alt=False, cols=2):
    ws.row_dimensions[row].height = 18
    bg_l = MID_GRAY if alt else LIGHT_GRAY
    bg_v = LIGHT_GRAY if alt else WHITE
    cl = ws.cell(row=row, column=1, value=label)
    cl.fill = fill(bg_l); cl.font = font(DARK_GRAY, True); cl.alignment = align("left", 1); cl.border = thin()
    if cols > 2:
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=cols)
    cv = ws.cell(row=row, column=2, value=value)
    cv.fill = fill(bg_v); cv.font = font("1E293B"); cv.alignment = align("left", 1); cv.border = thin()

def th(ws, row, cols_labels, bg="1E3A5F"):
    ws.row_dimensions[row].height = 22
    for i, lbl in enumerate(cols_labels, 1):
        c = ws.cell(row=row, column=i, value=lbl)
        c.fill = fill(bg); c.font = font(WHITE, True, 10)
        c.alignment = align("center"); c.border = thin()

def td(ws, row, col, value, alt=False, bold=False, color=DARK_GRAY, h="left"):
    bg = LIGHT_GRAY if alt else WHITE
    c = ws.cell(row=row, column=col, value=value)
    c.fill = fill(bg); c.font = font(color, bold); c.alignment = align(h); c.border = thin()

def ok_cell(ws, row, col, ok=True):
    text = "UYGUN" if ok else "UYGUNSUZ"
    bg   = GREEN_LIGHT if ok else "FEE2E2"
    fg   = GREEN_DARK  if ok else "DC2626"
    c = ws.cell(row=row, column=col, value=("✓  " if ok else "✗  ") + text)
    c.fill = fill(bg); c.font = font(fg, True); c.alignment = align("center"); c.border = thin()

def footer(ws, row, cols, text):
    ws.row_dimensions[row].height = 16
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=cols)
    c = ws.cell(row=row, column=1, value=text)
    c.fill = fill(LIGHT_GRAY); c.font = font("64748B", italic=True, size=9)
    c.alignment = align("center")

def gap(ws, row, h=8):
    ws.row_dimensions[row].height = h


# ══════════════════════════════════════════════════════════════════════════════
# 1. ÜRETİM RAPORU
# ══════════════════════════════════════════════════════════════════════════════
wb1 = Workbook()
ws  = wb1.active
ws.title = "Üretim Raporu"
ws.sheet_view.showGridLines = False
set_widths(ws, {"A": 30, "B": 28, "C": 28, "D": 22})

title_row(ws, 1, 4,
    "KOCAER CELIK  -  URETIM PARTISI RAPORU",
    "Uretim Kalite Departmani  -  Manisa Tesisi")

gap(ws, 3)
section(ws, 4, 4, "  BELGE KIMLIGI")
for i, (l, v) in enumerate([
    ("Belge No",          "UR-KCR-2026-0312-A"),
    ("Revizyon",          "Rev. 0  -  Ilk Yayin"),
    ("Yayin Tarihi",      "12.03.2026"),
    ("Hazirlayan",        "Uretim Kontrol Departmani"),
    ("Onaylayan",         "Kalite Muduru"),
    ("Standart",          "EN 10025-2 / EN 10219-1"),
], start=5):
    kv(ws, i, l, v, alt=(i % 2 == 1), cols=4)

gap(ws, 11)
section(ws, 12, 4, "  PARTI BILGILERI")
batch_rows = [
    ("Parti Numarasi (Kocaer)",  "KCR-2026-0312-A"),
    ("Tedarikci Parti Kodu",     "ERD-2026-0312"),
    ("Urun Kodu",                "IPE-200"),
    ("Urun Tanimi",              "IPE 200 Yapisal Celik Profil"),
    ("GTIN",                     "08690000000012"),
    ("HS Code (GTIP)",           "7216.33.10"),
    ("Ocak / Firin No",          "EAF-03  (Elektrik Ark Ocagi)"),
    ("Uretim Tarihi",            "12.03.2026"),
    ("Vardiya",                  "Gece Vardiyasi - 22:00-06:00"),
    ("Parti Miktari",            "42.5 ton"),
    ("Birim Agirlik",            "26.2 kg/m"),
    ("Toplam Uzunluk",           "1623.7 m"),
]
for i, (l, v) in enumerate(batch_rows, start=13):
    kv(ws, i, l, v, alt=(i % 2 == 1), cols=4)

gap(ws, 25)
section(ws, 26, 4, "  URETIM PARAMETRELERI")
prod_rows = [
    ("Uretim Rotasi",         "EAF -> LF -> CCM -> Rolling"),
    ("Dokum Yontemi",         "Surekli Dokum (CCM)"),
    ("Kutuk Boyutu",          "150 x 150 mm"),
    ("Haddeleme Sicakligi",   "1180 C"),
    ("Sogutma Yontemi",       "Hava Sogutmasi"),
    ("Yuzey Kalitesi",        "S3  (EN 10163-3)"),
    ("Tolerans Sinifi",       "Sinif A  (EN 10034)"),
]
for i, (l, v) in enumerate(prod_rows, start=27):
    kv(ws, i, l, v, alt=(i % 2 == 1), cols=4)

gap(ws, 34)
section(ws, 35, 4, "  CEVRE & ENERJI")
env_rows = [
    ("Uretim Rotasi (CBAM)",   "EAF (Elektrik Ark Ocagi)"),
    ("Hurda Orani",            "%92.4  (EAF yukleme)"),
    ("Enerji Tuketimi",        "542 kWh/ton"),
    ("Spesifik CO2 Emisyonu",  "0.421 tCO2/ton"),
    ("CO2 Kapsam 1",           "0.089 tCO2/ton"),
    ("CO2 Kapsam 2",           "0.332 tCO2/ton"),
    ("Referans EPD",           "IBU-EPD-2023-KOCAER-001"),
]
for i, (l, v) in enumerate(env_rows, start=36):
    kv(ws, i, l, v, alt=(i % 2 == 1), cols=4)

gap(ws, 43)
section(ws, 44, 4, "  TESIS & URETICI")
fac_rows = [
    ("Sirket Adi",    "Kocaer Celik Sanayi ve Ticaret A.S."),
    ("Tesis",         "Kocaer Celik Manisa Haddehanesi"),
    ("Adres",         "Organize San. Bolgesi, 45030 Manisa, Turkiye"),
    ("GLN",           "8690000000019"),
    ("DUNS",          "501234567"),
    ("AB Temsilcisi", "Kocaer Steel GmbH, Dusseldorf, DE"),
]
for i, (l, v) in enumerate(fac_rows, start=45):
    kv(ws, i, l, v, alt=(i % 2 == 1), cols=4)

gap(ws, 51)
footer(ws, 52, 4, "Bu belge Kocaer DPP Sistemi tarafindan otomatik olusturulmustur. Gizlilik: Sirket Ici.")

wb1.save(os.path.join(OUT, "UretimRaporu_0312.xlsx"))
print("OK  UretimRaporu_0312.xlsx")


# ══════════════════════════════════════════════════════════════════════════════
# 2. KİMYASAL ANALİZ
# ══════════════════════════════════════════════════════════════════════════════
wb2 = Workbook()
ws2 = wb2.active
ws2.title = "Kimyasal Analiz"
ws2.sheet_view.showGridLines = False
set_widths(ws2, {"A": 30, "B": 18, "C": 18, "D": 18, "E": 20})

title_row(ws2, 1, 5,
    "KOCAER CELIK  -  KIMYASAL KOMPOZISYON ANALIZ RAPORU",
    "Kalite Kontrol Laboratuvari  -  Analiz Raporu  -  EN 10025-2 / ASTM A6")

gap(ws2, 3)
section(ws2, 4, 5, "  BELGE BILGISI")
for i, (l, v) in enumerate([
    ("Belge No",      "KA-KCR-2026-0312-A"),
    ("Parti No",      "KCR-2026-0312-A"),
    ("Urun",          "IPE 200  -  S355JR"),
    ("Analiz Tarihi", "12.03.2026"),
    ("Analist",       "Kimya Laboratuvari"),
    ("Analiz Metodu", "OES (Optik Emisyon Spektrometrisi) + Combustion"),
], start=5):
    kv(ws2, i, l, v, alt=(i % 2 == 1), cols=5)

gap(ws2, 11)
section(ws2, 12, 5, "  ELEMENTIYAL KOMPOZISYON  (% Kutle)")
th(ws2, 13, ["Element", "Olculen Deger (%)", "Min. Sinir (%)", "Maks. Sinir (%)", "Sonuc"])

CHEM = [
    ("Karbon (C)",              0.170, "",     0.20,  True),
    ("Manganez (Mn)",           1.480, 0.60,   1.60,  True),
    ("Silisyum (Si)",           0.320, "",     0.55,  True),
    ("Fosfor (P)",              0.018, "",     0.040, True),
    ("Kukurt (S)",              0.012, "",     0.040, True),
    ("Azot (N)",                0.009, "",     0.012, True),
    ("Krom (Cr)",               0.038, "",     0.30,  True),
    ("Nikel (Ni)",              0.021, "",     0.30,  True),
    ("Molibden (Mo)",           0.004, "",     0.10,  True),
    ("Vanadyum (V)",            0.003, "",     0.12,  True),
    ("Niyobyum (Nb)",           0.000, "",     0.050, True),
    ("Titanyum (Ti)",           0.001, "",     0.030, True),
    ("Bakir (Cu)",              0.042, "",     0.40,  True),
    ("Aluminyum (Al - toplam)", 0.031, 0.015,  "",    True),
    ("Bor (B)",                 0.0002,"",    0.0050, True),
]

for i, (elem, meas, mn, mx, good) in enumerate(CHEM):
    r = 14 + i
    alt = i % 2 == 1
    td(ws2, r, 1, elem, alt=alt, bold=True)

    cm = ws2.cell(row=r, column=2, value=meas)
    cm.fill = fill(LIGHT_GRAY if alt else WHITE)
    cm.font = font(STEEL_BLUE, True)
    cm.alignment = align("center"); cm.border = thin()
    cm.number_format = "0.000"

    td(ws2, r, 3, mn if mn != "" else "-", alt=alt, h="center")
    td(ws2, r, 4, mx if mx != "" else "-", alt=alt, h="center")
    ok_cell(ws2, r, 5, good)

# Ceq
r_ceq = 14 + len(CHEM)
ceq = round(0.170 + 1.480/6 + (0.038+0.021+0.042)/15 + (0.004+0.003+0.000)/5, 3)
ws2.row_dimensions[r_ceq].height = 22
cl = ws2.cell(row=r_ceq, column=1, value="Karbon Esdeğeri (Ceq)")
cl.fill = fill(LIGHT_BLUE); cl.font = font(STEEL_BLUE, True); cl.alignment = align("left", 1); cl.border = thin()

cv2 = ws2.cell(row=r_ceq, column=2, value=ceq)
cv2.number_format = "0.000"
cv2.fill = fill(LIGHT_BLUE); cv2.font = font(STEEL_BLUE, True, 11)
cv2.alignment = align("center"); cv2.border = thin()

ws2.merge_cells(start_row=r_ceq, start_column=3, end_row=r_ceq, end_column=4)
cf = ws2.cell(row=r_ceq, column=3,
    value="Ceq = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15  [IIW]")
cf.fill = fill(LIGHT_BLUE); cf.font = font("475569", italic=True, size=9)
cf.alignment = align("left", 1); cf.border = thin()

ok_cell(ws2, r_ceq, 5, ceq <= 0.45)

gap(ws2, r_ceq + 1)
footer(ws2, r_ceq + 2, 5,
    "Bu rapor EN 10025-2 standardina gore hazirlanmistir. ISO/IEC 17025 akreditasyonu kapsamindadir.")

wb2.save(os.path.join(OUT, "KimyasalAnaliz_0312.xlsx"))
print("OK  KimyasalAnaliz_0312.xlsx")


# ══════════════════════════════════════════════════════════════════════════════
# 3. MEKANİK TEST RAPORU
# ══════════════════════════════════════════════════════════════════════════════
wb3 = Workbook()
ws3 = wb3.active
ws3.title = "Mekanik Test"
ws3.sheet_view.showGridLines = False
set_widths(ws3, {"A": 32, "B": 22, "C": 20, "D": 16, "E": 20})

title_row(ws3, 1, 5,
    "KOCAER CELIK  -  MEKANIK TEST RAPORU",
    "Mekanik Ozellikler  -  EN 10025-2 / EN ISO 6892-1 / EN ISO 148-1")

gap(ws3, 3)
section(ws3, 4, 5, "  BELGE BILGISI")
for i, (l, v) in enumerate([
    ("Belge No",       "MT-KCR-2026-0312-A"),
    ("Parti No",       "KCR-2026-0312-A"),
    ("Urun",           "IPE 200  -  S355JR"),
    ("Test Tarihi",    "12.03.2026"),
    ("Test Lab.",      "Kocaer Mekanik Test Laboratuvari"),
    ("Test Standardi", "EN ISO 6892-1:2019  +  EN ISO 148-1:2016"),
], start=5):
    kv(ws3, i, l, v, alt=(i % 2 == 1), cols=5)

gap(ws3, 11)
section(ws3, 12, 5, "  CEKILME DENEYi  (EN ISO 6892-1)")
th(ws3, 13, ["Ozellik", "Olculen Deger", "Min. Gereksinim", "Birim", "Sonuc"])

TENSILE = [
    ("Akma Dayanimı (ReH)",          385,   355,   "MPa", True),
    ("Cekme Dayanimı (Rm)",          527,   470,   "MPa", True),
    ("Uzama (A5)",                   22.4,  22.0,  "%",   True),
    ("Kesit Daralması (Z)",          63.5,  "",    "%",   True),
    ("Orantı Siniri (Rp0.2)",        361,   "",    "MPa", True),
    ("Akma/Cekme Orani (ReH/Rm)",   "0.73", "",   "-",   True),
]
for i, (prop, meas, mn, unit, good) in enumerate(TENSILE):
    r = 14 + i
    alt = i % 2 == 1
    td(ws3, r, 1, prop, alt=alt, bold=True)
    cm = ws3.cell(row=r, column=2, value=meas)
    cm.fill = fill(LIGHT_GRAY if alt else WHITE)
    cm.font = font(STEEL_BLUE, True); cm.alignment = align("center"); cm.border = thin()
    td(ws3, r, 3, mn if mn != "" else "-", alt=alt, h="center")
    td(ws3, r, 4, unit, alt=alt, h="center")
    ok_cell(ws3, r, 5, good)

gap(ws3, 20)
section(ws3, 21, 5, "  CHARPY DARBE DENEYi  (EN ISO 148-1)  -  V-Centik")
th(ws3, 22, ["Test Sicakligi", "Numune 1 (J)", "Numune 2 (J)", "Numune 3 (J)", "Ort. (J)  >= 27 J"])

for i, (temp, v1, v2, v3) in enumerate([("0 C", 48, 51, 46), ("-20 C", 42, 39, 45)]):
    r = 23 + i
    alt = i % 2 == 1
    td(ws3, r, 1, temp, alt=alt, bold=True)
    for col, val in enumerate([v1, v2, v3], start=2):
        td(ws3, r, col, val, alt=alt, h="center")
    avg = round((v1+v2+v3)/3, 1)
    c_avg = ws3.cell(row=r, column=5, value=f"{avg} J")
    c_avg.fill = fill(GREEN_LIGHT if avg >= 27 else "FEE2E2")
    c_avg.font = font(GREEN_DARK if avg >= 27 else "DC2626", True)
    c_avg.alignment = align("center"); c_avg.border = thin()

gap(ws3, 25)
section(ws3, 26, 5, "  SERTLIK OLCUMLERI  (Vickers HV10)")
th(ws3, 27, ["Olcum Noktasi", "HV10 Degeri", "Min.", "Maks.", "Sonuc"])

for i, (pt, hv, mn, mx) in enumerate([
    ("Flans Ust",    168, 120, 250),
    ("Govde Merkez", 171, 120, 250),
    ("Flans Alt",    165, 120, 250),
]):
    r = 28 + i
    alt = i % 2 == 1
    td(ws3, r, 1, pt, alt=alt, bold=True)
    cm = ws3.cell(row=r, column=2, value=hv)
    cm.fill = fill(LIGHT_GRAY if alt else WHITE)
    cm.font = font(STEEL_BLUE, True); cm.alignment = align("center"); cm.border = thin()
    td(ws3, r, 3, mn, alt=alt, h="center")
    td(ws3, r, 4, mx, alt=alt, h="center")
    ok_cell(ws3, r, 5, mn <= hv <= mx)

gap(ws3, 31)
footer(ws3, 32, 5,
    "Akredite laboratuvar tarafindan duzenlenmistir. EN 10204:2004 Tip 3.1. Kocaer Celik Kalite Yonetim Sistemi.")

wb3.save(os.path.join(OUT, "MekanikTest_0312.xlsx"))
print("OK  MekanikTest_0312.xlsx")

print("\nTum dosyalar olusturuldu ->", os.path.abspath(OUT))
