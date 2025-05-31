/**
 * PixelPlay Downloads Manager
 * Gestor de descargas para el launcher de PixelPlay con soporte multi-plataforma
 */

class DownloadManager {
    constructor() {
        this.downloadPath = './Download-hoster/';
        this.downloadInfoUrl = './downloads-info.json';
        this.isDownloading = false;
        this.downloadInfo = null;
        this.userOS = this.detectOS();
        
        this.init();
    }
    
    /**
     * Detecta el sistema operativo del usuario
     */
    detectOS() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        
        if (/Mac|iPhone|iPad|iPod/.test(userAgent) || /Mac/.test(platform)) {
            return 'mac';
        } else if (/Win/.test(userAgent) || /Win/.test(platform)) {
            return 'windows';
        } else if (/Linux/.test(userAgent) || /Linux/.test(platform)) {
            return 'linux'; // No soportado pero detectado
        } else {
            return 'unknown';
        }
    }
    
    /**
     * Inicializa el gestor de descargas
     */
    async init() {
        console.log('PixelPlay Download Manager inicializado');
        console.log('Sistema operativo detectado:', this.userOS);
        
        try {
            await this.loadDownloadInfo();
            this.setupEventListeners();
            this.checkFileAvailability();
            this.updateUI();
        } catch (error) {
            console.error('Error inicializando download manager:', error);
            this.showErrorMessage('Error al cargar información de descarga');
        }
    }
    
    /**
     * Carga la información de descargas desde el JSON
     */
    async loadDownloadInfo() {
        try {
            const response = await fetch(this.downloadInfoUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.downloadInfo = await response.json();
            console.log('Información de descarga cargada:', this.downloadInfo);
            
        } catch (error) {
            console.error('Error cargando download info:', error);
            throw new Error('No se pudo cargar la información de descargas');
        }
    }
    
    /**
     * Obtiene la información de descarga para el OS actual
     */
    getCurrentOSDownload() {
        if (!this.downloadInfo || !this.downloadInfo.downloads) {
            return null;
        }
        
        const osDownload = this.downloadInfo.downloads[this.userOS];
        if (!osDownload) {
            return null;
        }
        
        return {
            ...osDownload,
            url: `${this.downloadPath}${osDownload.filename}`,
            version: this.downloadInfo.version,
            releaseDate: this.downloadInfo.releaseDate
        };
    }
    
    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.handleDownload());
        }
    }
    
    /**
     * Actualiza la interfaz de usuario con información específica del OS
     */
    updateUI() {
        const currentDownload = this.getCurrentOSDownload();
        if (!currentDownload) {
            this.showUnsupportedOS();
            return;
        }
        
        // Actualizar botón de descarga
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            const osName = this.userOS === 'mac' ? 'macOS' : 'Windows';
            const osIcon = this.userOS === 'mac' ? '🍎' : '🪟';
            
            downloadBtn.innerHTML = `
                <span class="download-icon">⬇️</span>
                Descargar para ${osName} ${osIcon}
                <span class="download-size">(${currentDownload.size})</span>
            `;
        }
        
        // Actualizar información de requisitos
        this.updateSystemRequirements(currentDownload);
        
        // Mostrar información de versión
        this.showVersionInfo();
    }
    
    /**
     * Actualiza los requisitos del sistema en la UI
     */
    updateSystemRequirements(downloadInfo) {
        const requirementsCard = document.querySelector('.info-card:first-child ul');
        if (requirementsCard && this.downloadInfo) {
            const osSpecificReqs = downloadInfo.compatible.join(', ');
            const archInfo = downloadInfo.architecture.join(' / ');
            
            requirementsCard.innerHTML = `
                <li>Minecraft Java Edition</li>
                <li>${this.downloadInfo.requirements.java}</li>
                <li>${this.downloadInfo.requirements.ram}</li>
                <li>${this.downloadInfo.requirements.storage}</li>
                <li>Sistemas: ${osSpecificReqs}</li>
                <li>Arquitectura: ${archInfo}</li>
            `;
        }
    }
    
    /**
     * Muestra información de versión
     */
    showVersionInfo() {
        if (!this.downloadInfo) return;
        
        const statusDiv = document.getElementById('downloadStatus');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="version-info">
                    📦 Versión ${this.downloadInfo.version} | 📅 ${this.downloadInfo.releaseDate}
                </div>
            `;
        }
    }
    
    /**
     * Muestra mensaje para OS no soportado
     */
    showUnsupportedOS() {
        const downloadBtn = document.getElementById('downloadBtn');
        const statusDiv = document.getElementById('downloadStatus');
        
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = `
                <span class="download-icon">❌</span>
                Sistema no soportado
            `;
            downloadBtn.style.opacity = '0.6';
            downloadBtn.style.cursor = 'not-allowed';
        }
        
        if (statusDiv) {
            const supportedSystems = Object.keys(this.downloadInfo?.downloads || {}).join(', ');
            statusDiv.innerHTML = `
                <div class="error-message">
                    ⚠️ Lo sentimos, tu sistema operativo (${this.userOS}) no está soportado actualmente.<br>
                    <small>Sistemas soportados: ${supportedSystems}</small><br>
                    <small>¿Usas Linux? Puedes intentar ejecutar la versión de Windows con Wine.</small>
                </div>
            `;
        }
    }
    
    /**
     * Verifica si el archivo está disponible para descarga
     */
    async checkFileAvailability() {
        const currentDownload = this.getCurrentOSDownload();
        if (!currentDownload) {
            console.warn('No hay descarga disponible para este OS');
            return;
        }
        
        try {
            const response = await fetch(currentDownload.url, { 
                method: 'HEAD' 
            });
            
            if (response.ok) {
                this.enableDownloadButton();
                console.log('Archivo de descarga disponible:', currentDownload.filename);
            } else {
                this.disableDownloadButton('Archivo no disponible');
                console.warn('Archivo de descarga no encontrado:', currentDownload.url);
            }
        } catch (error) {
            this.disableDownloadButton('Error de conexión');
            console.error('Error verificando disponibilidad:', error);
        }
    }
    
    /**
     * Habilita el botón de descarga
     */
    enableDownloadButton() {
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.style.opacity = '1';
            downloadBtn.style.cursor = 'pointer';
        }
    }
    
    /**
     * Deshabilita el botón de descarga
     */
    disableDownloadButton(reason = 'No disponible') {
        const downloadBtn = document.getElementById('downloadBtn');
        const statusDiv = document.getElementById('downloadStatus');
        
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.style.opacity = '0.6';
            downloadBtn.style.cursor = 'not-allowed';
        }
        
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="error-message">
                    ❌ ${reason}. Inténtalo más tarde.
                </div>
            `;
        }
    }
    
    /**
     * Maneja el proceso de descarga
     */
    async handleDownload() {
        if (this.isDownloading) {
            return;
        }
        
        const currentDownload = this.getCurrentOSDownload();
        if (!currentDownload) {
            this.showErrorMessage('No se encontró descarga para tu sistema');
            return;
        }
        
        this.isDownloading = true;
        const downloadBtn = document.getElementById('downloadBtn');
        const statusDiv = document.getElementById('downloadStatus');
        
        try {
            // Cambiar estado del botón
            if (downloadBtn) {
                downloadBtn.disabled = true;
                const osName = this.userOS === 'mac' ? 'macOS' : 'Windows';
                downloadBtn.innerHTML = `
                    <span class="download-icon">⏳</span>
                    Preparando descarga para ${osName}...
                `;
            }
            
            // Mostrar estado de preparación
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div class="preparing-message">
                        🔄 Preparando descarga de ${currentDownload.filename}...<br>
                        <small>Verificando integridad del archivo...</small>
                    </div>
                `;
            }
            
            // Simular verificación de seguridad (2 segundos)
            await this.sleep(2000);
            
            // Verificar nuevamente la disponibilidad del archivo
            const isAvailable = await this.verifyFileIntegrity(currentDownload);
            
            if (!isAvailable) {
                throw new Error('El archivo no está disponible o está corrupto');
            }
            
            // Actualizar estado
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div class="downloading-message">
                        ⬇️ Iniciando descarga...<br>
                        <small>Tu descarga comenzará automáticamente</small>
                    </div>
                `;
            }
            
            // Esperar un momento antes de iniciar la descarga
            await this.sleep(1000);
            
            // Iniciar descarga real
            const success = await this.initiateDownload(currentDownload);
            
            if (success) {
                this.showSuccessMessage(currentDownload);
                this.trackDownload(currentDownload);
            } else {
                throw new Error('Error al iniciar la descarga');
            }
            
        } catch (error) {
            console.error('Error en la descarga:', error);
            this.showErrorMessage(error.message);
        } finally {
            // Restaurar botón después de 5 segundos
            setTimeout(() => {
                this.resetDownloadButton();
                this.isDownloading = false;
            }, 5000);
        }
    }
    
    /**
     * Verifica la integridad del archivo
     */
    async verifyFileIntegrity(downloadInfo) {
        try {
            const response = await fetch(downloadInfo.url, { method: 'HEAD' });
            return response.ok && response.headers.get('content-length');
        } catch (error) {
            console.error('Error verificando integridad:', error);
            return false;
        }
    }
    
    /**
     * Inicia la descarga del archivo
     */
    async initiateDownload(downloadInfo) {
        try {
            // Crear elemento de descarga
            const link = document.createElement('a');
            link.href = downloadInfo.url;
            link.download = downloadInfo.filename;
            link.style.display = 'none';
            
            // Agregar al DOM y hacer clic
            document.body.appendChild(link);
            link.click();
            
            // Limpiar
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);
            
            return true;
        } catch (error) {
            console.error('Error iniciando descarga:', error);
            return false;
        }
    }
    
    /**
     * Muestra mensaje de éxito
     */
    showSuccessMessage(downloadInfo) {
        const statusDiv = document.getElementById('downloadStatus');
        if (statusDiv) {
            const osName = this.userOS === 'mac' ? 'macOS' : 'Windows';
            const installInstructions = this.userOS === 'mac' 
                ? 'Abre el archivo .dmg y arrastra PixelPlay a Aplicaciones'
                : 'Ejecuta el archivo .exe como administrador para instalar';
                
            statusDiv.innerHTML = `
                <div class="success-message">
                    ✅ ¡Descarga iniciada correctamente!<br>
                    <small>Descargando: ${downloadInfo.filename} (${downloadInfo.size})</small><br>
                    <small><strong>Instalación:</strong> ${installInstructions}</small>
                </div>
            `;
        }
    }
    
    /**
     * Muestra mensaje de error
     */
    showErrorMessage(message) {
        const statusDiv = document.getElementById('downloadStatus');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="error-message">
                    ❌ Error: ${message}<br>
                    <small>Por favor, inténtalo nuevamente o contacta soporte técnico.</small><br>
                    <small>Discord: discord.gg/pixelplay</small>
                </div>
            `;
        }
    }
    
    /**
     * Restaura el botón de descarga a su estado original
     */
    resetDownloadButton() {
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            const currentDownload = this.getCurrentOSDownload();
            if (currentDownload) {
                downloadBtn.disabled = false;
                const osName = this.userOS === 'mac' ? 'macOS' : 'Windows';
                const osIcon = this.userOS === 'mac' ? '🍎' : '🪟';
                
                downloadBtn.innerHTML = `
                    <span class="download-icon">⬇️</span>
                    Descargar para ${osName} ${osIcon}
                    <span class="download-size">(${currentDownload.size})</span>
                `;
            }
        }
    }
    
    /**
     * Registra estadísticas de descarga
     */
    trackDownload(downloadInfo) {
        const downloadData = {
            timestamp: new Date().toISOString(),
            filename: downloadInfo.filename,
            version: downloadInfo.version,
            os: this.userOS,
            userAgent: navigator.userAgent,
            referrer: document.referrer || 'direct',
            size: downloadInfo.size
        };
        
        // Guardar en localStorage para estadísticas locales
        try {
            const downloads = JSON.parse(localStorage.getItem('pixelplay_downloads') || '[]');
            downloads.push(downloadData);
            
            // Mantener solo los últimos 10 registros
            if (downloads.length > 10) {
                downloads.splice(0, downloads.length - 10);
            }
            
            localStorage.setItem('pixelplay_downloads', JSON.stringify(downloads));
        } catch (error) {
            console.warn('No se pudo guardar estadística de descarga:', error);
        }
        
        console.log('Descarga registrada:', downloadData);
    }
    
    /**
     * Obtiene información del archivo para el OS actual
     */
    getFileInfo() {
        if (!this.downloadInfo) return null;
        
        return {
            ...this.downloadInfo,
            currentOS: this.userOS,
            currentDownload: this.getCurrentOSDownload()
        };
    }
    
    /**
     * Obtiene estadísticas de descargas
     */
    getDownloadStats() {
        try {
            return JSON.parse(localStorage.getItem('pixelplay_downloads') || '[]');
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return [];
        }
    }
    
    /**
     * Utility function para pausas
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Verifica compatibilidad del sistema
     */
    checkSystemCompatibility() {
        const currentDownload = this.getCurrentOSDownload();
        
        const compatibility = {
            os: this.userOS,
            isSupported: !!currentDownload,
            warnings: [],
            requirements: this.downloadInfo?.requirements || {}
        };
        
        if (!currentDownload) {
            compatibility.warnings.push(`Sistema operativo ${this.userOS} no está soportado`);
        }
        
        // Verificar si es un navegador compatible
        if (!window.fetch) {
            compatibility.warnings.push('Navegador no compatible con descargas modernas');
        }
        
        return compatibility;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Crear instancia global del gestor de descargas
    window.downloadManager = new DownloadManager();
});

// Agregar estilos CSS adicionales para los nuevos elementos
const style = document.createElement('style');
style.textContent = `
    .preparing-message, .downloading-message {
        color: #3498db;
        font-weight: 500;
        padding: 1rem;
        background: rgba(52, 152, 219, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(52, 152, 219, 0.3);
        display: inline-block;
        margin-top: 1rem;
        animation: pulse 2s infinite;
        text-align: center;
    }
    
    .error-message {
        color: #e74c3c;
        font-weight: 500;
        padding: 1rem;
        background: rgba(231, 76, 60, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(231, 76, 60, 0.3);
        display: inline-block;
        margin-top: 1rem;
        text-align: center;
    }
    
    .success-message {
        color: #2ecc40;
        font-weight: 500;
        padding: 1rem;
        background: rgba(46, 204, 64, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(46, 204, 64, 0.3);
        display: inline-block;
        margin-top: 1rem;
        text-align: center;
    }
    
    .version-info {
        color: #95a5a6;
        font-size: 0.9rem;
        padding: 0.5rem;
        margin-top: 0.5rem;
        text-align: center;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
`;
document.head.appendChild(style);