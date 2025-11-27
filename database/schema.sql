-- =============================================
-- Sistema de Cotizaciones - Base de Datos
-- Ejecutar en phpMyAdmin (WAMP)
-- =============================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS sistema_cotizaciones
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sistema_cotizaciones;

-- =============================================
-- Tabla de Usuarios
-- =============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    empresa VARCHAR(150),
    telefono VARCHAR(20),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla de Cotizaciones
-- =============================================
CREATE TABLE IF NOT EXISTS cotizaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    producto VARCHAR(255) NOT NULL,
    cantidad INT NOT NULL,
    empaquetadoDeseado VARCHAR(255),
    precioEstimado DOUBLE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'pendiente',
    notas TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Índices para optimización
-- =============================================
CREATE INDEX idx_usuario_email ON usuarios(email);
CREATE INDEX idx_cotizacion_usuario ON cotizaciones(usuario_id);
CREATE INDEX idx_cotizacion_fecha ON cotizaciones(fecha_creacion);

-- =============================================
-- Usuario de prueba (opcional - password: admin123)
-- La contraseña está hasheada con werkzeug.security
-- =============================================
-- INSERT INTO usuarios (nombre, email, password, empresa) VALUES 
-- ('Admin', 'admin@example.com', 'pbkdf2:sha256:600000$hash', 'Empresa Demo');
