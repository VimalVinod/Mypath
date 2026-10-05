# Desktop vs Mobile Edits Rule

When the USER requests edits for the PC (Desktop) version of the website, do NOT touch or break the mobile CSS.
- Any mobile-specific edits must be placed inside a CSS media query like `@media (max-width: 768px)` or handled via dedicated CSS classes.
- Do NOT apply inline styles directly in React components if they change the desktop layout to look like the mobile layout.
- The Desktop version should not have mobile features such as glowy effects around the banner (unless requested), and it should retain full-width layouts where applicable.
- Similarly, when editing Mobile CSS, do not break the Desktop layout.
