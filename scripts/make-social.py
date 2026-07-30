#!/usr/bin/env python3
"""Generate the 1200x630 Open Graph share card from the real brand assets.

Run after changing the crest or the headline claim:
    python3 scripts/make-social.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
OUT = 'assets/social/og-default.png'
BLACK = (0, 0, 0)
ORANGE = (255, 112, 52)
WARM = (247, 245, 242)

os.makedirs('assets/social', exist_ok=True)

card = Image.new('RGB', (W, H), BLACK)

# Orange bloom, top-right, matching the site's atmosphere
bloom = Image.new('L', (W, H), 0)
bd = ImageDraw.Draw(bloom)
for i in range(70, 0, -1):
    r = int(i / 70 * 620)
    bd.ellipse([W - 250 - r, -180 - r, W - 250 + r, -180 + r], fill=int(3 + (70 - i) * 2.2))
bloom = bloom.resize((W // 6, H // 6)).resize((W, H), Image.BICUBIC)
card = Image.composite(Image.new('RGB', (W, H), ORANGE), card, bloom)

# Second, dimmer bloom bottom-left
bloom2 = Image.new('L', (W, H), 0)
b2 = ImageDraw.Draw(bloom2)
for i in range(60, 0, -1):
    r = int(i / 60 * 520)
    b2.ellipse([-160 - r, H + 120 - r, -160 + r, H + 120 + r], fill=int(2 + (60 - i) * 1.5))
bloom2 = bloom2.resize((W // 6, H // 6)).resize((W, H), Image.BICUBIC)
card = Image.composite(Image.new('RGB', (W, H), ORANGE), card, bloom2)

d = ImageDraw.Draw(card)


def font(size, bold=True):
    """Archivo is a variable font PIL cannot instance, so fall back through
    system faces that share its geometric character."""
    for path in (
        '/System/Library/Fonts/Supplemental/Futura.ttc',
        '/System/Library/Fonts/HelveticaNeue.ttc',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Arial Bold.ttf',
    ):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


# Crest, left
crest = Image.open('assets/badge/sue-angels-badge-orange.png').convert('RGBA')
cs = 190
crest = crest.resize((cs, cs), Image.LANCZOS)
card.paste(crest, (78, (H - cs) // 2 - 30), crest)

x = 78 + cs + 54
d.text((x, 214), "SUE'S ANGELS FC", font=font(74), fill=WARM)
d.text((x, 306), 'League Ten Champions', font=font(46), fill=ORANGE)
d.text((x, 372), 'Unbeaten · 18 wins from 18', font=font(30), fill=(200, 196, 192))
d.text((x, 424), 'Founded 2025 in memory of Susan Anne Martin', font=font(26), fill=(150, 146, 142))
d.text((x, 462), 'Playing for sepsis awareness', font=font(26), fill=(150, 146, 142))

# Brand rule along the bottom
d.rectangle([0, H - 9, W, H], fill=ORANGE)

card.save(OUT, 'PNG', optimize=True)
print(f'{OUT}: {W}x{H}, {os.path.getsize(OUT) / 1024:.0f} KB')
