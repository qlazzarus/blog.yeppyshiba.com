#!/usr/bin/env python3
"""Extend a binary STL by extruding cross sections, without scaling features."""
import argparse, struct, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'public/Bc250_Ikea_Open_Frame_case_-_Back_Panel.stl'
OUTPUT = ROOT / 'tools/bc250-panel/extended.stl'

def read_stl(path):
    with path.open('rb') as f:
        f.read(80); n, = struct.unpack('<I', f.read(4))
        result = []
        for _ in range(n):
            data = f.read(50)
            if len(data) != 50: raise ValueError('Incomplete binary STL')
            t = struct.unpack('<12fH', data)
            result.append([tuple(t[i:i+3]) for i in (3, 6, 9)])
        return result

def clip(poly, axis, plane, lower):
    out = []
    for a, b in zip(poly, poly[1:] + poly[:1]):
        da, db = a[axis] - plane, b[axis] - plane
        ina, inb = (da <= 0, db <= 0) if lower else (da >= 0, db >= 0)
        if ina: out.append(a)
        if ina != inb:
            t = da / (da - db)
            p = [a[i] + t * (b[i] - a[i]) for i in range(3)]
            p[axis] = plane
            out.append(tuple(p))
    # Avoid zero-area triangles where a vertex lies exactly on the plane.
    cleaned = []
    for p in out:
        if not cleaned or p != cleaned[-1]: cleaned.append(p)
    if len(cleaned) > 1 and cleaned[0] == cleaned[-1]: cleaned.pop()
    return cleaned

def extend(tris, axis, plane, amount):
    out = []
    def shift(p):
        q = list(p); q[axis] += amount; return tuple(q)
    def add(poly):
        for i in range(1, len(poly)-1): out.append((poly[0], poly[i], poly[i+1]))
    for tri in tris:
        coords = [p[axis] for p in tri]
        if max(coords) <= plane: out.append(tri); continue
        if min(coords) >= plane: out.append(tuple(shift(p) for p in tri)); continue
        lo = clip(list(tri), axis, plane, True)
        hi = clip(list(tri), axis, plane, False)
        add(lo); add([shift(p) for p in hi])
        # Reverse the lower polygon's cut edge to orient the extrusion wall.
        for a, b in zip(lo, lo[1:] + lo[:1]):
            if a[axis] == plane and b[axis] == plane and a != b:
                add([b, a, shift(a), shift(b)])
    return out

def straighten_bc_outer_corner(tris):
    """Square the BC250-side outside corner before extending that end."""
    from bisect import bisect_left
    profile={}
    for tri in tris:
        for x,y,z in tri:
            if abs(x)<1e-5 and y<=4.00001 and z>153:
                profile[y]=max(profile.get(y,float('-inf')),z)
    ys=sorted(profile)
    outer=max(profile.values())
    def move(p):
        x,y,z=p
        if y>4 or z<=145: return p
        i=bisect_left(ys,y)
        if i==0: edge=profile[ys[0]]
        elif i>=len(ys): edge=profile[ys[-1]]
        else:
            a,b=ys[i-1],ys[i]
            edge=profile[a]+(profile[b]-profile[a])*(y-a)/(b-a)
        return (x,y,z+0.99*(outer-edge)*(z-145)/(edge-145))
    return [tuple(move(p) for p in tri) for tri in tris]

def split_mesh(tris, axis, plane):
    out=[]
    for tri in tris:
        if min(p[axis] for p in tri) >= plane or max(p[axis] for p in tri) <= plane:
            out.append(tri); continue
        for lower in (True, False):
            poly=clip(list(tri),axis,plane,lower)
            for i in range(1,len(poly)-1): out.append((poly[0],poly[i],poly[i+1]))
    return out

def add_outer_frame(tris, plane=1.05, length=70.0):
    """Extend the BC250 end and fill the added area between its existing sides."""
    tris=split_mesh(tris,0,4.0)
    out=[]; sides={10.0:[],123.5:[]}; start,end=0.0,length
    def shift(p,d): return (p[0],p[1]+d,p[2])
    def add(poly):
        for i in range(1,len(poly)-1): out.append((poly[0],poly[i],poly[i+1]))
    for tri in tris:
        yy=[p[1] for p in tri]
        if max(yy)<=plane: out.append(tri); continue
        if min(yy)>=plane: out.append(tuple(shift(p,length) for p in tri)); continue
        lo=clip(list(tri),1,plane,True); hi=clip(list(tri),1,plane,False)
        add(lo); add([shift(p,length) for p in hi])
        for a,b in zip(lo,lo[1:]+lo[:1]):
            if a[1]!=plane or b[1]!=plane or a==b: continue
            side=next((z for z in sides if abs(a[2]-z)<1e-5 and abs(b[2]-z)<1e-5 and max(a[0],b[0])<=4.00001 and min(a[0],b[0])>=-1e-5),None)
            intervals=((0,start),(end,length)) if side is not None else ((0,start),(start,end),(end,length))
            if side is not None: sides[side].append((a,b))
            for d1,d2 in intervals:
                if d2>d1: add([shift(b,d1),shift(a,d1),shift(a,d2),shift(b,d2)])
    # Bridge across the open part of the section; preserve each side's mesh vertices.
    rows=[]
    for z in (10.0,123.5):
        xs=sorted({round(p[0],10) for edge in sides[z] for p in edge})
        if not xs or abs(xs[0])>1e-5 or abs(xs[-1]-4)>1e-5: raise ValueError('Unexpected BC250 end section')
        rows.append(xs)
    for d,reverse in ((start,True),(end,False)):
        a,b=rows;i=j=0
        while i<len(a)-1 or j<len(b)-1:
            if j==len(b)-1 or (i<len(a)-1 and a[i+1]<=b[j+1]):
                tri=[(a[i],plane+d,10.0),(b[j],plane+d,123.5),(a[i+1],plane+d,10.0)];i+=1
            else:
                tri=[(a[i],plane+d,10.0),(b[j],plane+d,123.5),(b[j+1],plane+d,123.5)];j+=1
            if reverse:tri.reverse()
            out.append(tuple(tri))
    for x,reverse in ((0,True),(4,False)):
        poly=[(x,plane+start,10),(x,plane+end,10),(x,plane+end,123.5),(x,plane+start,123.5)]
        if reverse:poly.reverse()
        add(poly)
    return out

def write_stl(path, tris):
    with path.open('wb') as f:
        f.write(b'BC250 extended cross sections'.ljust(80, b'\0')); f.write(struct.pack('<I',len(tris)))
        for a,b,c in tris:
            u=[b[i]-a[i] for i in range(3)]; v=[c[i]-a[i] for i in range(3)]
            n=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]); length=math.sqrt(sum(x*x for x in n))
            n=tuple(x/length for x in n) if length else (0.,0.,0.)
            f.write(struct.pack('<12fH',*n,*a,*b,*c,0))

def bounds(tris):
    return [max(p[i] for t in tris for p in t)-min(p[i] for t in tris for p in t) for i in range(3)]

if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--length-cut',type=float,default=34.0,help='Y cut plane between slots in original STL coordinates (mm)')
    p.add_argument('--output',type=Path,default=OUTPUT)
    args=p.parse_args()
    mesh=read_stl(SOURCE)
    print('Original X/Y/Z:', *(f'{v:.2f}' for v in bounds(mesh)), 'mm')
    mesh=straighten_bc_outer_corner(mesh)
    mesh=extend(mesh,1,args.length_cut,80.0)
    mesh=add_outer_frame(mesh)
    write_stl(args.output,mesh)
    print('Extended X/Y/Z:', *(f'{v:.2f}' for v in bounds(mesh)), 'mm')
    print('Wrote',args.output, 'triangles:',len(mesh))
