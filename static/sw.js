// =============================================
// Service Worker - CotizaPro PWA
// =============================================

const CACHE_NAME = 'cotizapro-v7';
const STATIC_CACHE = 'cotizapro-static-v7';
const DYNAMIC_CACHE = 'cotizapro-dynamic-v7';
const API_CACHE = 'cotizapro-api-v7';

// Archivos esenciales para cachear
const STATIC_ASSETS = [
    '/',
    '/dashboard',
    '/login',
    '/register',
    '/static/css/auth.css',
    '/static/css/dashboard.css',
    '/static/js/dashboard.js',
    '/manifest.json'
];

// URLs externas para cachear
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Instalando Service Worker...');
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE).then(cache => {
                console.log('[SW] Cacheando archivos estáticos...');
                return cache.addAll(STATIC_ASSETS);
            }),
            caches.open(DYNAMIC_CACHE).then(cache => {
                console.log('[SW] Cacheando recursos externos...');
                // Cachear externos de forma segura (no fallar si alguno falla)
                return Promise.allSettled(
                    EXTERNAL_ASSETS.map(url => 
                        fetch(url).then(response => {
                            if (response.ok) {
                                return cache.put(url, response);
                            }
                        }).catch(() => console.log('[SW] No se pudo cachear:', url))
                    )
                );
            })
        ])
        .then(() => {
            console.log('[SW] Archivos cacheados correctamente');
            return self.skipWaiting();
        })
        .catch(err => {
            console.error('[SW] Error al cachear:', err);
        })
    );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
    console.log('[SW] Activando Service Worker...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => {
                            return cacheName !== STATIC_CACHE && 
                                   cacheName !== DYNAMIC_CACHE &&
                                   cacheName !== API_CACHE &&
                                   cacheName.startsWith('cotizapro-');
                        })
                        .map(cacheName => {
                            console.log('[SW] Eliminando cache antiguo:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Service Worker activado');
                return self.clients.claim();
            })
    );
});

// Estrategia de fetch: Network First, fallback to Cache
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar requests que no sean GET
    if (request.method !== 'GET') {
        return;
    }

    // Para las API, usar Network First con cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstAPI(request));
        return;
    }

    // Para archivos estáticos, usar Cache First
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Para páginas HTML, usar Network First con fallback
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirstWithOfflineFallback(request));
        return;
    }

    // Por defecto, usar Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request));
});

// Verificar si es un asset estático
function isStaticAsset(url) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
           url.hostname === 'fonts.googleapis.com' ||
           url.hostname === 'fonts.gstatic.com' ||
           url.hostname === 'cdnjs.cloudflare.com' ||
           url.hostname === 'cdn.jsdelivr.net';
}

// Estrategia: Cache First
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('[SW] Error en cacheFirst:', error);
        return new Response('Offline', { status: 503 });
    }
}

// Estrategia: Network First para APIs
async function networkFirstAPI(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] API sin conexión, buscando en cache...');
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[SW] Sirviendo API desde cache');
            return cachedResponse;
        }
        // Retornar array vacío para APIs
        return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Estrategia: Network First
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Sin conexión, buscando en cache...');
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // Retornar array vacío para APIs
        return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Estrategia: Network First con fallback offline para HTML
async function networkFirstWithOfflineFallback(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Sin conexión, sirviendo desde cache...');
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Intentar servir el dashboard cacheado
        const dashboardCache = await caches.match('/dashboard');
        if (dashboardCache) {
            return dashboardCache;
        }
        
        // Página offline de fallback
        return new Response(getOfflinePage(), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// Estrategia: Stale While Revalidate
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);
    
    const fetchPromise = fetch(request)
        .then(networkResponse => {
            if (networkResponse.ok) {
                caches.open(DYNAMIC_CACHE)
                    .then(cache => cache.put(request, networkResponse.clone()));
            }
            return networkResponse;
        })
        .catch(() => cachedResponse);

    return cachedResponse || fetchPromise;
}

// Página offline de fallback
function getOfflinePage() {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sin conexión - CotizaPro</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
            padding: 20px;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            max-width: 400px;
        }
        .icon { font-size: 4rem; margin-bottom: 20px; }
        h1 { font-size: 1.8rem; margin-bottom: 12px; }
        p { opacity: 0.9; margin-bottom: 24px; line-height: 1.6; }
        button {
            background: white;
            color: #667eea;
            border: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:hover { transform: scale(1.05); }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📡</div>
        <h1>Sin conexión</h1>
        <p>No hay conexión a internet. Verifica tu conexión y vuelve a intentarlo.</p>
        <button onclick="location.reload()">Reintentar</button>
    </div>
</body>
</html>`;
}

// Escuchar mensajes del cliente
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
