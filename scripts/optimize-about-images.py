from pathlib import Path
from PIL import Image


ROOT = Path(r"D:/GrahaPath/frontend")
FILES = [
    "Section 1 image.png",
    "Section 2 image.png",
    "Section 3 image.png",
    "Section 4 image.png",
    "Section 5 image.png",
    "Section 6 image.png",
]
MAX_WIDTH = 1280
QUALITY = 68


def optimize_one(filename: str) -> None:
    src = ROOT / filename
    dst = ROOT / filename.replace(".png", ".webp")
    if not src.exists():
        return
    with Image.open(src) as img:
        img = img.convert("RGB")
        if img.width > MAX_WIDTH:
            ratio = MAX_WIDTH / float(img.width)
            new_size = (MAX_WIDTH, int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        img.save(dst, format="WEBP", quality=QUALITY, method=6)


def main() -> None:
    for item in FILES:
        optimize_one(item)


if __name__ == "__main__":
    main()
