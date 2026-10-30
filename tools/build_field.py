# Builds the expanded field: original island + mirrored "flower hill" island joined by a wooden bridge.
from PIL import Image, ImageDraw, ImageFilter, ImageOps
A = Image.open('island.jpg').convert('RGB'); W, H = A.size; OX = 1100; NW = 2250
B = ImageOps.mirror(A)
out = Image.new('RGB', (NW, H)); out.paste(A, (0, 0))
# right island with feathered left edge over the sky overlap
fm = Image.new('L', (W, H), 255); d = ImageDraw.Draw(fm)
for x in range(52): d.line([(x, 0), (x, H)], fill=int(255 * x / 52))
out.paste(B, (OX, 0), fm)
# bridge
br = Image.new('RGBA', (NW * 2, H * 2), (0, 0, 0, 0)); g = ImageDraw.Draw(br); S = 2
x0, x1, yc, hw = 985, 1270, 405, 34
g.rounded_rectangle([(x0 * S, (yc - hw + 6) * S), (x1 * S, (yc + hw + 14) * S)], 18 * S, fill=(110, 80, 60, 70))  # shadow
for i, x in enumerate(range(x0, x1, 19)):
    c = (226, 190, 150) if i % 2 else (236, 202, 162)
    g.rounded_rectangle([(x * S, (yc - hw) * S), ((x + 16) * S, (yc + hw) * S)], 5 * S, fill=c + (255,), outline=(176, 132, 100, 255), width=2 * S)
for yy in (yc - hw - 4, yc + hw + 2):  # rope rails
    g.line([(x0 * S, yy * S), (x1 * S, yy * S)], fill=(160, 118, 90, 255), width=4 * S)
    for x in range(x0, x1 + 1, 57): g.ellipse([((x - 5) * S, (yy - 9) * S), ((x + 5) * S, (yy + 5) * S)], fill=(190, 145, 110, 255), outline=(150, 108, 80, 255), width=2 * S)
br = br.resize((NW, H), Image.LANCZOS); out = out.convert('RGBA'); out.alpha_composite(br)
out.convert('RGB').save('island_v5.jpg', quality=86)
# mask (scale 4.5 like the original 256x192)
M = Image.open('walkmask.png').convert('L'); mw = round(NW / 4.5); MM = Image.new('L', (mw, M.height), 0)
MM.paste(M, (0, 0)); MB = ImageOps.mirror(M); ox = round(OX / 4.5)
MM.paste(Image.composite(MB, MM.crop((ox, 0, ox + M.width, M.height)), MB.point(lambda v: 255 if v > 128 else 0)), (ox, 0))
dm = ImageDraw.Draw(MM); dm.rectangle([(x0 - 10) / 4.5, (yc - hw + 8) / 4.5, (x1 + 10) / 4.5, (yc + hw - 2) / 4.5], fill=255)
MM.save('walkmask_v5.png'); print(out.size, MM.size)
