// PWA Manager for MarkMirror Mobile
// Handles service worker registration, installation prompts, and PWA features

export class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.isStandalone = false;
        this.serviceWorker = null;
        
        this.init();
    }

    // Initialize PWA functionality
    async init() {
        this.checkInstallationStatus();
        this.setupInstallPrompt();
        await this.registerServiceWorker();
        this.setupUpdateNotifications();
        this.handleAppShortcuts();
    }

    // Check if app is installed or running in standalone mode
    checkInstallationStatus() {
        // Check if running in standalone mode
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone === true;
        
        // Check if installed (various methods)
        this.isInstalled = this.isStandalone ||
                          document.referrer.includes('android-app://') ||
                          window.matchMedia('(display-mode: minimal-ui)').matches;
        
        console.log('📱 PWA Status:', {
            isInstalled: this.isInstalled,
            isStandalone: this.isStandalone,
            displayMode: this.getDisplayMode()
        });
        
        // Update UI based on installation status
        this.updateInstallUI();
    }

    // Get current display mode
    getDisplayMode() {
        if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
        if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
        if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
        return 'browser';
    }

    // Setup installation prompt handling
    setupInstallPrompt() {
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('📲 PWA: Install prompt available');
            
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            
            // Save the event for later use
            this.deferredPrompt = e;
            
            // Show custom install button
            this.showInstallButton();
        });

        // Listen for app installed event
        window.addEventListener('appinstalled', (e) => {
            console.log('✅ PWA: App installed successfully');
            this.isInstalled = true;
            this.hideInstallButton();
            this.showInstallSuccessMessage();
            
            // Track installation
            if (window.app && window.app.analytics) {
                window.app.analytics.trackEvent('pwa_installed');
            }
        });
    }

    // Register service worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                console.log('🔧 PWA: Registering service worker...');
                
                const registration = await navigator.serviceWorker.register('./sw.js', {
                    scope: './'
                });
                
                this.serviceWorker = registration;
                
                console.log('✅ PWA: Service worker registered:', registration.scope);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 PWA: Service worker update found');
                    this.handleServiceWorkerUpdate(registration);
                });
                
                return registration;
            } catch (error) {
                console.error('❌ PWA: Service worker registration failed:', error);
            }
        } else {
            console.warn('⚠️ PWA: Service workers not supported');
        }
    }

    // Handle service worker updates
    handleServiceWorkerUpdate(registration) {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                this.showUpdateNotification();
            }
        });
    }

    // Setup update notifications
    setupUpdateNotifications() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('🔄 PWA: Service worker controller changed');
                // Reload the page to get the latest version
                window.location.reload();
            });
        }
    }

    // Handle app shortcuts from manifest
    handleAppShortcuts() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        if (action) {
            console.log('🚀 PWA: Handling shortcut action:', action);
            
            // Wait for app to be ready
            setTimeout(() => {
                this.executeShortcutAction(action);
            }, 1000);
        }
    }

    // Execute shortcut actions
    executeShortcutAction(action) {
        const app = window.app;
        if (!app) return;
        
        switch (action) {
            case 'new':
                app.clearEditor();
                break;
            case 'import':
                document.getElementById('import-file')?.click();
                break;
            case 'analytics':
                app.analyticsPanel?.show();
                break;
            default:
                console.warn('Unknown shortcut action:', action);
        }
        
        // Track shortcut usage
        if (app.analytics) {
            app.analytics.trackEvent('pwa_shortcut_used', { action });
        }
    }

    // Show install button
    showInstallButton() {
        let installBtn = document.getElementById('pwa-install-btn');
        
        if (!installBtn) {
            installBtn = document.createElement('button');
            installBtn.id = 'pwa-install-btn';
            installBtn.className = 'btn btn-secondary pwa-install-btn';
            installBtn.innerHTML = '📱 Установить приложение';
            installBtn.title = 'Установить MarkMirror как приложение';
            
            // Add to header controls
            const headerRight = document.querySelector('.header-right .controls');
            if (headerRight) {
                headerRight.insertBefore(installBtn, headerRight.firstChild);
            }
        }
        
        installBtn.style.display = 'inline-flex';
        installBtn.onclick = () => this.promptInstall();
    }

    // Hide install button
    hideInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }

    // Prompt user to install app
    async promptInstall() {
        if (!this.deferredPrompt) {
            console.warn('⚠️ PWA: No install prompt available');
            return;
        }
        
        try {
            // Show the install prompt
            this.deferredPrompt.prompt();
            
            // Wait for user response
            const { outcome } = await this.deferredPrompt.userChoice;
            
            console.log('📲 PWA: Install prompt result:', outcome);
            
            // Track user choice
            if (window.app && window.app.analytics) {
                window.app.analytics.trackEvent('pwa_install_prompt', { outcome });
            }
            
            // Clear the deferred prompt
            this.deferredPrompt = null;
            
            if (outcome === 'accepted') {
                this.hideInstallButton();
            }
        } catch (error) {
            console.error('❌ PWA: Install prompt failed:', error);
        }
    }

    // Show install success message
    showInstallSuccessMessage() {
        if (window.app && window.app.showMessage) {
            window.app.showMessage('🎉 MarkMirror успешно установлен!', 'success');
        }
    }

    // Show update notification
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'pwa-update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <span>🔄 Доступно обновление MarkMirror</span>
                <button id="update-app-btn" class="btn btn-small">Обновить</button>
                <button id="dismiss-update-btn" class="btn btn-small btn-secondary">Позже</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Handle update button
        document.getElementById('update-app-btn').onclick = () => {
            this.applyUpdate();
            notification.remove();
        };
        
        // Handle dismiss button
        document.getElementById('dismiss-update-btn').onclick = () => {
            notification.remove();
        };
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    // Apply service worker update
    applyUpdate() {
        if (this.serviceWorker && this.serviceWorker.waiting) {
            // Tell the waiting service worker to skip waiting
            this.serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    }

    // Update install UI based on current status
    updateInstallUI() {
        if (this.isInstalled) {
            this.hideInstallButton();
            
            // Add installed indicator to title
            const title = document.querySelector('.app-title');
            if (title && !title.querySelector('.pwa-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'pwa-indicator';
                indicator.innerHTML = '📱';
                indicator.title = 'Установленное приложение';
                title.appendChild(indicator);
            }
        }
    }

    // Check if app can be installed
    canInstall() {
        return !!this.deferredPrompt;
    }

    // Get installation status
    getStatus() {
        return {
            isInstalled: this.isInstalled,
            isStandalone: this.isStandalone,
            canInstall: this.canInstall(),
            displayMode: this.getDisplayMode(),
            serviceWorkerRegistered: !!this.serviceWorker
        };
    }

    // Request persistent storage
    async requestPersistentStorage() {
        if ('storage' in navigator && 'persist' in navigator.storage) {
            try {
                const persistent = await navigator.storage.persist();
                console.log('💾 PWA: Persistent storage:', persistent);
                return persistent;
            } catch (error) {
                console.error('❌ PWA: Failed to request persistent storage:', error);
                return false;
            }
        }
        return false;
    }

    // Get storage usage
    async getStorageUsage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage,
                    available: estimate.quota,
                    percentage: estimate.quota ? (estimate.usage / estimate.quota) * 100 : 0
                };
            } catch (error) {
                console.error('❌ PWA: Failed to get storage estimate:', error);
                return null;
            }
        }
        return null;
    }
}
