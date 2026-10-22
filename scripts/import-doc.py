import zipfile,xml.etree.ElementTree as ET,json,re,pathlib
root=pathlib.Path(__file__).resolve().parent.parent
with zipfile.ZipFile(next(root.glob('*.docx'))) as z:
    xml=ET.fromstring(z.read('word/document.xml'))
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
items={}; current=None
for p in xml.findall('.//w:body/w:p',ns):
    t=''.join(x.text or '' for x in p.findall('.//w:t',ns))
    m=re.match(r'作业(\d+)',t)
    if m: current=m.group(1); items[current]=[]
    elif current and t.strip(): items[current].append(t)
(root/'src'/'prompts.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')
