#!/usr/bin/env python3
"""Regenerate So, When? brand icons from Quicksand Bold."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ASSETS = Path(__file__).resolve().parent.parent / 'assets'
FONT_PATH = Path(__file__).resolve().parent.parent / (
    'node_modules/@expo-google-fonts/quicksand/700Bold/Quicksand_700Bold.ttf'
)
TEAL = (20, 122, 120, 255)
INK = (42, 44, 49, 255)
CANVAS = (250, 248, 245, 255)


def load_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_PATH), size=size)


def measure(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont):
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1], box


def draw_logo(size: int, bg, line1_color, line2_color, pad_ratio=0.12, monochrome=False):
    img = Image.new('RGBA', (size, size), bg)
    draw = ImageDraw.Draw(img)
    target_width = size * (1 - 2 * pad_ratio)
    font_size = int(size * 0.28)
    line1, line2 = 'So,', 'When?'

    def dims(fs):
        f = load_font(fs)
        w1, h1, _ = measure(draw, line1, f)
        w2, h2, _ = measure(draw, line2, f)
        gap = int(fs * 0.08)
        return f, w1, h1, w2, h2, gap, max(w1, w2), h1 + gap + h2

    f, w1, h1, w2, h2, gap, block_w, block_h = dims(font_size)
    while (block_w > target_width or block_h > size * (1 - 2 * pad_ratio)) and font_size > 20:
        font_size -= 2
        f, w1, h1, w2, h2, gap, block_w, block_h = dims(font_size)

    top = (size - block_h) / 2 - size * 0.02
    x1 = (size - w1) / 2
    x2 = (size - w2) / 2
    _, _, b1 = measure(draw, line1, f)
    _, _, b2 = measure(draw, line2, f)
    y1 = top - b1[1]
    y2 = top + h1 + gap - b2[1]
    c1 = c2 = (0, 0, 0, 255) if monochrome else (line1_color, line2_color)[0:2]
    if not monochrome:
        c1, c2 = line1_color, line2_color
    draw.text((x1, y1), line1, font=f, fill=c1)
    draw.text((x2, y2), line2, font=f, fill=c2)
    return img


def save_rgb_canvas(img: Image.Image, name: str, size=None):
    out = img.copy()
    if size:
        out = out.resize((size, size), Image.Resampling.LANCZOS)
    rgb = Image.new('RGB', out.size, CANVAS[:3])
    rgb.paste(out, mask=out.split()[3] if out.mode == 'RGBA' else None)
    path = ASSETS / name
    rgb.save(path, 'PNG')
    print(f'wrote {path}')


def main():
    ASSETS.mkdir(exist_ok=True)
    icon = draw_logo(1024, CANVAS, TEAL, INK, pad_ratio=0.14)
    save_rgb_canvas(icon, 'icon.png')
    draw_logo(1024, (0, 0, 0, 0), TEAL, INK, pad_ratio=0.22).save(
        ASSETS / 'android-icon-foreground.png', 'PNG'
    )
    Image.new('RGBA', (1024, 1024), CANVAS).save(ASSETS / 'android-icon-background.png', 'PNG')
    draw_logo(1024, (0, 0, 0, 0), INK, INK, pad_ratio=0.22, monochrome=True).save(
        ASSETS / 'android-icon-monochrome.png', 'PNG'
    )
    save_rgb_canvas(draw_logo(1024, CANVAS, TEAL, INK, pad_ratio=0.16), 'splash-icon.png')
    save_rgb_canvas(draw_logo(512, CANVAS, TEAL, INK, pad_ratio=0.14), 'favicon.png', size=48)
    save_rgb_canvas(draw_logo(512, CANVAS, TEAL, INK, pad_ratio=0.14), 'store-icon-512.png')

    feat = Image.new('RGB', (1024, 500), CANVAS[:3])
    draw = ImageDraw.Draw(feat)
    font_size = 120
    f = load_font(font_size)
    line1, line2 = 'So,', 'When?'
    w1, h1, b1 = measure(draw, line1, f)
    w2, h2, b2 = measure(draw, line2, f)
    gap = 10
    while max(w1, w2) > 900 and font_size > 40:
        font_size -= 4
        f = load_font(font_size)
        w1, h1, b1 = measure(draw, line1, f)
        w2, h2, b2 = measure(draw, line2, f)
        gap = int(font_size * 0.08)
    block_h = h1 + gap + h2
    top = (500 - block_h) / 2 - 8
    draw.text(((1024 - w1) / 2, top - b1[1]), line1, font=f, fill=TEAL[:3])
    draw.text(((1024 - w2) / 2, top + h1 + gap - b2[1]), line2, font=f, fill=INK[:3])
    small = load_font(22)
    footer = 'Palari Labs, Inc.'
    fw, fh, fb = measure(draw, footer, small)
    draw.text(((1024 - fw) / 2, 500 - fh - 28 - fb[1]), footer, font=small, fill=(107, 114, 128))
    feat.save(ASSETS / 'store-feature-graphic.png', 'PNG')
    print('wrote assets/store-feature-graphic.png')
    print('done')


if __name__ == '__main__':
    main()
