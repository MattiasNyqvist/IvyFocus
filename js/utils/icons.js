/**
 * SVG Icon Library
 * Centralized icon definitions for consistency and easy updates
 */

export const icons = {
    /**
     * Star icon - Used for focus priority toggle
     * @param {boolean} filled - Whether the star should be filled
     * @param {string} size - Size in pixels (default: "24px")
     * @returns {string} SVG HTML string
     */
    star: (filled = false, size = "24px") => {
        const pathAttrs = filled
            ? 'fill="currentColor" stroke="currentColor"'
            : 'stroke="currentColor"';

        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5">
            <path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" ${pathAttrs} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`;
    },

    /**
     * Edit/Pen icon - Used for editing tasks
     * @param {string} size - Size in pixels (default: "20px")
     * @returns {string} SVG HTML string
     */
    edit: (size = "20px") => {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.3632 5.65156L15.8431 4.17157C16.6242 3.39052 17.8905 3.39052 18.6716 4.17157L20.0858 5.58579C20.8668 6.36683 20.8668 7.63316 20.0858 8.41421L18.6058 9.8942M14.3632 5.65156L4.74749 15.2672C4.41542 15.5993 4.21079 16.0376 4.16947 16.5054L3.92738 19.2459C3.87261 19.8659 4.39148 20.3848 5.0115 20.33L7.75191 20.0879C8.21972 20.0466 8.65806 19.8419 8.99013 19.5099L18.6058 9.8942M14.3632 5.65156L18.6058 9.8942" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`;
    },

    /**
     * Delete/Close icon - Used for deleting tasks
     * @param {string} size - Size in pixels (default: "20px")
     * @returns {string} SVG HTML string
     */
    delete: (size = "20px") => {
        return `<svg width="${size}" height="${size}" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.17218 14.8284L12.0006 12M14.829 9.17157L12.0006 12M12.0006 12L9.17218 9.17157M12.0006 12L14.829 14.8284" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`;
    },

    /**
     * Arrow Left icon - Used for moving tasks back
     * @param {string} size - Size in pixels (default: "24px")
     * @returns {string} SVG HTML string
     */
    arrowLeft: (size = "24px") => {
        return `<svg width="${size}" height="${size}" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.5 12H6M6 12L12 6M6 12L12 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`;
    },

    /**
     * Star icon for inline use (smaller, with inline styles)
     * Used in empty state messages
     * @returns {string} SVG HTML string
     */
    starInline: () => {
        return `<svg width="16px" height="16px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
            <path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`;
    }
};
