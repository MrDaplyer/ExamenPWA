/* =============================================
   Sistema de Cotizaciones - Dashboard JavaScript
   ============================================= */

// Variables globales
let cotizaciones = [];
let currentPage = 1;
const itemsPerPage = 10;
let pendingQueue = []; // Cola de cotizaciones pendientes de sincronizar
let deleteQueue = []; // Cola de eliminaciones pendientes
let editQueue = []; // Cola de ediciones pendientes
let isOnline = navigator.onLine;

// =============================================
// Inicialización
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar();
    initializeTheme();
    initializeNavigation();
    initializeForm();
    loadCotizaciones();
    initializeSearch();
    initializeFilters();
    initializeOfflineQueue(); // Nuevo: inicializar sistema de cola
});

// =============================================
// Sidebar
// =============================================
function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active');
            }
        });
    }
    
    // Cerrar sidebar al hacer clic en el overlay
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Restaurar estado del sidebar (solo en desktop)
    if (window.innerWidth > 1024 && localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }

    // Cerrar sidebar en móvil al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('active');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('active');
                }
            }
        }
    });
}

// =============================================
// Tema claro/oscuro
// =============================================
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// =============================================
// Navegación
// =============================================
function initializeNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav li');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Cerrar sidebar en móvil
            if (window.innerWidth <= 1024) {
                document.getElementById('sidebar').classList.remove('active');
            }
        });
    });
}

function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar sección seleccionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Actualizar navegación
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
    });

    // Si es la sección de cotizaciones o reportes, actualizar datos
    if (sectionId === 'cotizaciones') {
        renderCotizacionesTable();
    } else if (sectionId === 'reportes') {
        renderReports();
    }
}

// =============================================
// Formulario de Cotización
// =============================================
function initializeForm() {
    console.log('[Queue Debug] initializeForm llamado');
    const form = document.getElementById('cotizacionForm');
    console.log('[Queue Debug] form encontrado:', form);
    
    if (form) {
        form.addEventListener('submit', function(e) {
            console.log('[Queue Debug] Form submit event disparado');
            e.preventDefault();
            saveCotizacion();
        });
        console.log('[Queue Debug] Event listener agregado al form');
    } else {
        console.error('[Queue Debug] ERROR: No se encontró el formulario cotizacionForm');
    }
}

function saveCotizacion() {
    console.log('[Queue] saveCotizacion iniciado');
    console.log('[Queue] isOnline:', isOnline);
    
    const cotizacionId = document.getElementById('cotizacionId').value;
    console.log('[Queue] cotizacionId:', cotizacionId);
    
    const formData = {
        producto: document.getElementById('producto').value,
        cantidad: parseInt(document.getElementById('cantidad').value),
        empaquetadoDeseado: document.getElementById('empaquetado').value,
        precioEstimado: parseFloat(document.getElementById('precio').value) || 0,
        notas: document.getElementById('notas').value,
        estado: document.getElementById('estado').value
    };
    
    console.log('[Queue] formData:', formData);

    if (!formData.producto || !formData.cantidad) {
        showToast('Por favor completa los campos requeridos', 'error');
        return;
    }

    // Si es edición
    if (cotizacionId) {
        if (!isOnline) {
            // Sin internet: agregar a cola de ediciones
            addToEditQueue(cotizacionId, formData);
            showToast('🕐 Sin conexión. Edición guardada en cola.', 'info');
            resetForm();
            showSection('cotizaciones');
            return;
        }
        updateCotizacionOnline(cotizacionId, formData);
        return;
    }

    // Nueva cotización: verificar si hay conexión
    if (!isOnline) {
        // Sin internet: agregar a la cola
        const queueItem = addToQueue(formData);
        showToast('Sin conexión. Cotización guardada en cola.', 'info');
        resetForm();
        updateStats();
        renderRecentTable();
        renderCotizacionesTable();
        showSection('cotizaciones');
        return;
    }

    // Con internet: enviar directamente
    saveCotizacionOnline(formData);
}

function saveCotizacionOnline(formData) {
    console.log('[Queue] Intentando guardar online:', formData);
    
    fetch('/api/cotizaciones', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(function(response) {
        console.log('[Queue] Response recibido:', response.status);
        if (!response.ok) {
            throw new Error('Error del servidor: ' + response.status);
        }
        return response.json();
    })
    .then(function(data) {
        console.log('[Queue] Data recibida:', data);
        if (data.success || data.id) {
            showToast('Cotización creada correctamente', 'success');
            resetForm();
            loadCotizaciones();
            showSection('cotizaciones');
        } else {
            showToast(data.error || 'Error al guardar la cotización', 'error');
        }
    })
    .catch(function(error) {
        console.log('[Queue] CATCH ejecutado - Error:', error.message);
        
        // Agregar a la cola
        var queueItem = addToQueue(formData);
        console.log('[Queue] Agregado a cola:', queueItem);
        
        showToast('Sin conexión. Guardado en cola.', 'info');
        resetForm();
        updateStats();
        renderRecentTable();
        renderCotizacionesTable();
        updateQueueBadge();
        showSection('cotizaciones');
    });
}

function updateCotizacionOnline(cotizacionId, formData) {
    fetch(`/api/cotizaciones/${cotizacionId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error del servidor: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        if (data.success || data.id) {
            showToast('Cotización actualizada correctamente', 'success');
            resetForm();
            loadCotizaciones();
            showSection('cotizaciones');
        } else {
            showToast(data.error || 'Error al guardar la cotización', 'error');
        }
    })
    .catch(error => {
        console.log('[EditQueue] Error de conexión, agregando a cola:', error.message);
        // Si falla, agregar a cola de ediciones
        addToEditQueue(cotizacionId, formData);
        showToast('🕐 Sin conexión. Edición guardada en cola.', 'info');
        resetForm();
        showSection('cotizaciones');
    });
}

function resetForm() {
    document.getElementById('cotizacionForm').reset();
    document.getElementById('cotizacionId').value = '';
    document.getElementById('formTitle').textContent = 'Nueva Cotización';
    document.getElementById('submitBtnText').textContent = 'Guardar Cotización';
}

function editCotizacion(id) {
    const cotizacion = cotizaciones.find(c => c.id === id);
    if (!cotizacion) return;

    document.getElementById('cotizacionId').value = cotizacion.id;
    document.getElementById('producto').value = cotizacion.producto;
    document.getElementById('cantidad').value = cotizacion.cantidad;
    document.getElementById('empaquetado').value = cotizacion.empaquetadoDeseado || '';
    document.getElementById('precio').value = cotizacion.precioEstimado || '';
    document.getElementById('notas').value = cotizacion.notas || '';
    document.getElementById('estado').value = cotizacion.estado || 'pendiente';
    
    document.getElementById('formTitle').textContent = 'Editar Cotización';
    document.getElementById('submitBtnText').textContent = 'Actualizar Cotización';
    
    showSection('nueva');
}

function deleteCotizacion(id) {
    showConfirmModal(
        'Eliminar Cotización',
        '¿Estás seguro de que deseas eliminar esta cotización? Esta acción no se puede deshacer.',
        function() {
            closeModal();
            
            // Si no hay conexión, agregar a cola de eliminación
            if (!isOnline) {
                addToDeleteQueue(id);
                return;
            }
            
            // Intentar eliminar online
            deleteOnline(id);
        }
    );
}

function deleteOnline(id) {
    // Convertir a número para consistencia
    const numericId = parseInt(id);
    
    fetch(`/api/cotizaciones/${numericId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error del servidor: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast('Cotización eliminada correctamente', 'success');
            // Remover de la lista local
            cotizaciones = cotizaciones.filter(c => c.id !== numericId);
            localStorage.setItem('cotizaciones_cache', JSON.stringify(cotizaciones));
            updateStats();
            renderRecentTable();
            renderCotizacionesTable();
        } else {
            throw new Error(data.error || 'Error al eliminar');
        }
    })
    .catch(error => {
        console.log('[Delete] Error de conexión, agregando a cola:', error.message);
        // Si falla, agregar a cola de eliminación
        addToDeleteQueue(numericId);
    });
}

function addToDeleteQueue(id) {
    // Convertir a número para consistencia
    const numericId = parseInt(id);
    
    console.log('[DeleteQueue] Agregando a cola de eliminación:', numericId);
    console.log('[DeleteQueue] Cola actual:', deleteQueue);
    
    // Verificar que no esté ya en la cola
    if (deleteQueue.some(qId => parseInt(qId) === numericId)) {
        showToast('Esta cotización ya está en cola de eliminación', 'info');
        return;
    }
    
    deleteQueue.push(numericId);
    saveDeleteQueueToStorage();
    
    // Marcar visualmente la cotización como pendiente de eliminar
    const index = cotizaciones.findIndex(c => parseInt(c.id) === numericId);
    console.log('[DeleteQueue] Index encontrado:', index);
    
    if (index !== -1) {
        cotizaciones[index].pendingDelete = true;
        localStorage.setItem('cotizaciones_cache', JSON.stringify(cotizaciones));
        console.log('[DeleteQueue] Cotización marcada como pendingDelete');
    }
    
    showToast('🕐 Sin conexión. Eliminación en cola.', 'info');
    updateStats();
    renderRecentTable();
    renderCotizacionesTable();
    updateQueueBadge();
    
    console.log('[DeleteQueue] Cola después de agregar:', deleteQueue);
}

function saveDeleteQueueToStorage() {
    localStorage.setItem('cotizaciones_delete_queue', JSON.stringify(deleteQueue));
    console.log('[DeleteQueue] Cola guardada:', deleteQueue.length, 'items');
}

function loadDeleteQueueFromStorage() {
    const saved = localStorage.getItem('cotizaciones_delete_queue');
    if (saved) {
        deleteQueue = JSON.parse(saved);
        console.log('[DeleteQueue] Cola cargada:', deleteQueue.length, 'items');
        
        // Marcar las cotizaciones pendientes de eliminar
        deleteQueue.forEach(id => {
            const numericId = parseInt(id);
            const index = cotizaciones.findIndex(c => parseInt(c.id) === numericId);
            if (index !== -1) {
                cotizaciones[index].pendingDelete = true;
            }
        });
        
        // Actualizar la UI si hay items
        if (deleteQueue.length > 0) {
            updateStats();
            renderRecentTable();
            renderCotizacionesTable();
        }
    }
}

async function syncDeleteQueue() {
    if (!isOnline || deleteQueue.length === 0) return;
    
    console.log('[DeleteQueue] Sincronizando', deleteQueue.length, 'eliminaciones...');
    
    const itemsToDelete = [...deleteQueue];
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const id of itemsToDelete) {
        const numericId = parseInt(id);
        try {
            const response = await fetch(`/api/cotizaciones/${numericId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Error del servidor: ' + response.status);
            
            const data = await response.json();
            
            if (data.success) {
                console.log('[DeleteQueue] ✅ Eliminado:', numericId);
                // Remover de la cola
                deleteQueue = deleteQueue.filter(itemId => parseInt(itemId) !== numericId);
                // Remover de cotizaciones
                cotizaciones = cotizaciones.filter(c => parseInt(c.id) !== numericId);
                deletedCount++;
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('[DeleteQueue] ❌ Error eliminando:', numericId, error);
            failedCount++;
        }
    }
    
    saveDeleteQueueToStorage();
    localStorage.setItem('cotizaciones_cache', JSON.stringify(cotizaciones));
    
    if (deletedCount > 0) {
        showToast('🗑️ ' + deletedCount + ' cotización(es) eliminada(s)', 'success');
    }
    
    if (failedCount > 0) {
        showToast('⚠️ ' + failedCount + ' eliminación(es) fallida(s)', 'error');
    }
    
    updateStats();
    renderRecentTable();
    renderCotizacionesTable();
    updateQueueBadge();
}

// Cancelar eliminación pendiente
function cancelPendingDelete(id) {
    const numericId = parseInt(id);
    
    deleteQueue = deleteQueue.filter(itemId => parseInt(itemId) !== numericId);
    saveDeleteQueueToStorage();
    
    const index = cotizaciones.findIndex(c => parseInt(c.id) === numericId);
    if (index !== -1) {
        cotizaciones[index].pendingDelete = false;
        localStorage.setItem('cotizaciones_cache', JSON.stringify(cotizaciones));
    }
    
    showToast('Eliminación cancelada', 'info');
    updateStats();
    renderRecentTable();
    renderCotizacionesTable();
    updateQueueBadge();
}

// =============================================
// Cola de Ediciones (Edit Queue)
// =============================================
function addToEditQueue(id, formData) {
    const numericId = parseInt(id);
    
    console.log('[EditQueue] Agregando a cola de edición:', numericId, formData);
    
    // Si ya existe una edición pendiente para este ID, actualizarla
    const existingIndex = editQueue.findIndex(item => parseInt(item.id) === numericId);
    
    if (existingIndex !== -1) {
        // Actualizar la edición existente con los nuevos datos
        editQueue[existingIndex].data = formData;
        editQueue[existingIndex].timestamp = new Date().toISOString();
        console.log('[EditQueue] Edición actualizada en cola');
    } else {
        // Agregar nueva edición a la cola
        editQueue.push({
            id: numericId,
            data: formData,
            timestamp: new Date().toISOString(),
            status: 'pending'
        });
        console.log('[EditQueue] Nueva edición agregada a cola');
    }
    
    saveEditQueueToStorage();
    
    // Actualizar la cotización localmente con los nuevos datos
    const index = cotizaciones.findIndex(c => parseInt(c.id) === numericId);
    if (index !== -1) {
        cotizaciones[index] = {
            ...cotizaciones[index],
            ...formData,
            pendingEdit: true
        };
        localStorage.setItem('cotizaciones_cache', JSON.stringify(cotizaciones));
    }
    
    updateStats();
    renderRecentTable();
    renderCotizacionesTable();
    updateQueueBadge();
    
    console.log('[EditQueue] Cola después de agregar:', editQueue);
}

function saveEditQueueToStorage() {
    localStorage.setItem('cotizaciones_edit_queue', JSON.stringify(editQueue));
    console.log('[EditQueue] Cola guardada:', editQueue.length, 'items');
}

function loadEditQueueFromStorage() {
    const saved = localStorage.getItem('cotizaciones_edit_queue');
    if (saved) {
        editQueue = JSON.parse(saved);
        console.log('[EditQueue] Cola cargada:', editQueue.length, 'items');
        
        // Marcar las cotizaciones pendientes de editar
        editQueue.forEach(item => {
            const numericId = parseInt(item.id);
            const index = cotizaciones.findIndex(c => parseInt(c.id) === numericId);
            if (index !== -1) {
                // Aplicar los datos de la edición pendiente
                cotizaciones[index] = {
                    ...cotizaciones[index],
                    ...item.data,
                    pendingEdit: true
                };
            }
        });
        
        // Actualizar la UI si hay items
        if (editQueue.length > 0) {
            localStorage.setItem('cotizaciones_cache', JSON.stringify(cotizaciones));
            updateStats();
            renderRecentTable();
            renderCotizacionesTable();
        }
    }
}

async function syncEditQueue() {
    if (!isOnline || editQueue.length === 0) return;
    
    console.log('[EditQueue] Sincronizando', editQueue.length, 'ediciones...');
    
    const itemsToEdit = [...editQueue];
    let editedCount = 0;
    let failedCount = 0;
    
    for (const item of itemsToEdit) {
        const numericId = parseInt(item.id);
        try {
            const response = await fetch(`/api/cotizaciones/${numericId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(item.data)
            });
            
            if (!response.ok) throw new Error('Error del servidor: ' + response.status);
            
            const data = await response.json();
            
            if (data.success) {
                console.log('[EditQueue] ✅ Editado:', numericId);
                // Remover de la cola
                editQueue = editQueue.filter(qItem => parseInt(qItem.id) !== numericId);
                // Quitar marca de pendingEdit
                const index = cotizaciones.findIndex(c => parseInt(c.id) === numericId);
                if (index !== -1) {
                    cotizaciones[index].pendingEdit = false;
                }
                editedCount++;
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('[EditQueue] ❌ Error editando:', numericId, error);
            failedCount++;
        }
    }
    
    saveEditQueueToStorage();
    localStorage.setItem('cotizaciones_cache', JSON.stringify(cotizaciones));
    
    if (editedCount > 0) {
        showToast('✏️ ' + editedCount + ' cotización(es) actualizada(s)', 'success');
    }
    
    if (failedCount > 0) {
        showToast('⚠️ ' + failedCount + ' edición(es) fallida(s)', 'error');
    }
    
    updateStats();
    renderRecentTable();
    renderCotizacionesTable();
    updateQueueBadge();
}

// Cancelar edición pendiente
function cancelPendingEdit(id) {
    const numericId = parseInt(id);
    
    // Encontrar el item original antes de la edición
    editQueue = editQueue.filter(item => parseInt(item.id) !== numericId);
    saveEditQueueToStorage();
    
    const index = cotizaciones.findIndex(c => parseInt(c.id) === numericId);
    if (index !== -1) {
        cotizaciones[index].pendingEdit = false;
        localStorage.setItem('cotizaciones_cache', JSON.stringify(cotizaciones));
    }
    
    showToast('Edición cancelada. Recarga para ver datos originales.', 'info');
    updateStats();
    renderRecentTable();
    renderCotizacionesTable();
    updateQueueBadge();
    
    // Recargar datos del servidor si hay conexión
    if (isOnline) {
        loadCotizaciones();
    }
}

// =============================================
// Cargar y Renderizar Cotizaciones
// =============================================
function loadCotizaciones() {
    // Primero intentar cargar desde localStorage (para modo offline)
    const cachedData = localStorage.getItem('cotizaciones_cache');
    if (cachedData) {
        cotizaciones = JSON.parse(cachedData);
        updateStats();
        renderRecentTable();
        renderCotizacionesTable();
    }

    // Luego intentar actualizar desde el servidor
    fetch('/api/cotizaciones')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Guardar datos del servidor
            const serverCotizaciones = data;
            
            // Obtener items que están en cola (no sincronizados)
            const queuedItems = cotizaciones.filter(c => c.isQueued === true);
            
            // Combinar: primero los de cola, luego los del servidor
            cotizaciones = [...queuedItems, ...serverCotizaciones];
            
            // Guardar en localStorage para uso offline (incluyendo los de cola)
            localStorage.setItem('cotizaciones_cache', JSON.stringify(cotizaciones));
            localStorage.setItem('cotizaciones_cache_time', Date.now().toString());
            
            updateStats();
            renderRecentTable();
            renderCotizacionesTable();
        })
        .catch(error => {
            console.log('[Offline] Usando datos cacheados:', error);
            // Si no hay datos cacheados y hay error, mostrar mensaje
            if (!cachedData) {
                showToast('Sin conexión y sin datos cacheados', 'info');
            }
        });
}

function updateStats() {
    const total = cotizaciones.length;
    const aprobadas = cotizaciones.filter(c => c.estado === 'aprobada').length;
    const pendientes = cotizaciones.filter(c => c.estado === 'pendiente').length;
    const valorTotal = cotizaciones.reduce((sum, c) => sum + (c.precioEstimado || 0), 0);

    document.getElementById('totalCotizaciones').textContent = total;
    document.getElementById('cotizacionesAprobadas').textContent = aprobadas;
    document.getElementById('cotizacionesPendientes').textContent = pendientes;
    document.getElementById('valorTotal').textContent = formatCurrency(valorTotal);
}

function renderRecentTable() {
    const tbody = document.querySelector('#recentTable tbody');
    if (!tbody) return;

    const recent = cotizaciones.slice(0, 5);
    
    if (recent.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No hay cotizaciones</h3>
                    <p>Crea tu primera cotización</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = recent.map(cot => `
        <tr data-id="${cot.id}">
            <td>
                ${cot.isQueued ? `<span class="queue-icon" title="En cola - esperando conexión" onclick="retrySyncItem('${cot.id}')"><i class="fas fa-clock"></i></span>` : ''}
                #${cot.isQueued ? '---' : cot.id}
            </td>
            <td>${escapeHtml(cot.producto)}</td>
            <td>${cot.cantidad}</td>
            <td>${formatCurrency(cot.precioEstimado)}</td>
            <td>
                ${cot.isQueued 
                    ? '<span class="status-badge queued"><i class="fas fa-clock"></i> En cola</span>' 
                    : `<span class="status-badge ${cot.estado}">${capitalizeFirst(cot.estado)}</span>`
                }
            </td>
            <td>${formatDate(cot.fecha_creacion)}</td>
        </tr>
    `).join('');
}

function renderCotizacionesTable() {
    const tbody = document.querySelector('#cotizacionesTable tbody');
    if (!tbody) return;

    // Aplicar filtros
    let filtered = [...cotizaciones];
    
    const estadoFilter = document.getElementById('filterEstado')?.value;
    if (estadoFilter) {
        filtered = filtered.filter(c => c.estado === estadoFilter);
    }

    const ordenFilter = document.getElementById('filterOrden')?.value;
    switch (ordenFilter) {
        case 'fecha_asc':
            filtered.sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion));
            break;
        case 'precio_desc':
            filtered.sort((a, b) => (b.precioEstimado || 0) - (a.precioEstimado || 0));
            break;
        case 'precio_asc':
            filtered.sort((a, b) => (a.precioEstimado || 0) - (b.precioEstimado || 0));
            break;
        default:
            filtered.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
    }

    // Aplicar búsqueda
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(c => 
            c.producto.toLowerCase().includes(searchTerm) ||
            c.empaquetadoDeseado?.toLowerCase().includes(searchTerm)
        );
    }

    // Paginación
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);

    if (paginated.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>No se encontraron cotizaciones</h3>
                        <p>Intenta con diferentes filtros o crea una nueva</p>
                        <button class="btn-primary" onclick="showSection('nueva')">
                            <i class="fas fa-plus"></i> Nueva Cotización
                        </button>
                    </div>
                </td>
            </tr>
        `;
        renderPagination(0);
        return;
    }

    tbody.innerHTML = paginated.map(cot => `
        <tr data-id="${cot.id}" class="${cot.isQueued ? 'queued-row' : ''} ${cot.pendingDelete ? 'pending-delete-row' : ''} ${cot.pendingEdit ? 'pending-edit-row' : ''}">
            <td>
                ${cot.isQueued ? `<span class="queue-icon" title="En cola - esperando conexión" onclick="retrySyncItem('${cot.id}')"><i class="fas fa-clock"></i></span>` : ''}
                ${cot.pendingDelete ? `<span class="queue-icon delete-pending" title="Eliminación pendiente - esperando conexión"><i class="fas fa-clock"></i></span>` : ''}
                ${cot.pendingEdit ? `<span class="queue-icon edit-pending" title="Edición pendiente - esperando conexión"><i class="fas fa-clock"></i></span>` : ''}
                #${cot.isQueued ? '---' : cot.id}
            </td>
            <td>${escapeHtml(cot.producto)}</td>
            <td>${cot.cantidad}</td>
            <td>${escapeHtml(cot.empaquetadoDeseado || '-')}</td>
            <td>${formatCurrency(cot.precioEstimado)}</td>
            <td>
                ${cot.pendingDelete 
                    ? '<span class="status-badge pending-delete"><i class="fas fa-clock"></i> Eliminando...</span>'
                    : cot.pendingEdit
                        ? '<span class="status-badge pending-edit"><i class="fas fa-clock"></i> Editando...</span>'
                        : cot.isQueued 
                            ? '<span class="status-badge queued"><i class="fas fa-clock"></i> En cola</span>' 
                            : `<span class="status-badge ${cot.estado}">${capitalizeFirst(cot.estado)}</span>`
                }
            </td>
            <td>${formatDate(cot.fecha_creacion)}</td>
            <td>
                <div class="action-buttons">
                    ${cot.pendingDelete 
                        ? `<button class="btn-action cancel-delete" onclick="cancelPendingDelete(${cot.id})" title="Cancelar eliminación">
                               <i class="fas fa-undo"></i>
                           </button>`
                        : cot.pendingEdit
                            ? `<button class="btn-action cancel-edit" onclick="cancelPendingEdit(${cot.id})" title="Cancelar edición">
                                   <i class="fas fa-undo"></i>
                               </button>`
                            : cot.isQueued 
                                ? `<button class="btn-action sync" onclick="retrySyncItem('${cot.id}')" title="Sincronizar">
                                       <i class="fas fa-sync"></i>
                                   </button>`
                                : `<button class="btn-action edit" onclick="editCotizacion(${cot.id})" title="Editar">
                                       <i class="fas fa-edit"></i>
                                   </button>`
                    }
                    ${cot.pendingDelete || cot.pendingEdit
                        ? ''
                        : `<button class="btn-action delete" onclick="${cot.isQueued ? `removeQueuedItem('${cot.id}')` : `deleteCotizacion(${cot.id})`}" title="Eliminar">
                               <i class="fas fa-trash"></i>
                           </button>`
                    }
                </div>
            </td>
        </tr>
    `).join('');

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';
    
    // Botón anterior
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;

    // Números de página
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<button disabled>...</button>`;
        }
    }

    // Botón siguiente
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;

    pagination.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    renderCotizacionesTable();
}

// =============================================
// Búsqueda y Filtros
// =============================================
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                renderCotizacionesTable();
            }, 300);
        });
    }
}

function initializeFilters() {
    const filterEstado = document.getElementById('filterEstado');
    const filterOrden = document.getElementById('filterOrden');

    if (filterEstado) {
        filterEstado.addEventListener('change', function() {
            currentPage = 1;
            renderCotizacionesTable();
        });
    }

    if (filterOrden) {
        filterOrden.addEventListener('change', function() {
            currentPage = 1;
            renderCotizacionesTable();
        });
    }
}

// =============================================
// Reportes
// =============================================
let estadoChart = null;
let valorChart = null;

function renderReports() {
    renderEstadoChart();
    renderValorChart();
    updateSummary();
}

function renderEstadoChart() {
    const ctx = document.getElementById('estadoChart');
    if (!ctx) return;

    const pendientes = cotizaciones.filter(c => c.estado === 'pendiente').length;
    const aprobadas = cotizaciones.filter(c => c.estado === 'aprobada').length;
    const rechazadas = cotizaciones.filter(c => c.estado === 'rechazada').length;

    if (estadoChart) {
        estadoChart.destroy();
    }

    estadoChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendientes', 'Aprobadas', 'Rechazadas'],
            datasets: [{
                data: [pendientes, aprobadas, rechazadas],
                backgroundColor: ['#ed8936', '#48bb78', '#f56565'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderValorChart() {
    const ctx = document.getElementById('valorChart');
    if (!ctx) return;

    // Agrupar por mes
    const monthlyData = {};
    cotizaciones.forEach(cot => {
        const date = new Date(cot.fecha_creacion);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey] += cot.precioEstimado || 0;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(m => {
        const [year, month] = m.split('-');
        return new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
    });
    const values = sortedMonths.map(m => monthlyData[m]);

    if (valorChart) {
        valorChart.destroy();
    }

    valorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Valor',
                data: values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function updateSummary() {
    // Promedio
    const total = cotizaciones.reduce((sum, c) => sum + (c.precioEstimado || 0), 0);
    const promedio = cotizaciones.length > 0 ? total / cotizaciones.length : 0;
    document.getElementById('promedioValor').textContent = formatCurrency(promedio);

    // Producto más cotizado
    const productCount = {};
    cotizaciones.forEach(c => {
        productCount[c.producto] = (productCount[c.producto] || 0) + 1;
    });
    const topProduct = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('productoTop').textContent = topProduct ? topProduct[0] : '-';

    // Tasa de aprobación
    const aprobadas = cotizaciones.filter(c => c.estado === 'aprobada').length;
    const tasa = cotizaciones.length > 0 ? (aprobadas / cotizaciones.length) * 100 : 0;
    document.getElementById('tasaAprobacion').textContent = `${tasa.toFixed(1)}%`;
}

function exportarReporte() {
    // Exportar a CSV
    const headers = ['ID', 'Producto', 'Cantidad', 'Empaquetado', 'Precio', 'Estado', 'Fecha'];
    const rows = cotizaciones.map(c => [
        c.id,
        c.producto,
        c.cantidad,
        c.empaquetadoDeseado || '',
        c.precioEstimado || 0,
        c.estado,
        c.fecha_creacion
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotizaciones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Reporte exportado correctamente', 'success');
}

// =============================================
// Modal
// =============================================
function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    
    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.onclick = onConfirm;
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('confirmModal').classList.remove('active');
}

// Cerrar modal al hacer clic fuera
document.getElementById('confirmModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// =============================================
// Toast Notifications
// =============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// =============================================
// Utilidades
// =============================================
function formatCurrency(value) {
    if (value === null || value === undefined) return '$0.00';
    return '$' + parseFloat(value).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function capitalizeFirst(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================
// Sistema de Cola Offline (Queue)
// =============================================
function initializeOfflineQueue() {
    console.log('[Queue] Inicializando sistema de cola offline...');
    
    // Cargar cola pendiente desde localStorage
    const savedQueue = localStorage.getItem('cotizaciones_queue');
    if (savedQueue) {
        pendingQueue = JSON.parse(savedQueue);
        console.log('[Queue] Cola cargada desde localStorage:', pendingQueue.length, 'items');
        mergePendingWithCotizaciones();
    }
    
    // Cargar cola de eliminaciones pendientes
    loadDeleteQueueFromStorage();
    
    // Cargar cola de ediciones pendientes
    loadEditQueueFromStorage();

    // Actualizar estado de conexión
    isOnline = navigator.onLine;
    console.log('[Queue] Estado inicial de conexión:', isOnline ? 'Online' : 'Offline');

    // Escuchar cambios de conexión
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Actualizar UI
    updateOnlineStatus();
    updateQueueBadge();
    
    // Configurar click en botón de cola
    const queueBtn = document.getElementById('queueBtn');
    if (queueBtn) {
        queueBtn.addEventListener('click', function() {
            const totalQueue = pendingQueue.length + deleteQueue.length + editQueue.length;
            if (totalQueue === 0) {
                showToast('No hay operaciones en cola', 'info');
            } else if (isOnline) {
                showToast('Sincronizando ' + totalQueue + ' operación(es)...', 'info');
                syncPendingQueue();
                syncDeleteQueue();
                syncEditQueue();
            } else {
                showToast('Sin conexión. Se sincronizará automáticamente cuando vuelva el internet.', 'info');
            }
        });
    }
    
    // Intentar sincronizar si hay elementos en cola y estamos online
    if (isOnline && (pendingQueue.length > 0 || deleteQueue.length > 0 || editQueue.length > 0)) {
        console.log('[Queue] Hay items en cola y estamos online, sincronizando...');
        setTimeout(() => {
            syncPendingQueue();
            syncDeleteQueue();
            syncEditQueue();
        }, 1000); // Pequeño delay para que cargue todo
    }
}

function handleOnline() {
    console.log('[Queue] 🟢 Conexión restaurada!');
    isOnline = true;
    updateOnlineStatus();
    
    const totalQueue = pendingQueue.length + deleteQueue.length + editQueue.length;
    
    if (totalQueue > 0) {
        showToast('¡Conexión restaurada! Sincronizando ' + totalQueue + ' operación(es)...', 'success');
        // Sincronizar automáticamente
        setTimeout(() => {
            syncPendingQueue();
            syncDeleteQueue();
            syncEditQueue();
        }, 500);
    } else {
        showToast('Conexión restaurada', 'success');
        // Recargar datos del servidor
        loadCotizaciones();
    }
}

function handleOffline() {
    console.log('[Queue] 🔴 Sin conexión');
    isOnline = false;
    updateOnlineStatus();
    showToast('Sin conexión. Los cambios se guardarán en cola.', 'info');
}

function updateOnlineStatus() {
    const indicator = document.getElementById('offlineIndicator');
    if (indicator) {
        if (!isOnline) {
            indicator.classList.add('visible');
        } else {
            indicator.classList.remove('visible');
        }
    }
    document.body.classList.toggle('offline-mode', !isOnline);
}

// Guardar cola en localStorage
function saveQueueToStorage() {
    localStorage.setItem('cotizaciones_queue', JSON.stringify(pendingQueue));
    console.log('[Queue] Cola guardada:', pendingQueue.length, 'items');
    updateQueueBadge();
}

// Generar ID temporal para cotizaciones offline
function generateTempId() {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Agregar cotización a la cola
function addToQueue(cotizacionData) {
    console.log('[Queue] Agregando a cola:', cotizacionData);
    
    const queueItem = {
        tempId: generateTempId(),
        data: cotizacionData,
        timestamp: new Date().toISOString(),
        status: 'pending', // pending, syncing, failed
        retries: 0
    };
    
    pendingQueue.push(queueItem);
    saveQueueToStorage();
    
    // Agregar a la lista visual de cotizaciones
    const visualCotizacion = {
        id: queueItem.tempId,
        producto: cotizacionData.producto,
        cantidad: cotizacionData.cantidad,
        empaquetadoDeseado: cotizacionData.empaquetadoDeseado,
        precioEstimado: cotizacionData.precioEstimado,
        notas: cotizacionData.notas,
        estado: cotizacionData.estado || 'pendiente',
        fecha_creacion: queueItem.timestamp,
        isQueued: true
    };
    
    cotizaciones.unshift(visualCotizacion);
    localStorage.setItem('cotizaciones_cache', JSON.stringify(cotizaciones));
    
    console.log('[Queue] Item agregado. Total en cola:', pendingQueue.length);
    
    return queueItem;
}

// Mezclar cotizaciones pendientes con las cargadas
function mergePendingWithCotizaciones() {
    pendingQueue.forEach(item => {
        const exists = cotizaciones.some(c => c.id === item.tempId);
        if (!exists) {
            cotizaciones.unshift({
                id: item.tempId,
                producto: item.data.producto,
                cantidad: item.data.cantidad,
                empaquetadoDeseado: item.data.empaquetadoDeseado,
                precioEstimado: item.data.precioEstimado,
                notas: item.data.notas,
                estado: item.data.estado || 'pendiente',
                fecha_creacion: item.timestamp,
                isQueued: true
            });
        }
    });
    updateStats();
    renderRecentTable();
    renderCotizacionesTable();
}

// Sincronizar cola pendiente
async function syncPendingQueue() {
    if (!isOnline) {
        console.log('[Queue] No hay conexión, no se puede sincronizar');
        return;
    }
    
    if (pendingQueue.length === 0) {
        console.log('[Queue] Cola vacía, nada que sincronizar');
        return;
    }

    console.log('[Queue] Iniciando sincronización de', pendingQueue.length, 'items...');
    
    const itemsToSync = [...pendingQueue];
    let syncedCount = 0;
    let failedCount = 0;

    for (const item of itemsToSync) {
        if (item.status === 'syncing') continue;
        
        console.log('[Queue] Sincronizando item:', item.tempId);
        item.status = 'syncing';
        saveQueueToStorage();
        updateQueueItemVisual(item.tempId, 'syncing');

        try {
            const response = await fetch('/api/cotizaciones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(item.data)
            });

            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor: ' + response.status);
            }

            const data = await response.json();
            console.log('[Queue] Respuesta del servidor:', data);
            
            if (data.success || data.id) {
                console.log('[Queue] ✅ Item sincronizado exitosamente:', item.tempId, '-> ID real:', data.id);
                removeFromQueue(item.tempId);
                updateCotizacionId(item.tempId, data.id);
                syncedCount++;
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('[Queue] ❌ Error sincronizando item:', item.tempId, error);
            item.status = 'failed';
            item.retries++;
            saveQueueToStorage();
            updateQueueItemVisual(item.tempId, 'failed');
            failedCount++;
        }
    }

    console.log('[Queue] Sincronización completada. Exitosos:', syncedCount, 'Fallidos:', failedCount);

    if (syncedCount > 0) {
        showToast('✅ ' + syncedCount + ' cotización(es) sincronizada(s) correctamente', 'success');
        // Recargar datos del servidor para obtener IDs reales
        loadCotizaciones();
    }
    
    if (failedCount > 0) {
        showToast('⚠️ ' + failedCount + ' cotización(es) no pudieron sincronizarse', 'error');
    }
    
    updateQueueBadge();
}

// Remover item de la cola
function removeFromQueue(tempId) {
    pendingQueue = pendingQueue.filter(item => item.tempId !== tempId);
    saveQueueToStorage();
}

// Actualizar ID de cotización temporal a real
function updateCotizacionId(tempId, realId) {
    const index = cotizaciones.findIndex(c => c.id === tempId);
    if (index !== -1) {
        cotizaciones[index].id = realId;
        cotizaciones[index].isQueued = false;
        localStorage.setItem('cotizaciones_cache', JSON.stringify(cotizaciones));
    }
}

// Actualizar visual del item en cola
function updateQueueItemVisual(tempId, status) {
    const rows = document.querySelectorAll(`tr[data-id="${tempId}"]`);
    rows.forEach(row => {
        const queueIcon = row.querySelector('.queue-icon');
        if (queueIcon) {
            if (status === 'syncing') {
                queueIcon.innerHTML = '<i class="fas fa-sync fa-spin"></i>';
                queueIcon.title = 'Sincronizando...';
            } else if (status === 'failed') {
                queueIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                queueIcon.title = 'Error al sincronizar. Click para reintentar.';
                queueIcon.classList.add('failed');
            }
        }
    });
}

// Obtener cantidad de items en cola
function getQueueCount() {
    return pendingQueue.length + deleteQueue.length + editQueue.length;
}

// Actualizar badge de cola en el header
function updateQueueBadge() {
    const queueBtn = document.getElementById('queueBtn');
    const queueBadge = document.getElementById('queueBadge');
    
    if (queueBtn && queueBadge) {
        const count = getQueueCount();
        queueBadge.textContent = count;
        queueBtn.style.display = count > 0 ? 'flex' : 'none';
        
        // Añadir animación si hay elementos
        if (count > 0) {
            queueBtn.classList.add('has-items');
        } else {
            queueBtn.classList.remove('has-items');
        }
        
        // Cambiar color si hay eliminaciones pendientes
        if (deleteQueue.length > 0) {
            queueBtn.classList.add('has-deletes');
        } else {
            queueBtn.classList.remove('has-deletes');
        }
        
        // Añadir clase si hay ediciones pendientes
        if (editQueue.length > 0) {
            queueBtn.classList.add('has-edits');
        } else {
            queueBtn.classList.remove('has-edits');
        }
    }
}

// Reintentar sincronización manual
function retrySyncItem(tempId) {
    const item = pendingQueue.find(i => i.tempId === tempId);
    if (item && isOnline) {
        item.status = 'pending';
        saveQueueToStorage();
        syncPendingQueue();
    } else if (!isOnline) {
        showToast('Sin conexión. Se sincronizará cuando vuelva el internet.', 'info');
    }
}

// Eliminar item de la cola (sin sincronizar)
function removeQueuedItem(tempId) {
    showConfirmModal(
        'Eliminar Cotización en Cola',
        '¿Estás seguro de que deseas eliminar esta cotización? No ha sido enviada al servidor aún.',
        function() {
            // Remover de la cola
            removeFromQueue(tempId);
            
            // Remover de la lista visual
            cotizaciones = cotizaciones.filter(c => c.id !== tempId);
            localStorage.setItem('cotizaciones_cache', JSON.stringify(cotizaciones));
            
            showToast('Cotización eliminada de la cola', 'success');
            updateStats();
            renderRecentTable();
            renderCotizacionesTable();
            closeModal();
        }
    );
}
