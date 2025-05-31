/**
 * PixelPlay Website - Funcionalidades Principales
 * Maneja animaciones, efectos visuales, funcionalidades generales y sistema de countdown
 */

class PixelPlayWebsite {
    constructor() {
        this.isLoaded = false;
        this.animationFrameId = null;
        this.particles = [];
        this.scrollThreshold = 100;
        this.targetDate = new Date('2025-06-06T00:00:00').getTime();
        this.countdownInterval = null;
        this.isTimerPage = this.checkIfTimerPage();
        this.init();
    }

    /**
     * Verifica si estamos en la página del timer
     */
    checkIfTimerPage() {
        return document.body.innerHTML.includes('PixelPlay') && 
               document.body.innerHTML.includes('Próximamente') &&
               document.getElementById('countdown') !== null;
    }

    /**
     * Inicializa la página web
     */
    init() {
        // Verificar primero si necesitamos mostrar timer o página principal
        this.checkDateAndRedirect();
        
        this.setupEventListeners();
        this.initAnimations();
        this.createParticleSystem();
        this.initScrollEffects();
        this.checkWebGLSupport();
        this.initIntersectionObserver();
        
        // Inicializar countdown si estamos en página timer
        if (this.isTimerPage) {
            this.initCountdown();
        }
        
        // Marcar como cargado después de la inicialización
        setTimeout(() => {
            this.isLoaded = true;
            this.showWelcomeMessage();
        }, 1000);
    }

    /**
     * Verifica la fecha y redirige si es necesario
     */
    checkDateAndRedirect() {
        const now = new Date().getTime();
        const currentPage = window.location.pathname;
        
        if (now >= this.targetDate) {
            // Si ya pasó la fecha objetivo y estamos en timer.html, redirigir a index.html
            if (currentPage.includes('timer.html') || currentPage === '/timer.html') {
                window.location.href = 'index.html';
                return;
            }
        } else {
            // Si aún no es la fecha y estamos en index.html, redirigir a timer.html
            if (currentPage.includes('index.html') || currentPage === '/' || currentPage === '/index.html') {
                // Solo redirigir si no estamos ya en timer.html
                if (!currentPage.includes('timer.html')) {
                    window.location.href = 'timer.html';
                    return;
                }
            }
        }
    }

    /**
     * Inicializa el sistema de countdown
     */
    initCountdown() {
        if (!this.isTimerPage) return;

        const daysElement = document.getElementById('days');
        const hoursElement = document.getElementById('hours');
        const minutesElement = document.getElementById('minutes');
        const secondsElement = document.getElementById('seconds');
        const countdownContainer = document.getElementById('countdown');
        const accessGranted = document.getElementById('accessGranted');

        if (!daysElement || !hoursElement || !minutesElement || !secondsElement) {
            console.warn('Elementos del countdown no encontrados');
            return;
        }

        const updateCountdown = () => {
            const now = new Date().getTime();
            const timeLeft = this.targetDate - now;

            if (timeLeft > 0) {
                const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

                daysElement.textContent = days.toString().padStart(2, '0');
                hoursElement.textContent = hours.toString().padStart(2, '0');
                minutesElement.textContent = minutes.toString().padStart(2, '0');
                secondsElement.textContent = seconds.toString().padStart(2, '0');
            } else {
                // Tiempo agotado - mostrar acceso o redirigir
                if (countdownContainer && accessGranted) {
                    countdownContainer.parentElement.style.display = 'none';
                    accessGranted.style.display = 'block';
                }
                
                // Redirigir automáticamente después de 3 segundos
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
                
                // Limpiar intervalo
                if (this.countdownInterval) {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
            }
        };

        // Actualizar inmediatamente y luego cada segundo
        updateCountdown();
        this.countdownInterval = setInterval(updateCountdown, 1000);

        // Configurar botón de acceso si existe
        const accessBtn = document.querySelector('.access-btn');
        if (accessBtn) {
            accessBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'index.html';
            });
        }
    }

    /**
     * Configura todos los event listeners
     */
    setupEventListeners() {
        // Scroll effects
        window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 16));
        
        // Resize effects
        window.addEventListener('resize', this.throttle(this.handleResize.bind(this), 100));
        
        // Mouse effects para particles
        document.addEventListener('mousemove', this.throttle(this.handleMouseMove.bind(this), 16));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
        
        // Page visibility
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Smooth scrolling para links internos
        this.setupSmoothScrolling();

        // Verificar fecha periódicamente (cada minuto)
        setInterval(() => {
            this.checkDateAndRedirect();
        }, 60000);
    }

    /**
     * Inicializa las animaciones de entrada
     */
    initAnimations() {
        // Animar elementos cuando entren en viewport
        const animatedElements = document.querySelectorAll('.fade-in, .fade-in-delayed, .fade-in-delayed-2');
        
        animatedElements.forEach(element => {
            // Solo aplicar si no tienen animación CSS ya definida
            if (!element.style.animation) {
                element.style.opacity = '0';
                element.style.transform = 'translateY(40px)';
            }
        });
        
        // Disparar animaciones después de que cargue la página
        setTimeout(() => {
            animatedElements.forEach((element, index) => {
                setTimeout(() => {
                    if (!element.style.animation) {
                        element.style.transition = 'all 1.2s cubic-bezier(.39,.58,.57,1)';
                        element.style.opacity = '1';
                        element.style.transform = 'none';
                    }
                }, index * 100);
            });
        }, 200);
    }

    /**
     * Crea el sistema de partículas mejorado
     */
    createParticleSystem() {
        if (!this.supportsCanvas()) return;
        
        const canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '-1';
        canvas.style.opacity = '0.6';
        
        document.body.appendChild(canvas);
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.resizeCanvas();
        this.initParticles();
        this.startParticleAnimation();
    }

    /**
     * Verifica soporte para canvas
     */
    supportsCanvas() {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
    }

    /**
     * Redimensiona el canvas
     */
    resizeCanvas() {
        if (!this.canvas) return;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * Inicializa las partículas
     */
    initParticles() {
        this.particles = [];
        const particleCount = Math.min(50, Math.floor(window.innerWidth / 30));
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2,
                color: `hsl(${120 + Math.random() * 40}, 70%, 60%)`
            });
        }
    }

    /**
     * Inicia la animación de partículas
     */
    startParticleAnimation() {
        if (!this.ctx) return;
        
        const animate = () => {
            if (!this.isLoaded) {
                this.animationFrameId = requestAnimationFrame(animate);
                return;
            }
            
            this.updateParticles();
            this.drawParticles();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        animate();
    }

    /**
     * Actualiza las partículas
     */
    updateParticles() {
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Wrap around screen
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
        });
    }

    /**
     * Dibuja las partículas
     */
    drawParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fill();
        });
        
        this.ctx.globalAlpha = 1;
    }

    /**
     * Inicializa efectos de scroll
     */
    initScrollEffects() {
        // Parallax effect para elementos de fondo
        this.parallaxElements = document.querySelectorAll('.floating-cube');
    }

    /**
     * Inicializa Intersection Observer para animaciones lazy
     */
    initIntersectionObserver() {
        if (!window.IntersectionObserver) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    this.triggerElementAnimation(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        // Observar elementos que necesitan animación
        const observeElements = document.querySelectorAll('.feature-card, .news-item, .info-card, .countdown-item');
        observeElements.forEach(el => observer.observe(el));
    }

    /**
     * Maneja el scroll de la página
     */
    handleScroll() {
        const scrollY = window.pageYOffset;
        
        // Parallax effect
        this.parallaxElements.forEach((element, index) => {
            const speed = 0.5 + (index * 0.1);
            const yPos = -(scrollY * speed);
            element.style.transform = `translateY(${yPos}px) rotate(${scrollY * 0.1}deg)`;
        });

        // Header background blur al hacer scroll
        const header = document.querySelector('.hero, .countdown-container');
        if (header && scrollY > 50) {
            const opacity = Math.min(scrollY / 300, 0.9);
            header.style.background = `rgba(12, 12, 12, ${opacity})`;
        }
    }

    /**
     * Maneja el redimensionamiento de ventana
     */
    handleResize() {
        this.resizeCanvas();
        this.initParticles();
    }

    /**
     * Maneja movimientos del mouse para efectos interactivos
     */
    handleMouseMove(event) {
        if (!this.particles.length) return;
        
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        // Efecto de atracción sutil hacia el mouse
        this.particles.forEach(particle => {
            const dx = mouseX - particle.x;
            const dy = mouseY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
                const force = (100 - distance) / 10000;
                particle.vx += dx * force;
                particle.vy += dy * force;
            }
        });
    }

    /**
     * Maneja atajos de teclado
     */
    handleKeyboard(event) {
        // Tecla D para descargar rápido (solo en página principal)
        if (event.key.toLowerCase() === 'd' && event.ctrlKey && !this.isTimerPage) {
            event.preventDefault();
            const downloadBtn = document.getElementById('downloadBtn');
            if (downloadBtn && !downloadBtn.disabled) {
                downloadBtn.click();
            }
        }
        
        // Tecla Escape para cerrar mensajes
        if (event.key === 'Escape') {
            this.clearStatusMessages();
        }

        // Tecla Space para ver countdown detallado (solo en timer)
        if (event.key === ' ' && this.isTimerPage) {
            event.preventDefault();
            this.showDetailedCountdown();
        }
    }

    /**
     * Muestra countdown detallado
     */
    showDetailedCountdown() {
        const now = new Date().getTime();
        const timeLeft = this.targetDate - now;
        
        if (timeLeft > 0) {
            const totalSeconds = Math.floor(timeLeft / 1000);
            const totalMinutes = Math.floor(timeLeft / (1000 * 60));
            const totalHours = Math.floor(timeLeft / (1000 * 60 * 60));
            
            this.showToast(
                `Faltan: ${totalHours} horas, ${totalMinutes % 60} minutos, ${totalSeconds % 60} segundos`, 
                'info'
            );
        }
    }

    /**
     * Maneja cambios de visibilidad de la página
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Pausar animaciones cuando la página no es visible
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
        } else {
            // Reanudar animaciones y verificar fecha
            if (this.isLoaded) {
                this.startParticleAnimation();
                this.checkDateAndRedirect();
            }
        }
    }

    /**
     * Configura smooth scrolling para links internos
     */
    setupSmoothScrolling() {
        const links = document.querySelectorAll('a[href^="#"]');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    /**
     * Verifica soporte WebGL
     */
    checkWebGLSupport() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            console.warn('WebGL no soportado, usando canvas 2D');
        } else {
            console.log('WebGL disponible para efectos avanzados');
        }
    }

    /**
     * Dispara animación específica para un elemento
     */
    triggerElementAnimation(element) {
        if (!element.style.animation) {
            element.style.animation = 'fadeInUp 0.8s ease-out forwards';
        }
    }

    /**
     * Muestra mensaje de bienvenida
     */
    showWelcomeMessage() {
        const pageType = this.isTimerPage ? 'Timer' : 'Principal';
        console.log(`🎮 PixelPlay Website (${pageType}) cargado completamente`);
        console.log('🚀 Sistema de partículas activo');
        console.log('✨ Animaciones inicializadas');
        
        if (this.isTimerPage) {
            console.log('⏰ Countdown iniciado');
            console.log(`🎯 Fecha objetivo: ${new Date(this.targetDate).toLocaleString()}`);
        }
        
        // Opcional: mostrar toast de bienvenida
        const message = this.isTimerPage ? '¡Pronto llegará PixelPlay!' : '¡Bienvenido a PixelPlay!';
        this.showToast(message, 'success');
    }

    /**
     * Muestra toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Estilos inline para el toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 24px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease',
            background: type === 'success' ? '#2ecc40' : type === 'error' ? '#e74c3c' : '#3498db'
        });
        
        document.body.appendChild(toast);
        
        // Animar entrada
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Animar salida y remover
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Limpia mensajes de estado
     */
    clearStatusMessages() {
        const statusDiv = document.getElementById('downloadStatus');
        if (statusDiv) {
            statusDiv.innerHTML = '';
        }
        
        // Remover toasts
        const toasts = document.querySelectorAll('.toast');
        toasts.forEach(toast => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }

    /**
     * Throttle function para optimizar performance
     */
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    /**
     * Cleanup cuando se cierra la página
     */
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

// Estilos adicionales para animaciones
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .animate-in {
        animation: fadeInUp 0.8s ease-out forwards;
    }
    
    .toast {
        font-family: 'IBM Plex Sans', sans-serif;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    /* Mejoras para countdown items */
    .countdown-item {
        transition: all 0.3s ease;
    }
    
    .countdown-item:hover {
        transform: translateY(-5px) scale(1.05);
    }
    
    /* Animación para números del countdown */
    .countdown-number {
        transition: all 0.3s ease;
    }
    
    .countdown-number.updated {
        animation: numberUpdate 0.5s ease-out;
    }
    
    @keyframes numberUpdate {
        0% { transform: scale(1.2); }
        50% { transform: scale(1.3); color: #27ae60; }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(additionalStyles);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Crear instancia global del website
    window.pixelPlayWebsite = new PixelPlayWebsite();
    
    // Cleanup al cerrar la página
    window.addEventListener('beforeunload', function() {
        if (window.pixelPlayWebsite) {
            window.pixelPlayWebsite.destroy();
        }
    });
});

// Verificación adicional para redirección automática
window.addEventListener('load', function() {
    // Verificar cada 30 segundos si estamos en la página correcta
    setInterval(() => {
        if (window.pixelPlayWebsite) {
            window.pixelPlayWebsite.checkDateAndRedirect();
        }
    }, 30000);
});

// Exportar para uso en módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PixelPlayWebsite;
}
