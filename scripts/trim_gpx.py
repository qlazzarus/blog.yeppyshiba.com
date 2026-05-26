#!/usr/bin/env python3
import sys
from xml.etree import ElementTree as ET
from datetime import datetime, timezone

if len(sys.argv) < 4:
    print("Usage: trim_gpx.py <input.gpx> <output.gpx> <start_iso_time>")
    sys.exit(2)

infile = sys.argv[1]
outfile = sys.argv[2]
start_iso = sys.argv[3]

# normalize timestamp with Z
if start_iso.endswith('Z'):
    start_iso = start_iso.replace('Z', '+00:00')
start_dt = datetime.fromisoformat(start_iso)

ET.register_namespace('', 'http://www.topografix.com/GPX/1/1')
ET.register_namespace('gpxtpx', 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1')
ET.register_namespace('gpxx', 'http://www.garmin.com/xmlschemas/GpxExtensions/v3')

tree = ET.parse(infile)
root = tree.getroot()

# find first trkseg
trkseg = None
for elem in root.iter():
    if elem.tag.endswith('trkseg'):
        trkseg = elem
        break

if trkseg is None:
    print('No <trkseg> found')
    sys.exit(1)

trkpts = [pt for pt in list(trkseg) if pt.tag.endswith('trkpt')]
start_index = None
for i, pt in enumerate(trkpts):
    # find time child
    t_elem = None
    for c in pt:
        if c.tag.endswith('time'):
            t_elem = c
            break
    if t_elem is None:
        continue
    txt = t_elem.text
    if txt is None:
        continue
    if txt.endswith('Z'):
        txt = txt.replace('Z', '+00:00')
    try:
        dt = datetime.fromisoformat(txt)
    except Exception:
        continue
    if dt >= start_dt:
        start_index = i
        break

if start_index is None:
    print('No trackpoint at or after', start_dt.isoformat())
    sys.exit(1)

# remove all earlier points
for pt in trkpts[:start_index]:
    trkseg.remove(pt)

# Optionally update metadata time to first remaining point time
first_time = None
for c in trkseg:
    if c.tag.endswith('trkpt'):
        for cc in c:
            if cc.tag.endswith('time'):
                first_time = cc.text
                break
        break
if first_time is not None:
    meta = root.find('.//{http://www.topografix.com/GPX/1/1}metadata')
    if meta is not None:
        tmeta = meta.find('{http://www.topografix.com/GPX/1/1}time')
        if tmeta is not None:
            tmeta.text = first_time

# write output
tree.write(outfile, encoding='utf-8', xml_declaration=True)
print('Wrote', outfile)
