/**
 * Helper utilities
 * Small utility functions used across the app
 */

import { CONFIG } from '../config.js';

/**
 * Get ISO week number for a given date
 * @param {Date} date - The date to get week number for
 * @param {boolean} mondayStart - Whether week starts on Monday (true) or Sunday (false)
 * @returns {number} ISO week number
 */
export function getWeekNumber(date, mondayStart = true) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = mondayStart ? (d.getUTCDay() || 7) : d.getUTCDay();

    // Set to nearest Thursday (current date + 4 - current day number)
    // For Monday start: Monday=1, Sunday=7
    // For Sunday start: Sunday=0, Saturday=6
    const thursdayOffset = mondayStart ? 4 - dayNum : 4 - (dayNum || 7) + 1;
    d.setUTCDate(d.getUTCDate() + thursdayOffset);

    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

    return weekNo;
}


/**
 * Format date to readable string
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format date to time string
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}
