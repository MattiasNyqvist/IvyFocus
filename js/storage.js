/**
 * Focus Task Planner - Storage Layer
 * Handles localStorage operations
 * Ready to be extended with API calls in Version 2
 */

import { CONFIG } from './config.js';

/**
 * Task structure:
 * {
 *   id: timestamp,
 *   text: string,
 *   starred: boolean,
 *   status: 'active' | 'done',
 *   order: number,
 *   createdAt: ISO date string,
 *   completedAt: ISO date string | null
 * }
 */

// ============================================
// TASKS - Main operations
// ============================================

/**
 * Load all tasks from localStorage
 * @returns {Array} Array of task objects
 */
export function loadTasks() {
    try {
        const data = localStorage.getItem(CONFIG.storageKey);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading tasks:', error);
        return [];
    }
}

/**
 * Save all tasks to localStorage
 * @param {Array} tasks - Array of task objects
 */
export function saveTasks(tasks) {
    try {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error('Error saving tasks:', error);
        return false;
    }
}

/**
 * Add a new task
 * @param {string} text - Task text
 * @returns {Object} New task object
 */
export function addTask(text) {
    const tasks = loadTasks();
    
    const newTask = {
        id: Date.now(),
        text: text.trim(),
        starred: false,
        status: 'active',
        order: tasks.length,
        createdAt: new Date().toISOString(),
        completedAt: null
    };
    
    tasks.push(newTask);
    saveTasks(tasks);
    
    return newTask;
}

/**
 * Update an existing task
 * @param {number} id - Task ID
 * @param {Object} updates - Properties to update
 */
export function updateTask(id, updates) {
    const tasks = loadTasks();
    const index = tasks.findIndex(t => t.id === id);
    
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...updates };
        saveTasks(tasks);
        return tasks[index];
    }
    
    return null;
}

/**
 * Delete a task
 * @param {number} id - Task ID
 */
export function deleteTask(id) {
    const tasks = loadTasks();
    const filtered = tasks.filter(t => t.id !== id);
    saveTasks(filtered);
    return true;
}

/**
 * Toggle task completion status
 * @param {number} id - Task ID
 */
export function toggleTaskStatus(id) {
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === id);
    
    if (task) {
        task.status = task.status === 'done' ? 'active' : 'done';
        task.completedAt = task.status === 'done' ? new Date().toISOString() : null;
        saveTasks(tasks);
        return task;
    }
    
    return null;
}

/**
 * Toggle task starred status
 * @param {number} id - Task ID
 */
export function toggleTaskStar(id) {
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === id);
    
    if (task) {
        task.starred = !task.starred;
        saveTasks(tasks);
        return task;
    }
    
    return null;
}

/**
 * Get starred tasks count
 * @returns {number} Number of starred tasks
 */
export function getStarredCount() {
    const tasks = loadTasks();
    return tasks.filter(t => t.starred && t.status === 'active').length;
}

/**
 * Check if can add more starred tasks
 * @returns {boolean}
 */
export function canAddStarredTask() {
    return getStarredCount() < CONFIG.maxFocusTasks;
}

// ============================================
// ARCHIVE - Operations
// ============================================

/**
 * Load archived tasks
 * @returns {Array} Array of archived task objects
 */
export function loadArchive() {
    try {
        const data = localStorage.getItem(CONFIG.archiveKey);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading archive:', error);
        return [];
    }
}

/**
 * Save archived tasks
 * @param {Array} archive - Array of archived tasks
 */
export function saveArchive(archive) {
    try {
        localStorage.setItem(CONFIG.archiveKey, JSON.stringify(archive));
        return true;
    } catch (error) {
        console.error('Error saving archive:', error);
        return false;
    }
}

/**
 * Archive completed tasks (move to archive)
 * @returns {number} Number of tasks archived
 */
export function archiveCompletedTasks() {
    const tasks = loadTasks();
    const archive = loadArchive();
    
    // Find completed tasks
    const completed = tasks.filter(t => t.status === 'done');
    
    // Add to archive with archive date
    completed.forEach(task => {
        archive.push({
            ...task,
            archivedAt: new Date().toISOString()
        });
    });
    
    // Remove completed from tasks
    const remaining = tasks.filter(t => t.status !== 'done');
    
    saveTasks(remaining);
    saveArchive(archive);
    
    return completed.length;
}

/**
 * Update archived task
 * @param {number} id - Task ID
 * @param {Object} updates - Properties to update
 * @returns {Object|null} Updated task or null if not found
 */
export function updateArchiveTask(id, updates) {
    const archive = loadArchive();
    const index = archive.findIndex(t => t.id === id);

    if (index !== -1) {
        archive[index] = { ...archive[index], ...updates };
        saveArchive(archive);
        return archive[index];
    }

    return null;
}

/**
 * Delete archived task
 * @param {number} id - Task ID
 */
export function deleteArchivedTask(id) {
    const archive = loadArchive();
    const filtered = archive.filter(t => t.id !== id);
    saveArchive(filtered);
    return true;
}

/**
 * Clear all archive
 */
export function clearArchive() {
    saveArchive([]);
    return true;
}

// ============================================
// BACKLOG - Operations
// ============================================

/**
 * Load backlog tasks
 * @returns {Array} Array of backlog task objects
 */
export function loadBacklog() {
    try {
        const data = localStorage.getItem(CONFIG.backlogKey);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading backlog:', error);
        return [];
    }
}

/**
 * Save backlog tasks
 * @param {Array} backlog - Array of backlog tasks
 */
export function saveBacklog(backlog) {
    try {
        localStorage.setItem(CONFIG.backlogKey, JSON.stringify(backlog));
        return true;
    } catch (error) {
        console.error('Error saving backlog:', error);
        return false;
    }
}

/**
 * Move task to backlog
 * @param {number} id - Task ID
 */
export function moveToBacklog(id) {
    const tasks = loadTasks();
    const backlog = loadBacklog();
    
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return false;
    
    const task = tasks[taskIndex];
    backlog.push({
        ...task,
        movedToBacklogAt: new Date().toISOString()
    });
    
    tasks.splice(taskIndex, 1);
    
    saveTasks(tasks);
    saveBacklog(backlog);
    return true;
}

/**
 * Move task from backlog to today
 * @param {number} id - Task ID
 */
export function moveFromBacklogToToday(id) {
    const backlog = loadBacklog();
    const tasks = loadTasks();
    
    const backlogIndex = backlog.findIndex(t => t.id === id);
    if (backlogIndex === -1) return false;
    
    const task = backlog[backlogIndex];
    delete task.movedToBacklogAt;
    task.starred = false; // Unstarred when moved back
    task.status = 'active';
    
    tasks.push(task);
    backlog.splice(backlogIndex, 1);
    
    saveTasks(tasks);
    saveBacklog(backlog);
    return true;
}

/**
 * Move task from archive back to today
 * @param {number} id - Task ID
 */
export function moveFromArchiveToToday(id) {
    const archive = loadArchive();
    const tasks = loadTasks();

    const archiveIndex = archive.findIndex(t => t.id === id);
    if (archiveIndex === -1) return false;

    const task = archive[archiveIndex];
    delete task.archivedAt;
    task.starred = false; // Unstarred when moved back
    task.status = 'active';

    tasks.push(task);
    archive.splice(archiveIndex, 1);

    saveTasks(tasks);
    saveArchive(archive);
    return true;
}

/**
 * Update backlog task
 * @param {number} id - Task ID
 * @param {Object} updates - Properties to update
 * @returns {Object|null} Updated task or null if not found
 */
export function updateBacklogTask(id, updates) {
    const backlog = loadBacklog();
    const index = backlog.findIndex(t => t.id === id);

    if (index !== -1) {
        backlog[index] = { ...backlog[index], ...updates };
        saveBacklog(backlog);
        return backlog[index];
    }

    return null;
}

/**
 * Delete backlog task
 * @param {number} id - Task ID
 */
export function deleteBacklogTask(id) {
    const backlog = loadBacklog();
    const filtered = backlog.filter(t => t.id !== id);
    saveBacklog(filtered);
    return true;
}

/**
 * Clear all backlog
 */
export function clearBacklog() {
    saveBacklog([]);
    return true;
}

// ============================================
// STATS - Streak and completion tracking
// ============================================

/**
 * Update completion streak
 * Called when a task is completed
 */
export function updateStreak() {
    const today = new Date().toDateString();
    const streakData = getStreakData();
    
    // If we haven't completed anything today, mark today
    if (streakData.lastCompletionDate !== today) {
        streakData.lastCompletionDate = today;
        
        // Check if streak continues (yesterday)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        
        if (streakData.lastStreakDate === yesterdayStr || streakData.currentStreak === 0) {
            // Streak continues
            streakData.currentStreak++;
            streakData.lastStreakDate = today;
        } else if (streakData.lastStreakDate !== today) {
            // Streak broken, restart
            streakData.currentStreak = 1;
            streakData.lastStreakDate = today;
        }
        
        streakData.totalCompleted++;
        saveStreakData(streakData);
    }
}

/**
 * Get streak data
 */
export function getStreakData() {
    try {
        const data = localStorage.getItem('streakData');
        return data ? JSON.parse(data) : {
            currentStreak: 0,
            lastStreakDate: null,
            lastCompletionDate: null,
            totalCompleted: 0
        };
    } catch (error) {
        console.error('Error loading streak data:', error);
        return {
            currentStreak: 0,
            lastStreakDate: null,
            lastCompletionDate: null,
            totalCompleted: 0
        };
    }
}

/**
 * Save streak data
 */
export function saveStreakData(data) {
    try {
        localStorage.setItem('streakData', JSON.stringify(data));
    } catch (error) {
        console.error('Error saving streak data:', error);
    }
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Delete all non-starred tasks
 * @returns {number} Number of tasks deleted
 */
export function deleteNonStarredTasks() {
    const tasks = loadTasks();
    const starred = tasks.filter(t => t.starred);
    const deletedCount = tasks.length - starred.length;
    
    saveTasks(starred);
    return deletedCount;
}

/**
 * Clear all starred flags (for "New Day" feature)
 * @returns {number} Number of tasks unstarred
 */
export function clearAllStars() {
    const tasks = loadTasks();
    let count = 0;
    
    tasks.forEach(task => {
        if (task.starred) {
            task.starred = false;
            count++;
        }
    });
    
    saveTasks(tasks);
    return count;
}

/**
 * Clear all tasks (use with caution!)
 */
export function clearAllTasks() {
    saveTasks([]);
    return true;
}

// ============================================
// EXPORT / IMPORT
// ============================================

/**
 * Export all data as JSON
 * @returns {Object} All app data
 */
export function exportData() {
    return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        tasks: loadTasks(),
        archive: loadArchive(),
        settings: {
            maxFocusTasks: CONFIG.maxFocusTasks,
            showCompletedTasks: CONFIG.showCompletedTasks,
            autoArchive: CONFIG.autoArchive
        }
    };
}

/**
 * Import data from JSON
 * @param {Object} data - Exported data object
 */
export function importData(data) {
    try {
        if (data.tasks) saveTasks(data.tasks);
        if (data.archive) saveArchive(data.archive);
        // Settings import would go here
        return true;
    } catch (error) {
        console.error('Error importing data:', error);
        return false;
    }
}

// ============================================
// FUTURE: API Integration (Version 2)
// ============================================

