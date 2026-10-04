from PIL import Image

try:
    # Always load from the original to avoid double-cropping if we make a mistake
    original_path = 'c:/Users/sindh/Documents/codes/mypath/frontend/resources/Screenshot 2026-09-18 224043.png'
    img = Image.open(original_path)
    print(f"Original size: {img.size}")
    
    # We found that the actual dashboard starts at y=156.
    # Let's crop from y=156 to the bottom.
    width, height = img.size
    
    # Also the sides might have some margin, but we'll leave them for now or we could crop them if they are also white/black.
    # Actually let's check if there is left/right margin. The user just said "above that dhasbord".
    bbox = (0, 156, width, height)
    
    cropped = img.crop(bbox)
    cropped.save('public/track-everything.png')
    print(f"Cropped to: {cropped.size}")
except Exception as e:
    print(f"Error: {e}")
