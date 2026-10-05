import numpy as np
from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1920, 640

# Fonts (Using default Windows Segoe UI)
font_badge = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 14)
font_h1 = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 60)
font_sub = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 24)
font_btn = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 18)

# Minimal Black Background
canvas = Image.new('RGBA', (WIDTH, HEIGHT), (12, 12, 12, 255))
draw = ImageDraw.Draw(canvas)

# Let's add a very subtle radial glow in the center to make it not completely flat
for y in range(HEIGHT):
    for x in range(WIDTH):
        # Distance from center
        dx = x - WIDTH // 2
        dy = y - HEIGHT // 2
        dist = (dx**2 + dy**2)**0.5
        max_dist = WIDTH // 1.5
        intensity = max(0, 1 - (dist / max_dist))
        # Subtle glow (max 25)
        val = int(12 + intensity * 15)
        # We can optimize this by doing an overlay instead of per-pixel if it's too slow, but for 1920x640 python handles it in a few seconds.
        # Actually, let's use a faster way.

# Faster way to draw radial gradient
y_indices, x_indices = np.indices((HEIGHT, WIDTH))
dx = x_indices - WIDTH // 2
dy = y_indices - HEIGHT // 2
dist = np.sqrt(dx**2 + dy**2)
max_dist = WIDTH / 1.5
intensity = np.clip(1 - (dist / max_dist), 0, 1)
pixels = (10 + intensity * 18).astype(np.uint8)
pixels_rgba = np.stack([pixels, pixels, pixels, np.full((HEIGHT, WIDTH), 255, dtype=np.uint8)], axis=-1)
canvas = Image.fromarray(pixels_rgba, 'RGBA')
draw = ImageDraw.Draw(canvas)


# Center-aligned typography (minimalistic)
# 1. Badge
badge_text = 'AI ELIGIBILITY ENGINE'
tb_len = int(draw.textlength(badge_text, font=font_badge))
tb_w = tb_len + 40
tb_h = 36

badge_x = (WIDTH - tb_w) // 2
badge_y = 160

draw.rounded_rectangle([(badge_x, badge_y), (badge_x + tb_w, badge_y + tb_h)], radius=18, fill=(30, 30, 30, 255), outline=(60, 60, 60, 255), width=1)
draw.ellipse([(badge_x + 14, badge_y + 13), (badge_x + 24, badge_y + 23)], fill=(255, 255, 255, 255))
draw.text((badge_x + 32, badge_y + 8), badge_text, fill=(200, 200, 200, 255), font=font_badge)

# 2. Headline
h_text1 = 'Know Where You Qualify.'
h_text2 = 'Before You Apply.'

h_y1 = badge_y + 70
h1_len = int(draw.textlength(h_text1, font=font_h1))
draw.text(((WIDTH - h1_len) // 2, h_y1), h_text1, fill=(255, 255, 255, 255), font=font_h1)

h_y2 = h_y1 + 80
h2_len = int(draw.textlength(h_text2, font=font_h1))
draw.text(((WIDTH - h2_len) // 2, h_y2), h_text2, fill=(160, 160, 160, 255), font=font_h1)

# 3. Subtitle
sub_text = 'Match your degree, age, and category with official exam criteria in seconds.'
sub_y = h_y2 + 90
sub_len = int(draw.textlength(sub_text, font=font_sub))
draw.text(((WIDTH - sub_len) // 2, sub_y), sub_text, fill=(130, 130, 130, 255), font=font_sub)

# Save the banner
canvas.save('src/assets/banner-two.png')
try:
    canvas.save('public/banner-two.png')
except:
    pass
print('Minimal Banner 2 generated successfully!')
