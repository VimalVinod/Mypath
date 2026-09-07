import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH, HEIGHT = 1920, 640

# Fonts
font_brand = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 20)
font_badge = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 11)
font_pill = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 13)

font_ui_h1 = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 30)
font_ui_sub = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 16)
font_card_title = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 22)
font_card_sub = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 15)
font_card_body = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 15)
font_card_badge = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 12)
font_btn = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 14)

# 1. Render Screen UI (1216 x 830)
UI_W, UI_H = 1216, 830
ui = Image.new('RGBA', (UI_W, UI_H), (10, 12, 18, 255))
u_draw = ImageDraw.Draw(ui)

u_draw.rectangle([(0, 0), (UI_W, 58)], fill=(16, 20, 28, 255))
u_draw.line([(0, 58), (UI_W, 58)], fill=(32, 40, 56, 255), width=1)

u_draw.ellipse([(20, 23), (32, 35)], fill=(239, 68, 68, 255))
u_draw.ellipse([(40, 23), (52, 35)], fill=(245, 158, 11, 255))
u_draw.ellipse([(60, 23), (72, 35)], fill=(16, 185, 129, 255))

try:
    mini_logo = Image.open('public/logo_white_text.png').convert('RGBA')
    lh = 28
    lw = int(mini_logo.width * (lh / mini_logo.height))
    mini_logo = mini_logo.resize((lw, lh), Image.Resampling.LANCZOS)
    ui.paste(mini_logo, (92, 15), mini_logo)
except Exception:
    u_draw.text((92, 17), 'MyPath', fill=(255, 255, 255), font=font_card_title)

u_draw.rounded_rectangle([(990, 13), (1190, 45)], radius=16, fill=(24, 30, 42, 255), outline=(45, 56, 78, 255), width=1)
u_draw.ellipse([(1006, 23), (1018, 35)], fill=(16, 185, 129, 255))
u_draw.text((1028, 17), 'Candidate Portal', fill=(230, 235, 245, 255), font=font_btn)

search_w = 460
search_x = (UI_W - search_w) // 2
u_draw.rounded_rectangle([(search_x, 12), (search_x + search_w, 46)], radius=17, fill=(24, 30, 42, 255), outline=(42, 52, 72, 255), width=1)
u_draw.text((search_x + 35, 17), 'Search UPSC, SSC, GATE, Banking...', fill=(130, 142, 165, 255), font=font_card_sub)

u_draw.text((45, 80), 'Official Examination Directory', fill=(255, 255, 255, 255), font=font_ui_h1)
u_draw.text((45, 122), '4 Curated Portals Monitored  •  Automated Eligibility Verification', fill=(148, 163, 184, 255), font=font_ui_sub)

filter_tags = ['All Exams', 'Government (UPSC/SSC)', 'Engineering (GATE)', 'Banking (IBPS)']
fx = 45
fy = 162
for i, ftag in enumerate(filter_tags):
    flen = int(u_draw.textlength(ftag, font=font_btn))
    is_act = (i == 0)
    f_bg = (225, 29, 72, 255) if is_act else (22, 28, 38, 255)
    f_bdr = (225, 29, 72, 255) if is_act else (40, 50, 68, 255)
    f_txt = (255, 255, 255, 255) if is_act else (175, 185, 200, 255)
    u_draw.rounded_rectangle([(fx, fy), (fx + flen + 26, fy + 34)], radius=8, fill=f_bg, outline=f_bdr, width=1)
    u_draw.text((fx + 13, fy + 7), ftag, fill=f_txt, font=font_btn)
    fx += flen + 38

card_w = 360
card_h = 445
cy = 216

cards_data = [
    {
        'badge': 'ELIGIBLE (100%)',
        'badge_bg': (22, 101, 52, 255),
        'badge_txt': (74, 222, 128, 255),
        'title': 'UPSC CSE 2026',
        'sub': 'Civil Services (Prelims)',
        'org': 'Union Public Service Commission',
        'criteria': ['Bachelor Degree (Any Stream)', 'Age: 21 - 32 Years', 'Nationality: Indian Citizen'],
        'deadline': 'Deadline: 05 March 2026',
        'status': 'Gazette Released • 32 Days Left',
        'color': (59, 130, 246, 255)
    },
    {
        'badge': 'ELIGIBLE (100%)',
        'badge_bg': (22, 101, 52, 255),
        'badge_txt': (74, 222, 128, 255),
        'title': 'SSC CGL 2026',
        'sub': 'Combined Graduate Level',
        'org': 'Staff Selection Commission',
        'criteria': ['Graduation Recognized Board', 'General & Reserved Quotas', 'Age Limit: 18 - 30 Years'],
        'deadline': 'Deadline: 22 March 2026',
        'status': 'Applications Active • 18 Days Left',
        'color': (16, 185, 129, 255)
    },
    {
        'badge': 'PROBABLY ELIGIBLE',
        'badge_bg': (113, 63, 18, 255),
        'badge_txt': (251, 191, 36, 255),
        'title': 'GATE 2026',
        'sub': 'Grad Aptitude Test in Engg',
        'org': 'IIT Roorkee / NTA',
        'criteria': ['B.Tech / B.E. Degree', 'Final Year Students Eligible', 'No Upper Age Limit'],
        'deadline': 'Exam Date: Feb 2026',
        'status': 'Admit Cards Live • Official Portal',
        'color': (168, 85, 247, 255)
    }
]

for i, cd in enumerate(cards_data):
    cx = 45 + i * (card_w + 26)
    u_draw.rounded_rectangle([(cx, cy), (cx + card_w, cy + card_h)], radius=12, fill=(15, 19, 28, 255), outline=(35, 44, 60, 255), width=1)
    u_draw.rounded_rectangle([(cx, cy), (cx + card_w, cy + 5)], radius=3, fill=cd['color'])
    
    bl = int(u_draw.textlength(cd['badge'], font=font_card_badge))
    u_draw.rounded_rectangle([(cx + 18, cy + 20), (cx + 18 + bl + 16, cy + 42)], radius=6, fill=cd['badge_bg'])
    u_draw.text((cx + 26, cy + 24), cd['badge'], fill=cd['badge_txt'], font=font_card_badge)
    
    u_draw.text((cx + 18, cy + 56), cd['title'], fill=(255, 255, 255, 255), font=font_card_title)
    u_draw.text((cx + 18, cy + 86), cd['sub'], fill=(185, 195, 210, 255), font=font_card_sub)
    u_draw.text((cx + 18, cy + 110), cd['org'], fill=(125, 138, 158, 255), font=font_card_sub)
    u_draw.line([(cx + 18, cy + 142), (cx + card_w - 18, cy + 142)], fill=(28, 36, 50, 255), width=1)
    
    u_draw.text((cx + 18, cy + 156), 'Verified Eligibility:', fill=(140, 152, 172, 255), font=font_card_badge)
    crit_y = cy + 180
    for crit in cd['criteria']:
        u_draw.ellipse([(cx + 20, crit_y + 4), (cx + 28, crit_y + 12)], fill=(52, 211, 153, 255))
        u_draw.text((cx + 36, crit_y), crit, fill=(210, 220, 235, 255), font=font_card_body)
        crit_y += 28
        
    u_draw.rounded_rectangle([(cx + 18, cy + 280), (cx + card_w - 18, cy + 346)], radius=8, fill=(22, 28, 40, 255))
    u_draw.text((cx + 30, cy + 293), cd['deadline'], fill=(255, 255, 255, 255), font=font_btn)
    u_draw.text((cx + 30, cy + 318), cd['status'], fill=(251, 146, 60, 255), font=font_card_badge)
    
    u_draw.rounded_rectangle([(cx + 18, cy + 368), (cx + card_w - 18, cy + 420)], radius=8, fill=(30, 38, 54, 255), outline=(52, 64, 88, 255), width=1)
    u_draw.text((cx + 85, cy + 382), 'View Official Portal  →', fill=(255, 255, 255, 255), font=font_btn)

u_draw.text((45, 685), '• Official Gazette Direct Links   • Student Open Source Project   • No Commercial Ads', fill=(100, 115, 135, 255), font=font_card_sub)

# 2. Embed UI into Centered Laptop
laptop_path = r'C:\Users\sindh\.gemini\antigravity\brain\8e99655f-3f9c-44aa-acbb-aa489085eae1\laptop_centered_dark_1788681622056.jpg'
laptop = Image.open(laptop_path).convert('RGBA')

sx, sy, sw, sh = 384, 110, 608, 415
ui_scaled = ui.resize((sw, sh), Image.Resampling.LANCZOS)

screen_mask = Image.new('L', (sw, sh), 0)
m_draw = ImageDraw.Draw(screen_mask)
m_draw.rounded_rectangle([(0, 0), (sw, sh)], radius=12, fill=255)

glare = Image.new('RGBA', (sw, sh), (0, 0, 0, 0))
g_draw = ImageDraw.Draw(glare)
g_draw.polygon([(0, 0), (sw//3, 0), (sw//6, sh), (0, sh)], fill=(255, 255, 255, 14))
glare = glare.filter(ImageFilter.GaussianBlur(16))
ui_composite = Image.alpha_composite(ui_scaled, glare)

laptop.paste(ui_composite, (sx, sy), screen_mask)

notch_w = 46
notch_h = 13
nx = (laptop.width - notch_w) // 2
ny = sy
n_draw = ImageDraw.Draw(laptop)
n_draw.rounded_rectangle([(nx, ny), (nx + notch_w, ny + notch_h)], radius=4, fill=(10, 10, 12, 255))
n_draw.ellipse([(nx + notch_w//2 - 2, ny + 4), (nx + notch_w//2 + 2, ny + 8)], fill=(30, 36, 48, 255))

# 3. Canvas Composition (1920 x 640)
canvas = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 255))

bg_arr = np.zeros((HEIGHT, WIDTH, 3), dtype=np.float32)
y_grid, x_grid = np.ogrid[:HEIGHT, :WIDTH]
cx_glow, cy_glow = WIDTH // 2, HEIGHT // 2 - 10
rx_glow, ry_glow = 520, 280
dist = np.sqrt(((x_grid - cx_glow) / rx_glow) ** 2 + ((y_grid - cy_glow) / ry_glow) ** 2)
glow = np.clip(1.0 - dist, 0.0, 1.0)
glow = glow * glow * (3.0 - 2.0 * glow)

bg_arr[:, :, 0] = glow * 38.0
bg_arr[:, :, 1] = glow * 8.0
bg_arr[:, :, 2] = glow * 12.0
glow_layer = Image.fromarray(np.clip(bg_arr, 0, 255).astype(np.uint8), mode='RGB').convert('RGBA')
canvas = Image.alpha_composite(canvas, glow_layer)

target_laptop_h = 490
target_laptop_w = int(laptop.width * (target_laptop_h / laptop.height))
scaled_laptop = laptop.resize((target_laptop_w, target_laptop_h), Image.Resampling.LANCZOS)

fade_mask = np.ones((target_laptop_h, target_laptop_w), dtype=np.float32)
fade_edge = 70
for c in range(fade_edge):
    fade_mask[:, c] *= (c / float(fade_edge)) ** 1.5
    fade_mask[:, target_laptop_w - 1 - c] *= (c / float(fade_edge)) ** 1.5
for r in range(fade_edge):
    fade_mask[r, :] *= (r / float(fade_edge)) ** 1.5
    fade_mask[target_laptop_h - 1 - r, :] *= (r / float(fade_edge)) ** 1.5
l_mask = Image.fromarray((fade_mask * 255).astype(np.uint8))

lx = (WIDTH - target_laptop_w) // 2
ly = 88
canvas.paste(scaled_laptop, (lx, ly), l_mask)

# 4. Top Center Brand & Intro
c_draw = ImageDraw.Draw(canvas)

try:
    top_logo = Image.open('public/logo_white_text.png').convert('RGBA')
    lh = 34
    lw = int(top_logo.width * (lh / top_logo.height))
    top_logo = top_logo.resize((lw, lh), Image.Resampling.LANCZOS)
    
    brand_sub = '|  STUDENT COMPETITIVE EXAM HUB'
    b_len = int(c_draw.textlength(brand_sub, font=font_brand))
    gap_logo = 16
    total_brand_w = lw + gap_logo + b_len
    
    brand_start_x = (WIDTH - total_brand_w) // 2
    canvas.paste(top_logo, (brand_start_x, 22), top_logo)
    c_draw.text((brand_start_x + lw + gap_logo, 26), brand_sub, fill=(245, 245, 247, 255), font=font_brand)
except Exception:
    txt = 'MyPath  |  STUDENT COMPETITIVE EXAM HUB'
    tl = int(c_draw.textlength(txt, font=font_brand))
    c_draw.text(((WIDTH - tl)//2, 25), txt, fill=(255, 255, 255), font=font_brand)

badge_txt = 'COLLEGE PROJECT  •  CURATED EXAM NOTIFICATIONS & ELIGIBILITY'
b_len = int(c_draw.textlength(badge_txt, font=font_badge))
b_w = b_len + 32
b_h = 24
bx = (WIDTH - b_w) // 2
by = 64

b_layer = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
bl_draw = ImageDraw.Draw(b_layer)
bl_draw.rounded_rectangle([(bx, by), (bx + b_w, by + b_h)], radius=12, fill=(255, 255, 255, 14), outline=(255, 255, 255, 36), width=1)
canvas = Image.alpha_composite(canvas, b_layer)

c_draw = ImageDraw.Draw(canvas)
c_draw.text((bx + 16, by + 5), badge_txt, fill=(226, 232, 240, 240), font=font_badge)

# 5. Bottom Center Pill Bar with Vector Icons
t1 = 'VERIFIED OFFICIAL PORTALS'
t2 = 'DEADLINE TRACKER'
t3 = 'ELIGIBILITY MATCH'
div_txt = '  |  '

l1 = int(c_draw.textlength(t1, font=font_pill))
ld = int(c_draw.textlength(div_txt, font=font_pill))
l2 = int(c_draw.textlength(t2, font=font_pill))
l3 = int(c_draw.textlength(t3, font=font_pill))

icon_w = 22
content_w = (icon_w + l1) + ld + (icon_w + l2) + ld + (icon_w + l3)
pad_x = 32
pill_w = content_w + pad_x * 2
pill_h = 38
pill_x = (WIDTH - pill_w) // 2
pill_y = HEIGHT - 54

p_layer = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
p_draw = ImageDraw.Draw(p_layer)
p_draw.rounded_rectangle([(pill_x, pill_y), (pill_x + pill_w, pill_y + pill_h)], radius=19, fill=(15, 15, 18, 225), outline=(255, 255, 255, 45), width=1)
canvas = Image.alpha_composite(canvas, p_layer)

c_draw = ImageDraw.Draw(canvas)

def draw_target(d, x, y, col=(74, 222, 128, 255)):
    d.ellipse([(x, y), (x + 14, y + 14)], outline=col, width=2)
    d.ellipse([(x + 5, y + 5), (x + 9, y + 9)], fill=col)

def draw_calendar(d, x, y, col=(251, 191, 36, 255)):
    d.rounded_rectangle([(x, y + 2), (x + 14, y + 15)], radius=2, outline=col, width=1)
    d.line([(x, y + 6), (x + 14, y + 6)], fill=col, width=1)
    d.line([(x + 3, y), (x + 3, y + 3)], fill=col, width=2)
    d.line([(x + 11, y), (x + 11, y + 3)], fill=col, width=2)

def draw_bolt(d, x, y, col=(244, 63, 94, 255)):
    pts = [(x + 8, y), (x + 2, y + 8), (x + 7, y + 8), (x + 5, y + 15), (x + 12, y + 6), (x + 7, y + 6)]
    d.polygon(pts, fill=col)

cur = pill_x + pad_x

draw_target(c_draw, cur, pill_y + 11)
cur += icon_w
c_draw.text((cur, pill_y + 10), t1, fill=(241, 245, 249, 255), font=font_pill)
cur += l1

c_draw.text((cur, pill_y + 10), div_txt, fill=(100, 116, 139, 255), font=font_pill)
cur += ld

draw_calendar(c_draw, cur, pill_y + 11)
cur += icon_w
c_draw.text((cur, pill_y + 10), t2, fill=(241, 245, 249, 255), font=font_pill)
cur += l2

c_draw.text((cur, pill_y + 10), div_txt, fill=(100, 116, 139, 255), font=font_pill)
cur += ld

draw_bolt(c_draw, cur, pill_y + 11)
cur += icon_w
c_draw.text((cur, pill_y + 10), t3, fill=(241, 245, 249, 255), font=font_pill)

# 6. Save to destination folders
canvas.save('src/assets/banner-one.png')
canvas.save('public/banner-one.png')
print('Banner 1 successfully built!')
