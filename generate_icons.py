from PIL import Image, ImageDraw
import os

def create_pwa_icon(size, bg_color, output_path):
    """Crear un ícono PNG para PWA"""
    # Crear imagen con fondo
    img = Image.new('RGBA', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Dibujar un círculo blanco en el centro
    margin = size // 4
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill='white'
    )
    
    # Dibujar símbolo de documento/cotización dentro
    doc_margin = size // 3
    doc_width = size // 3
    doc_height = size // 2.5
    doc_x = (size - doc_width) // 2
    doc_y = (size - doc_height) // 2
    
    # Rectángulo del documento (morado)
    draw.rectangle(
        [doc_x, doc_y, doc_x + doc_width, doc_y + doc_height],
        fill=bg_color
    )
    
    # Líneas del documento (blanco)
    line_margin = size // 20
    for i in range(3):
        y = doc_y + line_margin * (i + 2)
        if y < doc_y + doc_height - line_margin:
            draw.rectangle(
                [doc_x + line_margin, y, doc_x + doc_width - line_margin, y + line_margin // 2],
                fill='white'
            )
    
    # Guardar
    img.save(output_path, 'PNG')
    print(f'Created {output_path} ({os.path.getsize(output_path)} bytes)')

# Configuración
sizes = [72, 96, 128, 144, 152, 192, 384, 512]
bg_color = (102, 126, 234, 255)  # #667eea con alpha

base_path = r'c:\xampp\htdocs\spaguetty\ExamenPWA\static\icons'
os.makedirs(base_path, exist_ok=True)

for size in sizes:
    filename = os.path.join(base_path, f'icon-{size}x{size}.png')
    create_pwa_icon(size, bg_color, filename)

print("\n✅ Iconos generados correctamente!")
