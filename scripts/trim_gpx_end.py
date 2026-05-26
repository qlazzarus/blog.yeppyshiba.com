#!/usr/bin/env python3
import sys
from xml.etree import ElementTree as ET
from datetime import datetime

if len(sys.argv) < 3:
    print("Usage: trim_gpx_end.py <file.gpx> <end_iso_time_UTC>")
    sys.exit(2)

path = sys.argv[1]
end_iso = sys.argv[2]
if end_iso.endswith('Z'):
    end_iso = end_iso.replace('Z', '+00:00')
end_dt = datetime.fromisoformat(end_iso)

ET.register_namespace('', 'http://www.topografix.com/GPX/1/1')
ET.register_namespace('gpxtpx', 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1')
ET.register_namespace('gpxx', 'http://www.garmin.com/xmlschemas/GpxExtensions/v3')

tree = ET.parse(path)
root = tree.getroot()

# find first trkseg
trkseg = None
for elem in root.iter():
    if elem.tag.endswith('trkseg'):
        trkseg = elem
        break

if trkseg is None:
    print('No <trkseg> found in', path)
    sys.exit(1)

trkpts = [pt for pt in list(trkseg) if pt.tag.endswith('trkpt')]
remove_idxs = []
for i, pt in enumerate(trkpts):
    t_elem = None
    for c in pt:
        if c.tag.endswith('time'):
            t_elem = c
            break
    if t_elem is None or t_elem.text is None:
        continue
    txt = t_elem.text
    if txt.endswith('Z'):
        txt = txt.replace('Z', '+00:00')
    try:
        dt = datetime.fromisoformat(txt)
    except Exception:
        continue
    if dt > end_dt:
        remove_idxs.append(i)

# remove from last to first index to avoid reindexing issues
for idx in reversed(remove_idxs):
    trkseg.remove(trkpts[idx])

# update metadata time to last remaining point if present
last_time = None
for c in reversed(list(trkseg)):
    if c.tag.endswith('trkpt'):
        for cc in c:
            if cc.tag.endswith('time'):
                last_time = cc.text
                break
        if last_time:
            break
if last_time:
    meta = root.find('.//{http://www.topografix.com/GPX/1/1}metadata')
    if meta is not None:
        tmeta = meta.find('{http://www.topografix.com/GPX/1/1}time')
        if tmeta is not None:
            tmeta.text = last_time

tree.write(path, encoding='utf-8', xml_declaration=True)
print('Trimmed', path, 'removed', len(remove_idxs), 'points; last_time=', last_time)
