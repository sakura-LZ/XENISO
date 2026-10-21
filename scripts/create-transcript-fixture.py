"""Generate a tiny XLSX with synthetic course/identity fields; no real data."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree.ElementTree import Element, SubElement, tostring

rows = [
    ["课程名", "学分", "成绩", "满分", "学期", "姓名", "学号"],
    ["simulation 概率论", 3, 88, 100, "2025-秋", "合成姓名", "simulation-id"],
    ["simulation Python", 2, 75, 100, "2026-春", "合成姓名", "simulation-id"],
]
sheet = Element("worksheet", xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main")
data = SubElement(sheet, "sheetData")
for index, values in enumerate(rows, 1):
    row = SubElement(data, "row", r=str(index))
    for column, value in enumerate(values):
        cell = SubElement(row, "c", r=f"{chr(65 + column)}{index}", t="n" if isinstance(value, int) else "inlineStr")
        if isinstance(value, int):
            SubElement(cell, "v").text = str(value)
        else:
            SubElement(SubElement(cell, "is"), "t").text = value
contents = '''<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>'''
root_rels = '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'''
book = '''<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="simulation" sheetId="1" r:id="rId1"/></sheets></workbook>'''
book_rels = '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'''
path = Path(__file__).resolve().parents[1] / "tests/fixtures/transcript.simulation.xlsx"
with ZipFile(path, "w", ZIP_DEFLATED) as archive:
    for name, content in {"[Content_Types].xml": contents, "_rels/.rels": root_rels, "xl/workbook.xml": book, "xl/_rels/workbook.xml.rels": book_rels, "xl/worksheets/sheet1.xml": tostring(sheet, encoding="utf-8")}.items():
        archive.writestr(name, content)
print("Created synthetic XLSX fixture; no personal data.")
