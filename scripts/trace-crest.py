#!/usr/bin/env python3
"""
trace-crest.py — vectorise the Sue's Angels crest for the 3D hero.

Produces two overlay-aligned SVGs (same 0 0 512 512 viewBox) from the
transparent cutout PNG:

  assets/badge/sue-angels-crest-silhouette.svg  — the outer SHIELD shape
      (from the alpha channel). Extrude / bevel / use as a mask or 3D geometry.

  assets/badge/sue-angels-crest-marks.svg       — the VOLT elements
      (angel + wings + halo + "SUE'S ANGELS" + EST 2025 + motto), traced by
      colour. These are the glowing parts to float/stagger out of the shield.

They share the same coordinate space, so layering marks on top of the
silhouette reconstructs the crest. Fill colours are the brand tokens and can
be overridden in CSS/JS (the paths are what matter).

Also writes *-mask.png previews so the trace masks can be eyeballed.

Run:  python3 scripts/trace-crest.py
Deps: pip install potracer numpy pillow
"""
import os
import numpy as np
from PIL import Image
import potrace

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "badge", "sue-angels-badge-cutout.png")
OUT_DIR = os.path.join(ROOT, "assets", "badge")

NAVY = "#071D29"
VOLT = "#D6F23A"


H = 512  # canvas height; potrace emits y-up maths coords, SVG wants y-down.


def pt(p):
    """potracer Point -> (x, y) flipped to y-down SVG space.

    Flipping here (rather than a transform attribute) keeps path orientation
    consistent with standard SVG winding, which three.js SVGLoader relies on
    to classify solids vs holes. Raw potrace coords render fine in 2D but
    invert solid/hole classification when extruded."""
    try:
        x, y = float(p.x), float(p.y)
    except AttributeError:
        x, y = float(p[0]), float(p[1])
    return x, H - y


def trace_to_d(mask, turdsize=8, opttolerance=0.2):
    """Trace a boolean mask (True = foreground) to an SVG path 'd' string."""
    bmp = potrace.Bitmap(mask)
    path = bmp.trace(turdsize=turdsize, opttolerance=opttolerance)
    out = []
    for curve in path:
        sx, sy = pt(curve.start_point)
        d = [f"M{sx:.2f},{sy:.2f}"]
        for seg in curve.segments:
            ex, ey = pt(seg.end_point)
            if seg.is_corner:
                cx, cy = pt(seg.c)
                d.append(f"L{cx:.2f},{cy:.2f} L{ex:.2f},{ey:.2f}")
            else:
                c1x, c1y = pt(seg.c1)
                c2x, c2y = pt(seg.c2)
                d.append(f"C{c1x:.2f},{c1y:.2f} {c2x:.2f},{c2y:.2f} {ex:.2f},{ey:.2f}")
        d.append("Z")
        out.append(" ".join(d))
    return " ".join(out)


def write_svg(path_d, fill, out_path, w=512, h=512):
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'width="{w}" height="{h}" fill="none">\n'
        f'  <path d="{path_d}" fill="{fill}" fill-rule="evenodd"/>\n'
        f'</svg>\n'
    )
    with open(out_path, "w") as f:
        f.write(svg)
    return len(svg)


def main():
    img = Image.open(SRC).convert("RGBA")
    arr = np.array(img)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

    # 1) Shield silhouette from alpha.
    shield = a > 128
    d_shield = trace_to_d(shield, turdsize=16, opttolerance=0.15)
    write_svg(d_shield, NAVY, os.path.join(OUT_DIR, "sue-angels-crest-silhouette.svg"))
    Image.fromarray((shield * 255).astype("uint8")).save(
        os.path.join(OUT_DIR, "sue-angels-crest-silhouette-mask.png"))

    # 2) Volt marks by colour: yellow-green = high G, low-ish B, visible alpha.
    volt = (a > 128) & (g > 150) & (b < 140) & (r > 110)
    d_marks = trace_to_d(volt, turdsize=6, opttolerance=0.2)
    write_svg(d_marks, VOLT, os.path.join(OUT_DIR, "sue-angels-crest-marks.svg"))
    Image.fromarray((volt * 255).astype("uint8")).save(
        os.path.join(OUT_DIR, "sue-angels-crest-marks-mask.png"))

    print("shield px:", int(shield.sum()), "| volt px:", int(volt.sum()))
    print("wrote sue-angels-crest-silhouette.svg + sue-angels-crest-marks.svg (+ mask previews)")
    print("note: y-axis flipped to SVG space; solids/holes classify correctly in three.js")


if __name__ == "__main__":
    main()
