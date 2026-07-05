from PIL import Image, ImageDraw, ImageFont
import os

ICONS_DIR = '/home/chenry/workspace/kid-app/packages/frontend/public/icons'
FONT_PATH = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
SIZES = [120, 152, 180, 192, 512]
COLOR_START = (79, 195, 247)
COLOR_END = (186, 104, 200)

font = ImageFont.truetype(FONT_PATH, size=200)

def lerp_color(c1, c2, t: float):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))

for size in SIZES:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    radius = size * 20 // 100
    for y in range(size):
        for x in range(size):
            nx, ny = x / size, y / size
            dist = (nx - 0.5) ** 2 + (ny - 0.5) ** 2
            t = min(dist * 2, 1.0)
            r, g, b = lerp_color(COLOR_START, COLOR_END, t)
            if draw.point((x, y)):
                pass
    draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=None)

    gradient = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    for y in range(size):
        t = y / size
        color = lerp_color(COLOR_START, COLOR_END, t)
        for x in range(size):
            gradient.putpixel((x, y), (*color, 255))

    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=255)

    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    result.paste(gradient, (0, 0), mask)

    font_size = size * 112 // 200
    f = ImageFont.truetype(FONT_PATH, size=font_size)
    bbox = draw.textbbox((0, 0), 'KID', font=f)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) / 2 - bbox[0]
    ty = (size - th) / 2 - bbox[1] - size * 4 // 100

    text_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    text_draw = ImageDraw.Draw(text_layer)
    text_draw.text((tx, ty), 'KID', font=f, fill=(255, 255, 255, 255))

    result = Image.alpha_composite(result, text_layer)

    out_path = os.path.join(ICONS_DIR, f'icon-{size}x{size}.png')
    result.save(out_path, 'PNG')
    print(f'  {out_path} ({size}x{size})')

print('Done')
