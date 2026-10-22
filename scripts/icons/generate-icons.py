"""
Builds the application icons from the UCODIS logo.

Run from the project root: python scripts/icons/generate-icons.py
"""
from PIL import Image, ImageDraw
import numpy as np
import os

SOURCE = 'scripts/icons/logo-source.png'
OUTPUT_DIR = 'public'
SUPERSAMPLING = 8
BRAND_RED = (232, 69, 60)
SOURCE_BACKGROUND = np.array([247, 247, 247], float)
SOURCE_MARK = np.array([238, 70, 59], float)

# Small icons get a larger mark and tighter corners, otherwise the strokes vanish.
MARK_WIDTH_BY_SIZE = {512: 0.88, 180: 0.90, 64: 1.02, 48: 1.08, 32: 1.10, 16: 1.05}
CORNER_RADIUS_BY_SIZE = {512: 0.20, 180: 0.20, 64: 0.19, 48: 0.18, 32: 0.17, 16: 0.15}


def extract_mark(path: str) -> Image.Image:
    pixels = np.asarray(Image.open(path).convert('RGB')).astype(float)
    distance = np.linalg.norm(pixels - SOURCE_BACKGROUND, axis=2)
    alpha = np.clip(distance / np.linalg.norm(SOURCE_MARK - SOURCE_BACKGROUND), 0, 1)
    alpha[alpha < 0.06] = 0
    alpha = np.clip((alpha - 0.06) / 0.94, 0, 1)

    rgba = np.zeros((*alpha.shape, 4), np.uint8)
    rgba[..., :3] = BRAND_RED
    rgba[..., 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')


def tile(mark: Image.Image, size: int) -> Image.Image:
    """Red rounded tile with the mark in white; a width above 1 crops the mark on purpose."""
    canvas_size = size * SUPERSAMPLING
    mask = Image.new('L', (canvas_size, canvas_size), 0)
    radius = int(canvas_size * CORNER_RADIUS_BY_SIZE[size])
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, canvas_size - 1, canvas_size - 1], radius=radius, fill=255
    )

    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.paste(Image.new('RGBA', canvas.size, (*BRAND_RED, 255)), (0, 0), mask)

    white_mark = Image.new('RGBA', mark.size, (255, 255, 255, 255))
    white_mark.putalpha(mark.getchannel('A'))
    mark_width = int(canvas_size * MARK_WIDTH_BY_SIZE[size])
    mark_height = round(mark_width * mark.height / mark.width)

    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    layer.alpha_composite(
        white_mark.resize((mark_width, mark_height), Image.LANCZOS),
        ((canvas_size - mark_width) // 2, (canvas_size - mark_height) // 2),
    )
    layer.putalpha(Image.composite(layer.getchannel('A'), Image.new('L', canvas.size, 0), mask))
    canvas.alpha_composite(layer)
    return canvas.resize((size, size), Image.LANCZOS)


def square_mark(mark: Image.Image, size: int = 240) -> Image.Image:
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    width = int(size * 0.92)
    height = round(width * mark.height / mark.width)
    canvas.alpha_composite(mark.resize((width, height), Image.LANCZOS), ((size - width) // 2, (size - height) // 2))
    return canvas


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    mark = extract_mark(SOURCE)

    tile(mark, 180).save(f'{OUTPUT_DIR}/apple-touch-icon.png')
    tile(mark, 32).save(f'{OUTPUT_DIR}/favicon.png')
    tile(mark, 48).save(
        f'{OUTPUT_DIR}/favicon.ico',
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[tile(mark, 32), tile(mark, 16)],
    )
    square_mark(mark).save(f'{OUTPUT_DIR}/ucodis.webp', 'WEBP', lossless=True, quality=100)
    mark.save(f'{OUTPUT_DIR}/logo-ucodis.png')

    for name in sorted(os.listdir(OUTPUT_DIR)):
        print(name, os.path.getsize(f'{OUTPUT_DIR}/{name}'), 'bytes')


if __name__ == '__main__':
    main()
