"""Generate PWA icons for LiveTempo"""
from PIL import Image, ImageDraw

def create_icon(size, output_path):
    img = Image.new('RGBA', (size, size), (18, 18, 18, 255))
    draw = ImageDraw.Draw(img)

    # Circle
    cx, cy = size // 2, size // 2
    r = int(size * 0.35)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 183, 77), width=max(3, size // 80))

    # Play triangle
    tw = int(r * 0.6)
    th = int(r * 0.7)
    tx = cx - int(tw * 0.15)
    ty = cy
    draw.polygon([
        (tx - tw // 2, ty - th // 2),
        (tx - tw // 2, ty + th // 2),
        (tx + tw // 2, ty)
    ], fill=(255, 183, 77))

    # Small dot (tempo mark)
    dot_r = max(3, size // 50)
    dot_x = cx + int(r * 0.65)
    dot_y = cy - int(r * 0.55)
    draw.ellipse([dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r], fill=(255, 183, 77))

    img.save(output_path, 'PNG')
    print(f'Created {output_path} ({size}x{size})')

create_icon(192, 'public/icons/icon-192.png')
create_icon(512, 'public/icons/icon-512.png')
print('Done!')
