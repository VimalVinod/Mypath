import glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH, HEIGHT = 1920, 640

# Fonts
font_badge = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 12)
font_h1 = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 50)
font_sub = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 18)
font_btn = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 16)
font_note = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 13)

# Load exam hall photo
matches = glob.glob(r'C:\Users\sindh\.gemini\antigravity\brain\8e99655f-3f9c-44aa-acbb-aa489085eae1\students_writing_exam_banner*.jpg')
photo = Image.open(matches[0]).convert('RGBA')

# Scale photo to cover height 640
scale = HEIGHT / photo.height
scaled_w = int(photo.width * scale)
photo_scaled = photo.resize((scaled_w, HEIGHT), Image.Resampling.LANCZOS)

canvas = Image.new('RGBA', (WIDTH, HEIGHT), (255, 255, 255, 255))
canvas.paste(photo_scaled, (0, 0))

# Smooth gradient fade on right side
fade_arr = np.zeros((HEIGHT, WIDTH), dtype=np.float32)
x_split1 = 780
x_split2 = 1240

for x in range(WIDTH):
    if x <= x_split1:
        fade_arr[:, x] = 0.0
    elif x <= x_split2:
        t = (x - x_split1) / float(x_split2 - x_split1)
        fade_arr[:, x] = t * t * (3.0 - 2.0 * t)
    else:
        fade_arr[:, x] = 1.0

white_layer = Image.new('RGBA', (WIDTH, HEIGHT), (255, 255, 255, 255))
fade_mask = Image.fromarray((fade_arr * 255).astype(np.uint8))
canvas.paste(white_layer, (0, 0), fade_mask)

# Right-aligned typography
draw = ImageDraw.Draw(canvas)
right_margin = WIDTH - 140
start_y = 115

# 1. Badge
badge_text = 'OFFICIAL DEADLINE TRACKER'
tb_len = int(draw.textlength(badge_text, font=font_badge))
tb_w = tb_len + 36
tb_h = 30
badge_x = right_margin - tb_w

badge_layer = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
b_draw = ImageDraw.Draw(badge_layer)
b_draw.rounded_rectangle([(badge_x, start_y), (badge_x + tb_w, start_y + tb_h)], radius=15, fill=(15, 23, 42, 255))
b_draw.ellipse([(badge_x + 12, start_y + 10), (badge_x + 22, start_y + 20)], fill=(249, 115, 22, 255))
canvas = Image.alpha_composite(canvas, badge_layer)

draw = ImageDraw.Draw(canvas)
draw.text((badge_x + 28, start_y + 7), badge_text, fill=(255, 255, 255, 255), font=font_badge)

# 2. Headline
h_y1 = start_y + 52
h1_text = 'Never Miss a Date.'
h1_len = int(draw.textlength(h1_text, font=font_h1))
draw.text((right_margin - h1_len, h_y1), h1_text, fill=(15, 23, 42, 255), font=font_h1)

h_y2 = h_y1 + 62
h2_text = 'Direct Official Gazettes.'
h2_len = int(draw.textlength(h2_text, font=font_h1))
draw.text((right_margin - h2_len, h_y2), h2_text, fill=(225, 29, 72, 255), font=font_h1)

# 3. Subtitle
sub_y = h_y2 + 75
sub1_text = 'Automated application deadline alerts and verified exam notifications.'
sub1_len = int(draw.textlength(sub1_text, font=font_sub))
draw.text((right_margin - sub1_len, sub_y), sub1_text, fill=(71, 85, 105, 255), font=font_sub)

sub2_text = 'Track hall tickets, admit cards, and registration dates in one place.'
sub2_len = int(draw.textlength(sub2_text, font=font_sub))
draw.text((right_margin - sub2_len, sub_y + 28), sub2_text, fill=(71, 85, 105, 255), font=font_sub)

# 4. CTA Button
btn_text = 'VIEW DEADLINE TRACKER  →'
btn_len = int(draw.textlength(btn_text, font=font_btn))
btn_w = btn_len + 48
btn_h = 48
btn_y = sub_y + 80
btn_x = right_margin - btn_w

btn_layer = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
btn_draw = ImageDraw.Draw(btn_layer)
btn_draw.rounded_rectangle([(btn_x, btn_y + 4), (btn_x + btn_w, btn_y + btn_h + 8)], radius=12, fill=(15, 23, 42, 70))
btn_layer = btn_layer.filter(ImageFilter.GaussianBlur(12))
canvas = Image.alpha_composite(canvas, btn_layer)

btn_surface = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
bs_draw = ImageDraw.Draw(btn_surface)
bs_draw.rounded_rectangle([(btn_x, btn_y), (btn_x + btn_w, btn_y + btn_h)], radius=10, fill=(15, 23, 42, 255))
canvas = Image.alpha_composite(canvas, btn_surface)

draw = ImageDraw.Draw(canvas)
draw.text((btn_x + 24, btn_y + 13), btn_text, fill=(255, 255, 255, 255), font=font_btn)

# 5. Note below button
note_text = 'Direct Gazette Sources  •  Real-time Deadline Notifications'
note_len = int(draw.textlength(note_text, font=font_note))
draw.text((right_margin - note_len, btn_y + 68), note_text, fill=(100, 116, 139, 255), font=font_note)

canvas.save('src/assets/banner-three.png')
canvas.save('public/banner-three.png')
print('Banner 3 generated successfully!')
