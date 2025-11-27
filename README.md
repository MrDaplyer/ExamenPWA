# Sistema de Cotizaciones - CotizaPro

Sistema web profesional para gestión de cotizaciones desarrollado con Flask y MySQL.

## 🚀 Características

- **Autenticación segura**: Login y registro de usuarios con contraseñas hasheadas
- **Dashboard interactivo**: Panel de control con estadísticas en tiempo real
- **Gestión de cotizaciones**: Crear, editar, eliminar y buscar cotizaciones
- **Reportes**: Gráficas y estadísticas de rendimiento
- **Diseño responsive**: Funciona en desktop, tablet y móvil
- **Tema oscuro/claro**: Personalización de la interfaz
- **PWA Ready**: Preparado para Progressive Web App

## 📋 Requisitos

- Python 3.8+
- WAMP Server (Apache + MySQL/MariaDB)
- pip (gestor de paquetes de Python)

## 🛠️ Instalación

### 1. Configurar la base de datos

1. Abre phpMyAdmin en tu navegador (http://localhost/phpmyadmin)
2. Crea una nueva base de datos o copia el contenido de `database/schema.sql`
3. Ejecuta el script SQL para crear las tablas necesarias

### 2. Instalar dependencias de Python

```bash
cd c:\wamp\www\Domingo
pip install -r requirements.txt
```

### 3. Configurar la conexión a la base de datos

En el archivo `app.py`, verifica la configuración de la base de datos:

```python
DB_CONFIG = {
    'host': 'localhost',
    'database': 'sistema_cotizaciones',
    'user': 'root',
    'password': ''  # WAMP por defecto no tiene password
}
```

### 4. Ejecutar la aplicación

```bash
python app.py
```

La aplicación estará disponible en: http://localhost:5000

## 📁 Estructura del Proyecto

```
Domingo/
├── app.py                  # Aplicación principal Flask
├── requirements.txt        # Dependencias de Python
├── README.md              # Este archivo
├── database/
│   └── schema.sql         # Script SQL para crear la base de datos
├── templates/
│   ├── login.html         # Página de inicio de sesión
│   ├── register.html      # Página de registro
│   └── dashboard.html     # Panel principal (todas las funciones)
└── static/
    ├── css/
    │   ├── auth.css       # Estilos de autenticación
    │   └── dashboard.css  # Estilos del dashboard
    ├── js/
    │   └── dashboard.js   # JavaScript del dashboard
    └── manifest.json      # Manifest para PWA
```

## 🗄️ Base de Datos

### Tabla: usuarios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | Identificador único (auto_increment) |
| nombre | VARCHAR(100) | Nombre completo |
| email | VARCHAR(150) | Correo electrónico (único) |
| password | VARCHAR(255) | Contraseña hasheada |
| empresa | VARCHAR(150) | Nombre de la empresa (opcional) |
| telefono | VARCHAR(20) | Teléfono (opcional) |
| fecha_registro | TIMESTAMP | Fecha de registro |
| activo | TINYINT | Estado del usuario |

### Tabla: cotizaciones
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | Identificador único (auto_increment) |
| usuario_id | INT | ID del usuario (FK) |
| producto | VARCHAR(255) | Nombre del producto |
| cantidad | INT | Cantidad solicitada |
| empaquetadoDeseado | VARCHAR(255) | Tipo de empaquetado |
| precioEstimado | DOUBLE | Precio estimado |
| fecha_creacion | TIMESTAMP | Fecha de creación |
| estado | VARCHAR(50) | Estado (pendiente/aprobada/rechazada) |
| notas | TEXT | Notas adicionales |

## 🎨 Características del Diseño

- **Colores principales**: Gradiente púrpura (#667eea a #764ba2)
- **Tipografía**: Inter (Google Fonts)
- **Iconos**: Font Awesome 6
- **Gráficos**: Chart.js

## 📱 Uso

1. **Registro**: Crea una cuenta con tu email y contraseña
2. **Login**: Inicia sesión con tus credenciales
3. **Dashboard**: 
   - Ver resumen general
   - Crear nuevas cotizaciones
   - Gestionar cotizaciones existentes
   - Ver reportes y estadísticas

## 🔒 Seguridad

- Contraseñas hasheadas con Werkzeug (PBKDF2)
- Sesiones seguras con Flask-Session
- Protección contra SQL Injection
- Validación de datos en frontend y backend

## 📄 Licencia

Este proyecto es de uso interno.

---

Desarrollado con ❤️ usando Flask y MySQL
