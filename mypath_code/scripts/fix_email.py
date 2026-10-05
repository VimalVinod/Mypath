import re
with open('backend-email/index.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the HTML content string for send-exam-alerts
new_html = r"""    const htmlContent = `<!DOCTYPE html><html><body style='margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;'><table width='100%' cellpadding='0' cellspacing='0' style='padding:30px 0;'><tr><td align='center'><table width='600' cellpadding='0' cellspacing='0' style='background:#fff;border-radius:8px;overflow:hidden;'><tr><td align='center' style='background:#000;padding:24px 40px;'><img src='https://mypath0.web.app/wildcode-logo.png' alt='WildCode Studios' style='height:48px;' /></td></tr><tr><td align='left' style='padding:48px 40px 32px;'><h1 style='font-size:24px;font-weight:800;color:#111;margin:0 0 16px;'>Good news, ${name}!</h1><p style='font-size:15px;color:#555;margin:0 0 24px;'>You are eligible for <strong>${newExams.length} new exams</strong>:</p>${examListHtml}<div style='text-align:center;margin-top:32px;'><a href='https://mypath0.web.app/dashboard' style='display:inline-block;padding:15px 36px;background:#000;color:#fff;text-decoration:none;font-weight:bold;border-radius:4px;'>VIEW DASHBOARD</a></div></td></tr><tr><td align='center' style='background-color:#000000;padding:24px 40px;'><img src='https://mypath0.web.app/wildcode-logo.png' alt='WildCode Studios' style='height:28px;opacity:0.5;margin-bottom:10px;' /><p style='font-size:11px;color:#bbbbbb;margin:0;'>MyPath is a product of WildCode Studios &bull; wildcodestudios.in</p></td></tr></table></td></tr></table></body></html>`;"""

content = re.sub(r"const htmlContent = \\\<!DOCTYPE html>.*?;", new_html, content, flags=re.DOTALL)

with open('backend-email/index.js', 'w', encoding='utf-8') as f:
    f.write(content)
