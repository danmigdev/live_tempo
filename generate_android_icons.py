"""Generate Android launcher icons (legacy + adaptive) for LiveTempo.

Reuses the same circle/play-triangle/tempo-dot mark as generate_icons.py
so the Android launcher icon matches the PWA icon, replacing the
unmodified Capacitor/Android-Studio template icon.
"""
from PIL import Image, ImageDraw

BG = (18, 18, 18, 255)
MARK = (255, 183, 77, 255)

DENSITIES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}

RES_DIR = 'android/app/src/main/res'


def draw_mark(draw, cx, cy, r):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=MARK, width=max(3, int(r / 14)))

    tw = int(r * 0.6)
    th = int(r * 0.7)
    tx = cx - int(tw * 0.15)
    ty = cy
    draw.polygon([
        (tx - tw // 2, ty - th // 2),
        (tx - tw // 2, ty + th // 2),
        (tx + tw // 2, ty)
    ], fill=MARK)

    dot_r = max(3, int(r / 17.5))
    dot_x = cx + int(r * 0.65)
    dot_y = cy - int(r * 0.55)
    draw.ellipse([dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r], fill=MARK)


def legacy_icon(size):
    img = Image.new('RGBA', (size, size), BG)
    draw = ImageDraw.Draw(img)
    draw_mark(draw, size // 2, size // 2, int(size * 0.35))
    return img


def round_icon(size):
    img = legacy_icon(size)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size, size], fill=255)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def foreground_icon(size):
    # Full adaptive-icon canvas; keep the mark inside the ~66% safe zone
    # so OEM launcher masks (circle/squircle/rounded-square) don't clip it.
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    safe = size * 0.66
    draw_mark(draw, size // 2, size // 2, int(safe * 0.35))
    return img


for density, legacy_size in DENSITIES.items():
    d = f'{RES_DIR}/mipmap-{density}'
    legacy_icon(legacy_size).save(f'{d}/ic_launcher.png')
    round_icon(legacy_size).save(f'{d}/ic_launcher_round.png')
    fg_size = int(legacy_size * 2.25)  # matches existing 108/48 foreground ratio
    foreground_icon(fg_size).save(f'{d}/ic_launcher_foreground.png')
    print(f'{density}: legacy {legacy_size}px, foreground {fg_size}px')

print('Done!')
