"""Render the geometric logo at Chrome's required PNG icon sizes."""
from pathlib import Path
from PIL import Image, ImageDraw

out = Path(__file__).resolve().parents[1] / 'icons'
scale = 4
image = Image.new('RGBA', (128 * scale, 128 * scale))
draw = ImageDraw.Draw(image)
lime, ink = '#C4F17A', '#18230F'
def box(coords, radius, fill):
    draw.rounded_rectangle(tuple(int(x * scale) for x in coords), radius=int(radius * scale), fill=fill)
def polygon(points, fill):
    draw.polygon([(x * scale, y * scale) for x, y in points], fill=fill)
box((0, 0, 128, 128), 30, lime)
box((19, 33, 100, 93), 9, ink)
polygon([(33, 86), (60, 86), (33, 106)], ink)
for coords in [(31, 62, 60, 69), (65, 62, 88, 69), (40, 76, 79, 83)]:
    box(coords, 3.5, lime)
points = [(99, 14), (103, 26), (115, 30), (103, 34), (99, 46), (95, 34), (83, 30), (95, 26)]
draw.line([(x * scale, y * scale) for x, y in points + [points[0]]], fill=lime, width=5 * scale, joint='curve')
polygon(points, ink)
for size in (16, 32, 48, 128):
    image.resize((size, size), Image.Resampling.LANCZOS).save(out / f'icon{size}.png')
