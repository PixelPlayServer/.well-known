/**
 * PixelPlay Website - Funcionalidades Principales
 * Maneja animaciones, efectos visuales y funcionalidades generales
 */

class PixelPlayWebsite {
    constructor() {
        this.isLoaded = false;
        this.animationFrameId = null;
        this.particles = [];
        this.scrollThreshold = 100;
        this.init();
    }

    /**
     * Inicializa la página web
     */
    init() {
        this.setupEventListeners();
        this.initAnimations();
        this.createParticleSystem();
        this.initScrollEffects();
        this.checkWebGLSupport();
        this.initIntersectionObserver();
        
        // Marcar como cargado después de la inicialización
        setTimeout(() => {
            this.isLoaded = true;
            this.showWelcomeMessage();
        }, 1000);
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
    }

    /**
     * Inicializa las animaciones de entrada
     */
    initAnimations() {
        // Animar elementos cuando entren en viewport
        const animatedElements = document.querySelectorAll('.fade-in, .fade-in-delayed, .fade-in-delayed-2');
        
        animatedElements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(40px)';
        });
        
        // Disparar animaciones después de que cargue la página
        setTimeout(() => {
            animatedElements.forEach((element, index) => {
                setTimeout(() => {
                    element.style.transition = 'all 1.2s cubic-bezier(.39,.58,.57,1)';
                    element.style.opacity = '1';
                    element.style.transform = 'none';
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
        const observeElements = document.querySelectorAll('.feature-card, .news-item, .info-card');
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
        const header = document.querySelector('.hero');
        if (header) {
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
        // Tecla D para descargar rápido
        if (event.key.toLowerCase() === 'd' && event.ctrlKey) {
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
            // Reanudar animaciones
            if (this.isLoaded) {
                this.startParticleAnimation();
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
        element.style.animation = 'fadeInUp 0.8s ease-out forwards';
    }

    /**
     * Muestra mensaje de bienvenida
     */
    showWelcomeMessage() {
        console.log('🎮 PixelPlay Website cargado completamente');
        console.log('🚀 Sistema de partículas activo');
        console.log('✨ Animaciones inicializadas');
        
        // Opcional: mostrar toast de bienvenida
        this.showToast('¡Bienvenido a PixelPlay!', 'success');
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

// Exportar para uso en módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PixelPlayWebsite;
}