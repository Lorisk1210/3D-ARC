class NotificationSystem {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
        
        this.modalOverlay = document.createElement('div');
        this.modalOverlay.className = 'confirm-modal-overlay';
        this.modalOverlay.style.display = 'none';
        
        this.modalContent = document.createElement('div');
        this.modalContent.className = 'confirm-modal';
        
        this.modalOverlay.appendChild(this.modalContent);
        document.body.appendChild(this.modalOverlay);
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const content = document.createElement('div');
        content.className = 'notification-content';
        content.textContent = message;
        
        const close = document.createElement('button');
        close.className = 'notification-close';
        close.innerHTML = '&times;';
        close.onclick = () => this.removeNotification(notification);
        
        notification.appendChild(content);
        notification.appendChild(close);
        this.container.appendChild(notification);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }
        
        // Trigger entry animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
    }

    removeNotification(notification) {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            if (notification.parentNode === this.container) {
                this.container.removeChild(notification);
            }
        }, { once: true });
    }

    showConfirm(message, title = 'Confirm Action') {
        return new Promise((resolve) => {
            this.modalContent.innerHTML = `
                <div class="confirm-modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="confirm-modal-body">
                    <p>${message}</p>
                </div>
                <div class="confirm-modal-footer">
                    <button class="confirm-btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="confirm-btn-ok" id="confirm-ok">Confirm</button>
                </div>
            `;
            
            this.modalOverlay.style.display = 'flex';
            
            const handleCancel = () => {
                this.modalOverlay.style.display = 'none';
                resolve(false);
            };
            
            const handleOk = () => {
                this.modalOverlay.style.display = 'none';
                resolve(true);
            };
            
            document.getElementById('confirm-cancel').onclick = handleCancel;
            document.getElementById('confirm-ok').onclick = handleOk;
            
            // Close on overlay click
            this.modalOverlay.onclick = (e) => {
                if (e.target === this.modalOverlay) handleCancel();
            };
        });
    }
}

const notifications = new NotificationSystem();

export function showAlert(message, title = 'Alert') {
    const lowerMessage = message.toLowerCase();
    let type = 'info'; 
    
    if (lowerMessage.includes('fail') || 
        lowerMessage.includes('error') ||
        lowerMessage.includes('invalid')) {
        type = 'error';
    } else if (lowerMessage.includes('saved successfully')) {
        type = 'info'; // Use blue for saved puzzle alerts
    } else if (lowerMessage.includes('success') || 
               lowerMessage.includes('imported successfully')) {
        type = 'success';
    }
    
    notifications.showNotification(message, type);
}

export function showConfirm(message, title = 'Confirm') {
    return notifications.showConfirm(message, title);
}

