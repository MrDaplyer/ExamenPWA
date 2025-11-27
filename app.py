from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import mysql.connector
from mysql.connector import Error
import os

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Configuración de la base de datos
DB_CONFIG = {
    'host': 'localhost',
    'database': 'sistema_cotizaciones',
    'user': 'root',
    'password': ''  # WAMP por defecto no tiene password para root
}

def get_db_connection():
    """Crear conexión a la base de datos"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error de conexión: {e}")
        return None

def login_required(f):
    """Decorador para proteger rutas que requieren autenticación"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Por favor inicia sesión para continuar', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# =============================================
# Service Worker y PWA
# =============================================

@app.route('/sw.js')
def service_worker():
    """Servir el Service Worker desde la raíz para que tenga scope completo"""
    response = send_from_directory('static', 'sw.js')
    response.headers['Content-Type'] = 'application/javascript'
    response.headers['Service-Worker-Allowed'] = '/'
    return response

@app.route('/manifest.json')
def manifest():
    """Servir el manifest desde la raíz"""
    return send_from_directory('static', 'manifest.json')

# =============================================
# Rutas de Autenticación
# =============================================

@app.route('/')
def index():
    """Landing page principal"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('landing.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM usuarios WHERE email = %s AND activo = 1", (email,))
            user = cursor.fetchone()
            cursor.close()
            connection.close()
            
            if user and check_password_hash(user['password'], password):
                session['user_id'] = user['id']
                session['user_name'] = user['nombre']
                session['user_email'] = user['email']
                flash('¡Bienvenido de nuevo!', 'success')
                return redirect(url_for('dashboard'))
            else:
                flash('Email o contraseña incorrectos', 'error')
        else:
            flash('Error de conexión a la base de datos', 'error')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        nombre = request.form.get('nombre')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        empresa = request.form.get('empresa', '')
        telefono = request.form.get('telefono', '')
        
        # Validaciones
        if password != confirm_password:
            flash('Las contraseñas no coinciden', 'error')
            return render_template('register.html')
        
        if len(password) < 6:
            flash('La contraseña debe tener al menos 6 caracteres', 'error')
            return render_template('register.html')
        
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verificar si el email ya existe
            cursor.execute("SELECT id FROM usuarios WHERE email = %s", (email,))
            if cursor.fetchone():
                flash('Este email ya está registrado', 'error')
                cursor.close()
                connection.close()
                return render_template('register.html')
            
            # Crear usuario
            hashed_password = generate_password_hash(password)
            cursor.execute(
                "INSERT INTO usuarios (nombre, email, password, empresa, telefono) VALUES (%s, %s, %s, %s, %s)",
                (nombre, email, hashed_password, empresa, telefono)
            )
            connection.commit()
            cursor.close()
            connection.close()
            
            flash('¡Registro exitoso! Ahora puedes iniciar sesión', 'success')
            return redirect(url_for('login'))
        else:
            flash('Error de conexión a la base de datos', 'error')
    
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Has cerrado sesión correctamente', 'info')
    return redirect(url_for('login'))

# =============================================
# Rutas del Dashboard
# =============================================

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user_name=session.get('user_name'))

# =============================================
# API para Cotizaciones
# =============================================

@app.route('/api/cotizaciones', methods=['GET'])
@login_required
def get_cotizaciones():
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM cotizaciones WHERE usuario_id = %s ORDER BY fecha_creacion DESC",
            (session['user_id'],)
        )
        cotizaciones = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Convertir datetime a string para JSON
        for cot in cotizaciones:
            if cot['fecha_creacion']:
                cot['fecha_creacion'] = cot['fecha_creacion'].strftime('%Y-%m-%d %H:%M:%S')
        
        return jsonify(cotizaciones)
    return jsonify([])

@app.route('/api/cotizaciones', methods=['POST'])
@login_required
def create_cotizacion():
    data = request.get_json()
    
    producto = data.get('producto')
    cantidad = data.get('cantidad')
    empaquetado = data.get('empaquetadoDeseado')
    precio = data.get('precioEstimado')
    notas = data.get('notas', '')
    
    if not producto or not cantidad:
        return jsonify({'error': 'Producto y cantidad son requeridos'}), 400
    
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor()
        cursor.execute(
            """INSERT INTO cotizaciones (usuario_id, producto, cantidad, empaquetadoDeseado, precioEstimado, notas) 
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (session['user_id'], producto, cantidad, empaquetado, precio, notas)
        )
        connection.commit()
        new_id = cursor.lastrowid
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'id': new_id})
    
    return jsonify({'error': 'Error de conexión'}), 500

@app.route('/api/cotizaciones/<int:id>', methods=['PUT'])
@login_required
def update_cotizacion(id):
    data = request.get_json()
    
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor()
        cursor.execute(
            """UPDATE cotizaciones 
               SET producto = %s, cantidad = %s, empaquetadoDeseado = %s, precioEstimado = %s, notas = %s, estado = %s
               WHERE id = %s AND usuario_id = %s""",
            (data.get('producto'), data.get('cantidad'), data.get('empaquetadoDeseado'),
             data.get('precioEstimado'), data.get('notas', ''), data.get('estado', 'pendiente'),
             id, session['user_id'])
        )
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True})
    
    return jsonify({'error': 'Error de conexión'}), 500

@app.route('/api/cotizaciones/<int:id>', methods=['DELETE'])
@login_required
def delete_cotizacion(id):
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor()
        cursor.execute(
            "DELETE FROM cotizaciones WHERE id = %s AND usuario_id = %s",
            (id, session['user_id'])
        )
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True})
    
    return jsonify({'error': 'Error de conexión'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
