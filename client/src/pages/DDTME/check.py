import re
with open(r'd:\PMS\Project-management\client\src\pages\DDTME\DDTMETable.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

modal_start = text.find('{/* ---- Upload Excel Column Mapping Modal ---- */}')
header_start = text.find('{/* --- 1. HEADER ', modal_start)
print(text[header_start-200:header_start+50])
