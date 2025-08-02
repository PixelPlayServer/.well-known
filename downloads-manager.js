/**
 * PixelPlay Downloads Manager
 * Gestor de descargas para el launcher de PixelPlay con soporte multi-plataforma
 * Soporta archivos locales y en la nube
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
            return 'linux';
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
        
        // Determinar la URL según el tipo de archivo
        let downloadUrl;
        if (osDownload.type === 'cloud' && osDownload.cloudUrl) {
            downloadUrl = osDownload.cloudUrl;
        } else if (osDownload.type === 'local') {
            downloadUrl = `${this.downloadPath}${osDownload.filename}`;
        } else {
            console.error('Configuración de descarga inválida para', this.userOS);
            return null;
        }
        
        return {
            ...osDownload,
            url: downloadUrl,
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
            const osInfo = this.getOSDisplayInfo();
            const fileTypeIcon = currentDownload.type === 'cloud' ? '☁️' : '💾';
            
            downloadBtn.innerHTML = `
                <span class="download-icon">⬇️</span>
                Descargar para ${osInfo.name} ${osInfo.icon}
                <span class="download-size">(${currentDownload.size}) ${fileTypeIcon}</span>
            `;
        }
        
        // Actualizar información de requisitos
        this.updateSystemRequirements(currentDownload);
        
        // Mostrar información de versión y tipo de archivo
        this.showVersionInfo();
    }
    
    /**
     * Obtiene información de visualización del OS
     */
    getOSDisplayInfo() {
        switch (this.userOS) {
            case 'mac':
                return { name: 'macOS', icon: '🍎' };
            case 'windows':
                return { name: 'Windows', icon: '🪟' };
            case 'linux':
                return { name: 'Linux', icon: '🐧' };
            default:
                return { name: 'Sistema', icon: '💻' };
        }
    }
    
    /**
     * Actualiza los requisitos del sistema en la UI
     */
    updateSystemRequirements(downloadInfo) {
        const requirementsCard = document.querySelector('.info-card:first-child ul');
        if (requirementsCard && this.downloadInfo) {
            const osSpecificReqs = downloadInfo.compatible.join(', ');
            const archInfo = downloadInfo.architecture.join(' / ');
            const fileTypeText = downloadInfo.type === 'cloud' ? 'Archivo en la nube' : 'Archivo local';
            
            requirementsCard.innerHTML = `
                <li>Minecraft Java Edition</li>
                <li>${this.downloadInfo.requirements.java}</li>
                <li>${this.downloadInfo.requirements.ram}</li>
                <li>${this.downloadInfo.requirements.storage}</li>
                <li>Sistemas: ${osSpecificReqs}</li>
                <li>Arquitectura: ${archInfo}</li>
                <li>Tipo: ${fileTypeText}</li>
            `;
        }
    }
    
    /**
     * Muestra información de versión y tipo de archivo
     */
    showVersionInfo() {
        if (!this.downloadInfo) return;
        
        const currentDownload = this.getCurrentOSDownload();
        const statusDiv = document.getElementById('downloadStatus');
        
        if (statusDiv && currentDownload) {
            const fileTypeIcon = currentDownload.type === 'cloud' ? '☁️' : '💾';
            const fileTypeText = currentDownload.type === 'cloud' ? 'Cloud' : 'Local';
            
            statusDiv.innerHTML = `
                <div class="version-info">
                    📦 Versión ${this.downloadInfo.version} | 📅 ${this.downloadInfo.releaseDate}<br>
                    ${fileTypeIcon} Archivo ${fileTypeText} | 📏 ${currentDownload.size}
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
            const supportedSystems = Object.keys(this.downloadInfo?.downloads || {})
                .map(os => {
                    const osInfo = this.getOSDisplayInfo.call({userOS: os});
                    return `${osInfo.name} ${osInfo.icon}`;
                })
                .join(', ');
                
            statusDiv.innerHTML = `
                <div class="error-message">
                    ⚠️ Lo sentimos, tu sistema operativo no está soportado actualmente.<br>
                    <small>Sistemas soportados: ${supportedSystems}</small><br>
                    <small>¿Usas Linux? Ahora tenemos soporte experimental.</small>
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
            let isAvailable = false;
            
            if (currentDownload.type === 'cloud') {
                // Para archivos cloud, verificamos con un método más específico
                isAvailable = await this.checkCloudFileAvailability(currentDownload);
            } else {
                // Para archivos locales, verificamos con HEAD request
                const response = await fetch(currentDownload.url, { method: 'HEAD' });
                isAvailable = response.ok;
            }
            
            if (isAvailable) {
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
     * Verifica disponibilidad de archivos en la nube
     */
    async checkCloudFileAvailability(downloadInfo) {
        try {
            // Para Google Drive, GitHub releases, etc., usamos un método diferente
            if (downloadInfo.cloudUrl.includes('drive.google.com')) {
                // Para Google Drive, asumimos que está disponible si la URL es válida
                // En producción, podrías implementar una verificación más robusta
                return downloadInfo.cloudUrl.includes('uc?export=download');
            } else if (downloadInfo.cloudUrl.includes('github.com')) {
                // Para GitHub releases
                const response = await fetch(downloadInfo.cloudUrl, { method: 'HEAD' });
                return response.ok;
            } else {
                // Para otros servicios cloud
                const response = await fetch(downloadInfo.cloudUrl, { method: 'HEAD' });
                return response.ok;
            }
        } catch (error) {
            console.warn('No se pudo verificar archivo cloud:', error);
            return true; // Asumimos que está disponible si no podemos verificar
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
                const osInfo = this.getOSDisplayInfo();
                const fileTypeIcon = currentDownload.type === 'cloud' ? '☁️' : '💾';
                
                downloadBtn.innerHTML = `
                    <span class="download-icon">⏳</span>
                    Preparando descarga para ${osInfo.name}... ${fileTypeIcon}
                `;
            }
            
            // Mostrar estado de preparación
            if (statusDiv) {
                const fileTypeText = currentDownload.type === 'cloud' ? 'desde la nube' : 'local';
                statusDiv.innerHTML = `
                    <div class="preparing-message">
                        🔄 Preparando descarga ${fileTypeText} de ${currentDownload.filename}...<br>
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
            if (downloadInfo.type === 'cloud') {
                return await this.checkCloudFileAvailability(downloadInfo);
            } else {
                const response = await fetch(downloadInfo.url, { method: 'HEAD' });
                return response.ok && response.headers.get('content-length');
            }
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
            if (downloadInfo.type === 'cloud' && downloadInfo.cloudUrl.includes('drive.google.com')) {
                // Para Google Drive, abrimos en nueva ventana
                window.open(downloadInfo.cloudUrl, '_blank');
                return true;
            } else {
                // Para otros tipos de descarga, usar método tradicional
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
            }
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
            const osInfo = this.getOSDisplayInfo();
            const fileTypeIcon = downloadInfo.type === 'cloud' ? '☁️' : '💾';
            const fileTypeText = downloadInfo.type === 'cloud' ? 'cloud' : 'local';
            
            let installInstructions;
            switch (this.userOS) {
                case 'mac':
                    installInstructions = 'Abre el archivo .dmg y arrastra PixelPlay a Aplicaciones';
                    break;
                case 'windows':
                    installInstructions = 'Ejecuta el archivo .exe como administrador para instalar';
                    break;
                case 'linux':
                    installInstructions = 'Haz el archivo .AppImage ejecutable y ejecútalo';
                    break;
                default:
                    installInstructions = 'Sigue las instrucciones de instalación del sistema';
            }
                
            statusDiv.innerHTML = `
                <div class="success-message">
                    ✅ ¡Descarga iniciada correctamente! ${fileTypeIcon}<br>
                    <small>Descargando: ${downloadInfo.filename} (${downloadInfo.size}) - Archivo ${fileTypeText}</small><br>
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
                const osInfo = this.getOSDisplayInfo();
                const fileTypeIcon = currentDownload.type === 'cloud' ? '☁️' : '💾';
                
                downloadBtn.innerHTML = `
                    <span class="download-icon">⬇️</span>
                    Descargar para ${osInfo.name} ${osInfo.icon}
                    <span class="download-size">(${currentDownload.size}) ${fileTypeIcon}</span>
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
            fileType: downloadInfo.type,
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
            fileType: currentDownload?.type || 'unknown',
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
        line-height: 1.4;
    }
    
    .download-size {
        font-size: 0.85em;
        opacity: 0.8;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
`;
document.head.appendChild(style);
