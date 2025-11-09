/**
 * Toast Notifications
 * Simple toast notification system with optional undo functionality
 */

/**
 * Show a simple toast message
 * @param {string} message - The message to display
 * @param {number} duration - Duration in milliseconds (default: 2000)
 */
export function showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 12px 24px;
        border-radius: 24px;
        z-index: 1000;
        animation: fadeInOut ${duration / 1000}s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            document.body.removeChild(toast);
        }
    }, duration);
}

/**
 * Show a toast message with an undo button
 * @param {string} message - The message to display
 * @param {Function} undoCallback - Callback function when undo is clicked
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
export function showToastWithUndo(message, undoCallback, duration = 4000) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 12px 16px;
        border-radius: 24px;
        z-index: 1000;
        animation: fadeInOut ${duration / 1000}s ease;
        display: flex;
        align-items: center;
        gap: 16px;
    `;

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;

    const undoBtn = document.createElement('button');
    undoBtn.textContent = 'UNDO';
    undoBtn.style.cssText = `
        background: transparent;
        border: none;
        color: #4A90E2;
        font-weight: 700;
        cursor: pointer;
        padding: 4px 8px;
        font-size: 14px;
    `;

    undoBtn.addEventListener('click', () => {
        undoCallback();
        if (toast.parentNode) {
            document.body.removeChild(toast);
        }
    });

    toast.appendChild(messageSpan);
    toast.appendChild(undoBtn);
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            document.body.removeChild(toast);
        }
    }, duration);
}
