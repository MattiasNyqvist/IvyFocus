/**
 * Daily Focus - Swipe-based Task Manager
 */

import { CONFIG, saveSettings } from './config.js';
import * as storage from './storage.js';

// State
let currentView = 'focus';
let swipeState = {
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    element: null,
    isSwiping: false,
    direction: null
};
let undoStack = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    attachEventListeners();
    renderAll();
});

function initializeApp() {
    // Load settings
    document.getElementById('maxFocusTasks').value = CONFIG.maxFocusTasks;
    document.getElementById('autoResetFocus').checked = CONFIG.autoResetFocus;
    document.getElementById('showSwipeHints').checked = CONFIG.showSwipeHints;

    // Load week start setting
    const weekStartValue = CONFIG.weekStartsOnMonday ? 'monday' : 'sunday';
    document.getElementById('weekStart' + weekStartValue.charAt(0).toUpperCase() + weekStartValue.slice(1)).checked = true;

    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.getElementById('theme' + savedTheme.charAt(0).toUpperCase() + savedTheme.slice(1)).checked = true;
    applyTheme(savedTheme);

    // Update today's date
    updateTodayDate();

    // Update stats
    updateStats();

    // Check auto-reset
    checkAutoResetFocus();

    // Apply swipe hints setting
    applySwipeHints();
}

function updateTodayDate() {
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[today.getDay()];
    const date = today.getDate();
    const monthName = months[today.getMonth()];
    const weekNumber = getWeekNumber(today, CONFIG.weekStartsOnMonday);

    const dateElement = document.getElementById('todayDate');
    if (dateElement) {
        dateElement.textContent = `${dayName} ${date} ${monthName} (v.${weekNumber})`;
    }
}

// Get ISO week number
function getWeekNumber(date, mondayStart = true) {
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

function attachEventListeners() {
    // Bottom navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });

    // Add task
    document.getElementById('addTaskBtn').addEventListener('click', handleAddTask);
    document.getElementById('taskInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddTask();
    });

    // Info icons
    document.querySelectorAll('.info-icon').forEach(icon => {
        icon.addEventListener('click', handleInfoToggle);
    });

    // Settings
    document.getElementById('maxFocusTasks').addEventListener('change', handleSettingsChange);
    document.getElementById('autoResetFocus').addEventListener('change', handleSettingsChange);
    document.getElementById('showSwipeHints').addEventListener('change', handleSwipeHintsChange);
    document.querySelectorAll('input[name="weekStart"]').forEach(radio => {
        radio.addEventListener('change', handleWeekStartChange);
    });
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
        radio.addEventListener('change', handleThemeChange);
    });
    document.getElementById('exportDataBtn').addEventListener('click', handleExportData);
}

// ============================================
// VIEW SWITCHING
// ============================================

function switchView(view) {
    const previousView = currentView;
    currentView = view;

    // Get view elements
    const oldViewEl = document.getElementById(`${previousView}View`);
    const newViewEl = document.getElementById(`${view}View`);

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Animate transition
    if (oldViewEl && newViewEl && oldViewEl !== newViewEl) {
        // Immediately hide old view (no transition on hide)
        oldViewEl.classList.remove('active');

        // Show new view with transition
        newViewEl.classList.add('active');
    } else {
        // Fallback: instant switch
        document.querySelectorAll('.view').forEach(v => {
            v.classList.toggle('active', v.id === `${view}View`);
        });
    }

    // Render content
    if (view === 'focus') {
        renderTasks();
        updateStats();
    } else if (view === 'backlog') {
        renderBacklog();
    } else if (view === 'archive') {
        renderArchive();
    }
}

// ============================================
// RENDERING
// ============================================

function renderAll() {
    renderTasks();
    renderBacklog();
    renderArchive();
    updateStats();
}

function renderTasks() {
    const tasks = storage.loadTasks();
    
    // Separate starred and non-starred (only active)
    const activeTasks = tasks.filter(t => t.status === 'active');
    const starredTasks = activeTasks.filter(t => t.starred);
    const nonStarredTasks = activeTasks.filter(t => !t.starred);
    
    // Render focus list
    renderTaskList('focusList', starredTasks);
    
    // Render all tasks list
    renderTaskList('allTasksList', nonStarredTasks);
    
    // Update counts
    document.getElementById('focusCount').textContent = `(${starredTasks.length}/${CONFIG.maxFocusTasks})`;
    document.getElementById('allCount').textContent = `(${nonStarredTasks.length})`;
}

function renderTaskList(containerId, tasks) {
    const container = document.getElementById(containerId);

    if (tasks.length === 0) {
        // Improved empty states
        let emptyMessage = 'No tasks yet';
        if (containerId === 'focusList') {
            emptyMessage = 'Click the <svg width="16px" height="16px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;"><path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg> icon on each task to move them to Today Focus.';
        } else if (containerId === 'allTasksList') {
            emptyMessage = 'All clear! Add tasks or swipe from Backlog view.<br><br><strong>Swipe Left:</strong> Mark Done / Archive.<br><strong>Swipe Right:</strong> Move to Backlog.<br><strong>Drag Up/Down:</strong> Reorder.<br><br>See Help for more information about views and actions.';
        }
        container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
        return;
    }

    container.innerHTML = '';

    tasks.forEach((task, index) => {
        const taskEl = createTaskElement(task);
        container.appendChild(taskEl);

        // Add hint class to last task (the newest one)
        if (index === tasks.length - 1 && CONFIG.showSwipeHints) {
            const lastTaskItem = taskEl.querySelector('.task-item');
            if (lastTaskItem) {
                lastTaskItem.classList.add('show-swipe-hint');
            }
        }
    });

    // Retrigger swipe hint animation for last task if hints are enabled
    if (CONFIG.showSwipeHints && tasks.length > 0) {
        retriggerSwipeHint(container);
    }
}

function createTaskElement(task) {
    // Wrapper for swipe background
    const wrapper = document.createElement('div');
    wrapper.className = 'task-item-wrapper';

    // Swipe backgrounds
    const bgLeft = document.createElement('div');
    bgLeft.className = 'swipe-background left';
    bgLeft.innerHTML = '<span class="swipe-background-text">Move to Archive - Done </span>';
    bgLeft.style.display = 'none';

    const bgRight = document.createElement('div');
    bgRight.className = 'swipe-background right';
    bgRight.innerHTML = '<span class="swipe-background-text">Move to backlog</span>';
    bgRight.style.display = 'none';

    // Task item
    const div = document.createElement('div');
    div.className = 'task-item';
    div.dataset.id = task.id;
    div.dataset.taskId = task.id;
    div.draggable = true;

    // Star button for Focus toggle
    const starBtn = document.createElement('button');
    starBtn.className = 'task-star';
    if (task.starred) {
        // Filled star
        starBtn.innerHTML = `
            <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5">
                <path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
    } else {
        // Empty star
        starBtn.innerHTML = `
            <svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
    }
    starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleStarToggle(task.id);
    });

    // Task text
    const textSpan = document.createElement('div');
    textSpan.className = 'task-text';
    textSpan.textContent = task.text;

    // Edit button (Pen)
    const editBtn = document.createElement('button');
    editBtn.className = 'task-edit';
    editBtn.innerHTML = `
        <svg width="20px" height="20px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.3632 5.65156L15.8431 4.17157C16.6242 3.39052 17.8905 3.39052 18.6716 4.17157L20.0858 5.58579C20.8668 6.36683 20.8668 7.63316 20.0858 8.41421L18.6058 9.8942M14.3632 5.65156L4.74749 15.2672C4.41542 15.5993 4.21079 16.0376 4.16947 16.5054L3.92738 19.2459C3.87261 19.8659 4.39148 20.3848 5.0115 20.33L7.75191 20.0879C8.21972 20.0466 8.65806 19.8419 8.99013 19.5099L18.6058 9.8942M14.3632 5.65156L18.6058 9.8942" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `;
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleEditTask(task.id, textSpan, editBtn);
    });

    // Delete button (X)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-delete';
    deleteBtn.innerHTML = `
        <svg width="20px" height="20px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.17218 14.8284L12.0006 12M14.829 9.17157L12.0006 12M12.0006 12L9.17218 9.17157M12.0006 12L14.829 14.8284" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `;
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteTask(task.id);
    });

    // Assemble task item
    div.appendChild(starBtn);
    div.appendChild(textSpan);
    div.appendChild(editBtn);
    div.appendChild(deleteBtn);
    
    // Assemble wrapper
    wrapper.appendChild(bgLeft);
    wrapper.appendChild(bgRight);
    wrapper.appendChild(div);
    
    // Add all gesture listeners
    addSwipeListeners(div, task, bgLeft, bgRight);
    addDragListeners(div, task);
    
    return wrapper;
}

// ============================================
// SWIPE FUNCTIONALITY - Horizontal & Vertical
// ============================================

function addSwipeListeners(element, task, bgLeft, bgRight) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isSwiping = false;
    let swipeDirection = null;
    let originalY = 0;
    let wrapper = element.parentElement;

    element.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwiping = false;
        swipeDirection = null;
        element.style.transition = 'none';

        // Store original position
        const rect = element.getBoundingClientRect();
        originalY = rect.top;

        // Hide both backgrounds initially
        bgLeft.style.display = 'none';
        bgRight.style.display = 'none';
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        if (!startX) return;

        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;

        const diffX = currentX - startX;
        const diffY = currentY - startY;

        // Determine primary direction (needs threshold to avoid accidental triggers)
        if (!swipeDirection && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
            swipeDirection = Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical';
        }

        if (swipeDirection === 'horizontal') {
            // Horizontal swipe
            if (Math.abs(diffX) > 10) {
                e.preventDefault();
                isSwiping = true;

                element.style.transform = `translateX(${diffX}px)`;

                // Show background text
                if (diffX < -30) {
                    // Swipe LEFT - show archive
                    bgLeft.style.display = 'flex';
                    bgRight.style.display = 'none';
                } else if (diffX > 30) {
                    // Swipe RIGHT - show backlog
                    bgRight.style.display = 'flex';
                    bgLeft.style.display = 'none';
                } else {
                    bgLeft.style.display = 'none';
                    bgRight.style.display = 'none';
                }
            }
        } else if (swipeDirection === 'vertical' && Math.abs(diffY) > 10) {
            // Vertical swipe - reorder within same section
            e.preventDefault();
            isSwiping = true;

            // Visual feedback - element follows finger
            element.style.transform = `translateY(${diffY}px)`;
            element.style.opacity = '0.8';
            element.style.zIndex = '1000';
            element.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

            // Highlight potential drop zones for reordering
            highlightDropZone(wrapper, diffY);
        }
    }, { passive: false });

    element.addEventListener('touchend', () => {
        if (!isSwiping) {
            resetElement();
            return;
        }

        const diffX = currentX - startX;
        const diffY = currentY - startY;

        if (swipeDirection === 'horizontal' && Math.abs(diffX) > 100) {
            if (diffX < 0) {
                // Swipe LEFT - Archive
                handleSwipeArchive(task.id, element);
            } else {
                // Swipe RIGHT - Backlog
                handleSwipeBacklog(task.id, element);
            }
        } else if (swipeDirection === 'vertical' && Math.abs(diffY) > 40) {
            // Vertical swipe - reorder within same section
            handleVerticalReorder(task, wrapper, diffY);
        } else {
            // Reset - didn't swipe far enough
            element.style.transition = 'transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease, background 0.3s ease';
            element.style.transform = '';
            element.style.opacity = '';
            element.style.boxShadow = '';
            element.style.background = '';
            element.style.zIndex = '';
            bgLeft.style.display = 'none';
            bgRight.style.display = 'none';
        }

        // Clear drop zone highlights
        clearDropZoneHighlights();

        resetElement();
    }, { passive: true });

    function resetElement() {
        startX = 0;
        currentX = 0;
        startY = 0;
        currentY = 0;
        isSwiping = false;
        swipeDirection = null;
    }
}

// Helper functions for vertical reordering
function highlightDropZone(draggedWrapper, diffY) {
    // Find all task wrappers in the same list
    const taskList = draggedWrapper.parentElement;
    const allWrappers = Array.from(taskList.querySelectorAll('.task-item-wrapper'));
    const draggedIndex = allWrappers.indexOf(draggedWrapper);

    // Clear previous highlights
    allWrappers.forEach(w => w.classList.remove('drop-zone-above', 'drop-zone-below'));

    // Determine which task to highlight based on drag direction
    if (diffY < -40 && draggedIndex > 0) {
        // Dragging up - highlight task above
        allWrappers[draggedIndex - 1].classList.add('drop-zone-above');
    } else if (diffY > 40 && draggedIndex < allWrappers.length - 1) {
        // Dragging down - highlight task below
        allWrappers[draggedIndex + 1].classList.add('drop-zone-below');
    }
}

function clearDropZoneHighlights() {
    document.querySelectorAll('.drop-zone-above, .drop-zone-below').forEach(el => {
        el.classList.remove('drop-zone-above', 'drop-zone-below');
    });
}

function handleVerticalReorder(task, wrapper, diffY) {
    const allTasks = storage.loadTasks();
    const taskList = wrapper.parentElement;
    const allWrappers = Array.from(taskList.querySelectorAll('.task-item-wrapper'));
    const currentWrapperIndex = allWrappers.indexOf(wrapper);

    if (currentWrapperIndex === -1) {
        resetTaskElement(wrapper);
        return;
    }

    // Determine direction and calculate new wrapper index
    let newWrapperIndex = currentWrapperIndex;
    if (diffY < -40 && currentWrapperIndex > 0) {
        // Moving up
        newWrapperIndex = currentWrapperIndex - 1;
    } else if (diffY > 40 && currentWrapperIndex < allWrappers.length - 1) {
        // Moving down
        newWrapperIndex = currentWrapperIndex + 1;
    } else {
        // Not enough movement, reset
        resetTaskElement(wrapper);
        return;
    }

    // Get the target task ID from the new position
    const targetWrapper = allWrappers[newWrapperIndex];
    const targetTaskItem = targetWrapper.querySelector('.task-item');
    const targetTaskIdString = targetTaskItem?.dataset.taskId;

    if (!targetTaskIdString) {
        resetTaskElement(wrapper);
        return;
    }

    // Convert string ID to number (dataset returns strings)
    const targetTaskId = Number(targetTaskIdString);

    // Find indices in the full tasks array
    const currentTaskIndex = allTasks.findIndex(t => t.id === task.id);
    const targetTaskIndex = allTasks.findIndex(t => t.id === targetTaskId);

    if (currentTaskIndex === -1 || targetTaskIndex === -1) {
        resetTaskElement(wrapper);
        return;
    }

    // Perform the swap in the tasks array
    const [movedTask] = allTasks.splice(currentTaskIndex, 1);
    allTasks.splice(targetTaskIndex, 0, movedTask);

    // Reset the element style before re-rendering
    const taskItem = wrapper.querySelector('.task-item');
    if (taskItem) {
        taskItem.style.transition = 'none';
        taskItem.style.transform = '';
        taskItem.style.opacity = '';
        taskItem.style.boxShadow = '';
        taskItem.style.background = '';
        taskItem.style.zIndex = '';
    }

    // Save and re-render
    storage.saveTasks(allTasks);

    // Small delay to ensure the reset happens before re-render
    setTimeout(() => {
        renderTasks();
        showToast('✓ Order updated');
    }, 10);
}

function resetTaskElement(wrapper) {
    const taskItem = wrapper.querySelector('.task-item');
    if (taskItem) {
        taskItem.style.transition = 'transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease, background 0.3s ease';
        taskItem.style.transform = '';
        taskItem.style.opacity = '';
        taskItem.style.boxShadow = '';
        taskItem.style.background = '';
        taskItem.style.zIndex = '';
    }
}

// ============================================
// DRAG TO REORDER
// ============================================

let draggedElement = null;
let draggedTask = null;

function addDragListeners(element, task) {
    element.addEventListener('dragstart', (e) => {
        draggedElement = element;
        draggedTask = task;
        element.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    
    element.addEventListener('dragend', () => {
        element.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        draggedElement = null;
        draggedTask = null;
    });
    
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (draggedElement === element) return;
        
        // Check if same section (both starred or both not starred)
        const tasks = storage.loadTasks();
        const currentTask = tasks.find(t => t.id === task.id);
        
        if (draggedTask && currentTask && draggedTask.starred === currentTask.starred) {
            element.classList.add('drag-over');
        }
    });
    
    element.addEventListener('dragleave', () => {
        element.classList.remove('drag-over');
    });
    
    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        
        if (!draggedTask || draggedTask.id === task.id) return;
        
        // Reorder tasks
        const tasks = storage.loadTasks();
        const draggedIndex = tasks.findIndex(t => t.id === draggedTask.id);
        const targetIndex = tasks.findIndex(t => t.id === task.id);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Check same section
        if (tasks[draggedIndex].starred !== tasks[targetIndex].starred) return;
        
        // Swap order
        const [removed] = tasks.splice(draggedIndex, 1);
        tasks.splice(targetIndex, 0, removed);
        
        storage.saveTasks(tasks);
        renderTasks();
        showToast('✓ Order updated');
    });
}

// ============================================
// STAR TOGGLE (FOCUS)
// ============================================

function handleStarToggle(taskId) {
    const allTasks = storage.loadTasks();
    const taskIndex = allTasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) return;

    const task = allTasks[taskIndex];
    const wasStarred = task.starred;

    // Check if we can add to Focus (max 6 tasks)
    if (!wasStarred && !storage.canAddStarredTask()) {
        showToast('Focus is full (max 6 tasks)');
        return;
    }

    // Toggle starred status
    task.starred = !wasStarred;

    // Remove task from current position
    const [movedTask] = allTasks.splice(taskIndex, 1);

    if (task.starred) {
        // Moving to Focus - place at top (beginning of array)
        allTasks.unshift(movedTask);
        showToast('⭐ Added to Today\'s Focus');
    } else {
        // Moving to Tasks - place at top of non-starred tasks
        // Find where non-starred tasks begin
        const firstNonStarredIndex = allTasks.findIndex(t => !t.starred);
        if (firstNonStarredIndex === -1) {
            // No non-starred tasks yet, add at end
            allTasks.push(movedTask);
        } else {
            // Insert at the beginning of non-starred tasks
            allTasks.splice(firstNonStarredIndex, 0, movedTask);
        }
        showToast('📋 Moved to Tasks');
    }

    // Save and re-render
    storage.saveTasks(allTasks);
    renderTasks();
}

function handleSwipeArchive(taskId, element) {
    // Animate out
    element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    element.style.transform = 'translateX(-100%)';
    element.style.opacity = '0';

    // Show celebration animation
    showCelebration(element);

    setTimeout(() => {
        const task = storage.loadTasks().find(t => t.id === taskId);
        if (!task) return;

        // Archive task
        task.status = 'done';
        task.completedAt = new Date().toISOString();

        const archive = storage.loadArchive();
        archive.push({
            ...task,
            archivedAt: new Date().toISOString()
        });
        storage.saveArchive(archive);
        storage.deleteTask(taskId);

        // Update streak
        storage.updateStreak();

        renderAll();
        showToast('✓ Task completed!');
    }, 300);
}

function showCelebration(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Create confetti particles
    const colors = ['#4A90E2', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0'];
    const particleCount = 15;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.cssText = `
            position: fixed;
            width: 8px;
            height: 8px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: 50%;
            left: ${centerX}px;
            top: ${centerY}px;
            pointer-events: none;
            z-index: 2000;
        `;

        document.body.appendChild(particle);

        // Random direction
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 100 + Math.random() * 100;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        // Animate
        particle.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
        ], {
            duration: 600,
            easing: 'cubic-bezier(0, .9, .57, 1)'
        }).onfinish = () => {
            particle.remove();
        };
    }
}

function handleSwipeBacklog(taskId, element) {
    // Animate out
    element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    element.style.transform = 'translateX(100%)';
    element.style.opacity = '0';
    
    setTimeout(() => {
        storage.moveToBacklog(taskId);
        renderAll();
        showToast('📦 Moved to backlog');
    }, 300);
}

// ============================================
// BACKLOG & ARCHIVE
// ============================================

function renderBacklog() {
    const backlog = storage.loadBacklog();
    const container = document.getElementById('backlogList');

    if (backlog.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                <path d="M10 12L14 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M3 3L21 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M21 7V20.4C21 20.7314 20.7314 21 20.4 21H3.6C3.26863 21 3 20.7314 3 20.4V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
            Your backlog is empty - great job staying on top of things!
        </div>`;
        return;
    }

    container.innerHTML = '';

    backlog.forEach((task, index) => {
        // Wrapper for swipe background
        const wrapper = document.createElement('div');
        wrapper.className = 'task-item-wrapper';

        // Swipe background
        const bgLeft = document.createElement('div');
        bgLeft.className = 'swipe-background left';
        bgLeft.innerHTML = '<span class="swipe-background-text">Move to today</span>';
        bgLeft.style.display = 'none';

        // Task item
        const div = document.createElement('div');
        div.className = 'task-item backlog-task-item';

        // Add hint class to first task
        if (index === 0 && CONFIG.showSwipeHints) {
            div.classList.add('show-swipe-hint');
        }

        const textSpan = document.createElement('div');
        textSpan.className = 'task-text';
        textSpan.textContent = task.text;

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'task-edit';
        editBtn.innerHTML = `
            <svg width="20px" height="20px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.3632 5.65156L15.8431 4.17157C16.6242 3.39052 17.8905 3.39052 18.6716 4.17157L20.0858 5.58579C20.8668 6.36683 20.8668 7.63316 20.0858 8.41421L18.6058 9.8942M14.3632 5.65156L4.74749 15.2672C4.41542 15.5993 4.21079 16.0376 4.16947 16.5054L3.92738 19.2459C3.87261 19.8659 4.39148 20.3848 5.0115 20.33L7.75191 20.0879C8.21972 20.0466 8.65806 19.8419 8.99013 19.5099L18.6058 9.8942M14.3632 5.65156L18.6058 9.8942" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleEditBacklogTask(task.id, textSpan, editBtn);
        });

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'task-delete';
        deleteBtn.innerHTML = `
            <svg width="20px" height="20px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.17218 14.8284L12.0006 12M14.829 9.17157L12.0006 12M12.0006 12L9.17218 9.17157M12.0006 12L14.829 14.8284" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteBacklogTask(task.id);
        });

        div.appendChild(textSpan);
        div.appendChild(editBtn);
        div.appendChild(deleteBtn);

        // Assemble wrapper
        wrapper.appendChild(bgLeft);
        wrapper.appendChild(div);

        // Swipe to move back to today (with background)
        let startX = 0;
        let startY = 0;
        div.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            div.style.transition = 'none';
            bgLeft.style.display = 'none';
        }, { passive: true });

        div.addEventListener('touchmove', (e) => {
            if (!startX) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = currentX - startX;
            const diffY = Math.abs(currentY - startY);

            // Only allow LEFT swipe (negative diffX)
            if (Math.abs(diffX) > Math.abs(diffY) && diffX < -10) {
                e.preventDefault();
                div.style.transform = `translateX(${diffX}px)`;

                // Show background when swiping left
                if (diffX < -30) {
                    bgLeft.style.display = 'flex';
                } else {
                    bgLeft.style.display = 'none';
                }
            }
        }, { passive: false });

        div.addEventListener('touchend', () => {
            const diffX = div.style.transform.match(/-?\d+/);
            const distance = diffX ? parseInt(diffX[0]) : 0;

            if (distance < -100) {
                // Swipe successful - move to today
                div.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                div.style.transform = 'translateX(-100%)';
                div.style.opacity = '0';

                setTimeout(() => {
                    storage.moveFromBacklogToToday(task.id);
                    renderAll();
                    showToast('✓ Moved to today');
                }, 300);
            } else {
                // Reset
                div.style.transition = 'transform 0.3s ease';
                div.style.transform = '';
                bgLeft.style.display = 'none';
            }

            startX = 0;
            startY = 0;
        }, { passive: true });

        container.appendChild(wrapper);
    });
}

function renderArchive() {
    const archive = storage.loadArchive();
    const container = document.getElementById('archiveList');

    if (archive.length === 0) {
        container.innerHTML = '<div class="empty-state">No completed tasks yet. Time to get started!</div>';
        return;
    }

    container.innerHTML = '';

    const sorted = [...archive].sort((a, b) =>
        new Date(b.archivedAt) - new Date(a.archivedAt)
    );

    sorted.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item archive-task-item';
        // Prevent any touch interactions from moving the task
        div.style.touchAction = 'auto';
        div.style.userSelect = 'text';

        const date = new Date(task.archivedAt);

        // Format date with time
        const dateStr = date.toLocaleDateString('sv-SE', {
            day: 'numeric',
            month: 'short'
        });
        const timeStr = date.toLocaleTimeString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const dateTimeSpan = document.createElement('div');
        dateTimeSpan.className = 'archive-date';
        dateTimeSpan.textContent = `${dateStr} ${timeStr}`;

        const textSpan = document.createElement('div');
        textSpan.className = 'task-text';
        textSpan.textContent = task.text;
        textSpan.style.flex = '1';
        textSpan.style.cursor = 'default';

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'task-edit';
        editBtn.innerHTML = `
            <svg width="20px" height="20px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.3632 5.65156L15.8431 4.17157C16.6242 3.39052 17.8905 3.39052 18.6716 4.17157L20.0858 5.58579C20.8668 6.36683 20.8668 7.63316 20.0858 8.41421L18.6058 9.8942M14.3632 5.65156L4.74749 15.2672C4.41542 15.5993 4.21079 16.0376 4.16947 16.5054L3.92738 19.2459C3.87261 19.8659 4.39148 20.3848 5.0115 20.33L7.75191 20.0879C8.21972 20.0466 8.65806 19.8419 8.99013 19.5099L18.6058 9.8942M14.3632 5.65156L18.6058 9.8942" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleEditArchiveTask(task.id, textSpan, editBtn);
        });

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'task-delete';
        deleteBtn.innerHTML = `
            <svg width="20px" height="20px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.17218 14.8284L12.0006 12M14.829 9.17157L12.0006 12M12.0006 12L9.17218 9.17157M12.0006 12L14.829 14.8284" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteArchiveTask(task.id);
        });

        div.appendChild(dateTimeSpan);
        div.appendChild(textSpan);
        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
        container.appendChild(div);
    });
}

// ============================================
// TASK HANDLERS
// ============================================

function handleAddTask() {
    const input = document.getElementById('taskInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    storage.addTask(text);
    input.value = '';
    input.focus();
    
    renderTasks();
}

function handleEditTask(id, textElement, editBtn) {
    const currentText = textElement.textContent;
    const taskItem = textElement.closest('.task-item');

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'task-edit-input';

    // Replace text element with input
    textElement.style.display = 'none';
    textElement.parentNode.insertBefore(input, textElement);
    input.focus();
    input.select();

    // Change pen icon to save/disk icon
    editBtn.innerHTML = `
        <svg width="20px" height="20px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 19V5C3 3.89543 3.89543 3 5 3H16.1716C16.702 3 17.2107 3.21071 17.5858 3.58579L20.4142 6.41421C20.7893 6.78929 21 7.29799 21 7.82843V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M8.6 9H15.4C15.7314 9 16 8.73137 16 8.4V3.6C16 3.26863 15.7314 3 15.4 3H8.6C8.26863 3 8 3.26863 8 3.6V8.4C8 8.73137 8.26863 9 8.6 9Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M6 13.6V21H18V13.6C18 13.2686 17.7314 13 17.4 13H6.6C6.26863 13 6 13.2686 6 13.6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `;

    const saveEdit = () => {
        const newText = input.value.trim();

        // Remove input
        input.remove();
        textElement.style.display = '';

        // Restore pen icon
        editBtn.innerHTML = `
            <svg width="20px" height="20px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.3632 5.65156L15.8431 4.17157C16.6242 3.39052 17.8905 3.39052 18.6716 4.17157L20.0858 5.58579C20.8668 6.36683 20.8668 7.63316 20.0858 8.41421L18.6058 9.8942M14.3632 5.65156L4.74749 15.2672C4.41542 15.5993 4.21079 16.0376 4.16947 16.5054L3.92738 19.2459C3.87261 19.8659 4.39148 20.3848 5.0115 20.33L7.75191 20.0879C8.21972 20.0466 8.65806 19.8419 8.99013 19.5099L18.6058 9.8942M14.3632 5.65156L18.6058 9.8942" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;

        if (newText && newText !== currentText) {
            storage.updateTask(id, { text: newText });
            renderTasks();
        } else {
            textElement.textContent = currentText;
        }
    };

    // Save on blur
    input.addEventListener('blur', saveEdit, { once: true });

    // Save on Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
    }, { once: true });

    // Cancel on Escape key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            input.value = currentText;
            input.blur();
        }
    }, { once: true });
}

function handleEditBacklogTask(id, textElement, editBtn) {
    const currentText = textElement.textContent;

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'task-edit-input';

    // Replace text element with input
    textElement.style.display = 'none';
    textElement.parentNode.insertBefore(input, textElement);
    input.focus();
    input.select();

    // Change pen icon to save/disk icon
    editBtn.innerHTML = `
        <svg width="20px" height="20px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 19V5C3 3.89543 3.89543 3 5 3H16.1716C16.702 3 17.2107 3.21071 17.5858 3.58579L20.4142 6.41421C20.7893 6.78929 21 7.29799 21 7.82843V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M8.6 9H15.4C15.7314 9 16 8.73137 16 8.4V3.6C16 3.26863 15.7314 3 15.4 3H8.6C8.26863 3 8 3.26863 8 3.6V8.4C8 8.73137 8.26863 9 8.6 9Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M6 13.6V21H18V13.6C18 13.2686 17.7314 13 17.4 13H6.6C6.26863 13 6 13.2686 6 13.6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `;

    const saveEdit = () => {
        const newText = input.value.trim();

        // Remove input
        input.remove();
        textElement.style.display = '';

        // Restore pen icon
        editBtn.innerHTML = `
            <svg width="20px" height="20px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.3632 5.65156L15.8431 4.17157C16.6242 3.39052 17.8905 3.39052 18.6716 4.17157L20.0858 5.58579C20.8668 6.36683 20.8668 7.63316 20.0858 8.41421L18.6058 9.8942M14.3632 5.65156L4.74749 15.2672C4.41542 15.5993 4.21079 16.0376 4.16947 16.5054L3.92738 19.2459C3.87261 19.8659 4.39148 20.3848 5.0115 20.33L7.75191 20.0879C8.21972 20.0466 8.65806 19.8419 8.99013 19.5099L18.6058 9.8942M14.3632 5.65156L18.6058 9.8942" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;

        if (newText && newText !== currentText) {
            storage.updateBacklogTask(id, { text: newText });
            renderBacklog();
        } else {
            textElement.textContent = currentText;
        }
    };

    input.addEventListener('blur', saveEdit, { once: true });
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
    }, { once: true });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            input.value = currentText;
            input.blur();
        }
    }, { once: true });
}

function handleEditArchiveTask(id, textElement, editBtn) {
    const currentText = textElement.textContent;

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'task-edit-input';

    // Replace text element with input
    textElement.style.display = 'none';
    textElement.parentNode.insertBefore(input, textElement);
    input.focus();
    input.select();

    // Change pen icon to save/disk icon
    editBtn.innerHTML = `
        <svg width="20px" height="20px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 19V5C3 3.89543 3.89543 3 5 3H16.1716C16.702 3 17.2107 3.21071 17.5858 3.58579L20.4142 6.41421C20.7893 6.78929 21 7.29799 21 7.82843V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M8.6 9H15.4C15.7314 9 16 8.73137 16 8.4V3.6C16 3.26863 15.7314 3 15.4 3H8.6C8.26863 3 8 3.26863 8 3.6V8.4C8 8.73137 8.26863 9 8.6 9Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M6 13.6V21H18V13.6C18 13.2686 17.7314 13 17.4 13H6.6C6.26863 13 6 13.2686 6 13.6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `;

    const saveEdit = () => {
        const newText = input.value.trim();

        // Remove input
        input.remove();
        textElement.style.display = '';

        // Restore pen icon
        editBtn.innerHTML = `
            <svg width="20px" height="20px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.3632 5.65156L15.8431 4.17157C16.6242 3.39052 17.8905 3.39052 18.6716 4.17157L20.0858 5.58579C20.8668 6.36683 20.8668 7.63316 20.0858 8.41421L18.6058 9.8942M14.3632 5.65156L4.74749 15.2672C4.41542 15.5993 4.21079 16.0376 4.16947 16.5054L3.92738 19.2459C3.87261 19.8659 4.39148 20.3848 5.0115 20.33L7.75191 20.0879C8.21972 20.0466 8.65806 19.8419 8.99013 19.5099L18.6058 9.8942M14.3632 5.65156L18.6058 9.8942" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;

        if (newText && newText !== currentText) {
            storage.updateArchiveTask(id, { text: newText });
            renderArchive();
        } else {
            textElement.textContent = currentText;
        }
    };

    input.addEventListener('blur', saveEdit, { once: true });
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
    }, { once: true });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            input.value = currentText;
            input.blur();
        }
    }, { once: true });
}

function handleDeleteTask(id) {
    const tasks = storage.loadTasks();
    const taskToDelete = tasks.find(t => t.id === id);

    if (!taskToDelete) return;

    // Save to undo stack
    undoStack.push({
        type: 'delete',
        task: { ...taskToDelete },
        timestamp: Date.now()
    });

    storage.deleteTask(id);
    renderAll();
    showToastWithUndo('Task deleted', () => {
        // Undo function
        const undoItem = undoStack.pop();
        if (undoItem && undoItem.type === 'delete') {
            const tasks = storage.loadTasks();
            tasks.push(undoItem.task);
            storage.saveTasks(tasks);
            renderAll();
            showToast('✓ Task restored');
        }
    });
}

function handleDeleteBacklogTask(id) {
    const backlog = storage.loadBacklog();
    const taskToDelete = backlog.find(t => t.id === id);

    if (!taskToDelete) return;

    // Save to undo stack
    undoStack.push({
        type: 'deleteBacklog',
        task: { ...taskToDelete },
        timestamp: Date.now()
    });

    storage.deleteBacklogTask(id);
    renderAll();
    showToastWithUndo('Task deleted', () => {
        // Undo function
        const undoItem = undoStack.pop();
        if (undoItem && undoItem.type === 'deleteBacklog') {
            const backlog = storage.loadBacklog();
            backlog.push(undoItem.task);
            storage.saveBacklog(backlog);
            renderAll();
            showToast('✓ Task restored');
        }
    });
}

function handleDeleteArchiveTask(id) {
    const archive = storage.loadArchive();
    const taskToDelete = archive.find(t => t.id === id);

    if (!taskToDelete) return;

    // Save to undo stack
    undoStack.push({
        type: 'deleteArchive',
        task: { ...taskToDelete },
        timestamp: Date.now()
    });

    storage.deleteArchivedTask(id);
    renderAll();
    showToastWithUndo('Task deleted', () => {
        // Undo function
        const undoItem = undoStack.pop();
        if (undoItem && undoItem.type === 'deleteArchive') {
            const archive = storage.loadArchive();
            archive.push(undoItem.task);
            storage.saveArchive(archive);
            renderAll();
            showToast('✓ Task restored');
        }
    });
}

// ============================================
// STATS
// ============================================

function updateStats() {
    const streakData = storage.getStreakData();

    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    let currentStreak = streakData.currentStreak;

    if (streakData.lastStreakDate !== today && streakData.lastStreakDate !== yesterdayStr) {
        currentStreak = 0;
    }

    document.getElementById('streakDays').textContent = currentStreak;

    // Update daily progress
    updateDailyProgress();
}

function updateDailyProgress() {
    const archive = storage.loadArchive();
    const today = new Date().toDateString();

    // Count tasks completed today
    const tasksCompletedToday = archive.filter(task => {
        const taskDate = new Date(task.archivedAt).toDateString();
        return taskDate === today;
    }).length;

    // Update progress bar
    const progressBar = document.getElementById('dailyProgressBar');
    const progressText = document.getElementById('progressText');

    if (progressBar && progressText) {
        // Calculate percentage (assuming 6 tasks is 100%)
        const targetTasks = CONFIG.maxFocusTasks || 6;
        const percentage = Math.min((tasksCompletedToday / targetTasks) * 100, 100);

        progressBar.style.width = `${percentage}%`;

        // Update text with motivational message
        if (tasksCompletedToday === 0) {
            progressText.textContent = 'No tasks completed yet - let\'s get started!';
        } else if (tasksCompletedToday >= targetTasks) {
            progressText.textContent = `🎉 ${tasksCompletedToday} tasks completed - amazing work!`;
        } else {
            progressText.textContent = `${tasksCompletedToday} of ${targetTasks} tasks completed today`;
        }
    }

    // Update progress ring
    const progressRing = document.getElementById('progressRingCircle');
    const progressRingText = document.getElementById('progressRingText');

    if (progressRing && progressRingText) {
        const targetTasks = CONFIG.maxFocusTasks || 6;
        const percentage = Math.min((tasksCompletedToday / targetTasks) * 100, 100);

        // Calculate stroke-dashoffset (circumference = 2 * PI * r = 150.8)
        const circumference = 150.8;
        const offset = circumference - (percentage / 100) * circumference;

        progressRing.style.strokeDashoffset = offset;
        progressRingText.textContent = tasksCompletedToday;
    }
}

function checkAutoResetFocus() {
    if (!CONFIG.autoResetFocus) return;
    
    const lastResetDate = localStorage.getItem('lastFocusReset');
    const today = new Date().toDateString();
    
    if (lastResetDate !== today) {
        const cleared = storage.clearAllStars();
        if (cleared > 0) {
            localStorage.setItem('lastFocusReset', today);
            showToast(`🌅 New day! ${cleared} focus task${cleared === 1 ? '' : 's'} cleared`);
        }
    }
}

// ============================================
// ONBOARDING FOR NEW USERS
// ============================================

function showOnboardingIfNeeded() {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');

    if (hasSeenOnboarding) return;

    // Wait a moment before showing onboarding
    setTimeout(() => {
        showOnboarding();
    }, 500);
}

function showOnboarding() {
    const overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 4000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: var(--bg-white);
        padding: 32px 24px;
        border-radius: 16px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        text-align: center;
    `;

    let currentStep = 0;
    const steps = [
        {
            emoji: '🎯',
            title: 'Welcome to IvyFocus!',
            text: 'A simple task manager based on the proven Ivy Lee Method for maximum productivity.'
        },
        {
            emoji: '⭐',
            title: 'Focus on What Matters',
            text: 'Pick up to 6 tasks to focus on today. Work on them one at a time, starting with the most important.'
        },
        {
            emoji: '👆',
            title: 'Swipe to Organize',
            text: '← Swipe left to archive\n→ Swipe right for backlog\n↑ Swipe up to add to focus'
        },
        {
            emoji: '🔥',
            title: 'Build Your Streak',
            text: 'Complete tasks daily to build a streak and track your progress over time.'
        }
    ];

    function renderStep(step) {
        content.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 16px;">${steps[step].emoji}</div>
            <h2 style="margin: 0 0 16px 0; color: var(--primary-blue); font-size: 22px;">${steps[step].title}</h2>
            <p style="color: var(--text-dark); line-height: 1.6; font-size: 15px; white-space: pre-line; margin-bottom: 24px;">${steps[step].text}</p>
            <div style="display: flex; gap: 8px; margin-bottom: 16px; justify-content: center;">
                ${steps.map((_, i) => `
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${i === step ? 'var(--primary-blue)' : 'var(--border-light)'};"></div>
                `).join('')}
            </div>
            <div style="display: flex; gap: 12px;">
                ${step > 0 ? '<button id="prevBtn" style="flex: 1; padding: 12px; background: var(--bg-gray); border: none; border-radius: 8px; font-weight: 600; cursor: pointer; color: var(--text-dark);">Back</button>' : '<div style="flex: 1;"></div>'}
                <button id="nextBtn" style="flex: 1; padding: 12px; background: var(--primary-blue); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">${step === steps.length - 1 ? 'Get Started!' : 'Next'}</button>
            </div>
        `;

        const nextBtn = content.querySelector('#nextBtn');
        const prevBtn = content.querySelector('#prevBtn');

        nextBtn.addEventListener('click', () => {
            if (step === steps.length - 1) {
                localStorage.setItem('hasSeenOnboarding', 'true');
                overlay.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => overlay.remove(), 300);
            } else {
                currentStep++;
                renderStep(currentStep);
            }
        });

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentStep--;
                renderStep(currentStep);
            });
        }
    }

    renderStep(currentStep);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

// ============================================
// SWIPE HINT FOR NEW USERS
// ============================================

function showSwipeHintIfNeeded() {
    // Check if user has seen the hint
    const hasSeenHint = localStorage.getItem('hasSeenSwipeHint');

    if (hasSeenHint) return;

    // Wait a bit before showing hint
    setTimeout(() => {
        const tasks = storage.loadTasks();

        // Only show if user has at least one task
        if (tasks.length > 0) {
            showSwipeHint();
            localStorage.setItem('hasSeenSwipeHint', 'true');
        }
    }, 2000);
}

function showSwipeHint() {
    const hint = document.createElement('div');
    hint.id = 'swipeHint';
    hint.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary-blue);
        color: white;
        padding: 16px 24px;
        border-radius: 16px;
        z-index: 2500;
        animation: swipeHintBounce 2s ease-in-out infinite;
        box-shadow: 0 4px 16px rgba(74, 144, 226, 0.4);
        max-width: 90%;
        text-align: center;
    `;

    hint.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">👆 Swipe tasks!</div>
        <div style="font-size: 13px; opacity: 0.9;">← Archive | Backlog → | ↑ Focus</div>
    `;

    document.body.appendChild(hint);

    // Remove after 5 seconds
    setTimeout(() => {
        hint.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (hint.parentNode) {
                hint.remove();
            }
        }, 300);
    }, 5000);
}

// ============================================
// INFO TOGGLE
// ============================================

function handleInfoToggle(e) {
    const button = e.currentTarget;
    const infoType = button.dataset.info;
    const infoSection = document.getElementById(`info${infoType.charAt(0).toUpperCase() + infoType.slice(1)}`);

    if (!infoSection) return;

    // Close all other info sections
    document.querySelectorAll('.info-section').forEach(section => {
        if (section !== infoSection && section.classList.contains('expanded')) {
            section.classList.remove('expanded');
        }
    });

    // Toggle current section
    infoSection.classList.toggle('expanded');

    // Update button appearance
    if (infoSection.classList.contains('expanded')) {
        button.style.opacity = '1';
        button.style.background = 'rgba(74, 144, 226, 0.1)';
    } else {
        button.style.opacity = '0.7';
        button.style.background = 'transparent';
    }
}

// ============================================
// SETTINGS
// ============================================

function handleSettingsChange() {
    CONFIG.maxFocusTasks = parseInt(document.getElementById('maxFocusTasks').value);
    CONFIG.autoResetFocus = document.getElementById('autoResetFocus').checked;

    saveSettings();
    renderTasks();

    showToast('✓ Settings saved');
}

function handleSwipeHintsChange() {
    CONFIG.showSwipeHints = document.getElementById('showSwipeHints').checked;
    saveSettings();
    applySwipeHints();
    showToast('✓ Settings saved');
}

function handleWeekStartChange(e) {
    CONFIG.weekStartsOnMonday = e.target.value === 'monday';
    saveSettings();
    updateTodayDate();
    showToast('✓ Settings saved');
}

function applySwipeHints() {
    if (CONFIG.showSwipeHints) {
        document.body.classList.add('swipe-hints-enabled');
    } else {
        document.body.classList.remove('swipe-hints-enabled');
    }
}

function retriggerSwipeHint(container) {
    // Find the task with show-swipe-hint class
    const hintTask = container.querySelector('.task-item.show-swipe-hint');
    if (hintTask) {
        // Force reflow to restart animation
        hintTask.style.animation = 'none';
        setTimeout(() => {
            hintTask.style.animation = '';
        }, 10);
    }
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('theme', theme);
}

function handleThemeChange(e) {
    applyTheme(e.target.value);
}

function handleExportData() {
    const data = storage.exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-focus-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('✓ Data exported');
}

// ============================================
// TOAST
// ============================================

function showToast(message) {
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
        animation: fadeInOut 2s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            document.body.removeChild(toast);
        }
    }, 2000);
}

function showToastWithUndo(message, undoCallback) {
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
        animation: fadeInOut 4s ease;
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
    }, 4000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0%, 100% { opacity: 0; transform: translateX(-50%) translateY(10px); }
        10%, 90% { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    @keyframes swipeHintBounce {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50% { transform: translateX(-50%) translateY(-8px); }
    }
`;
document.head.appendChild(style);