/**
 * Assistant Feature
 * Context-aware helper system that guides users through the app
 */

import * as storage from '../storage.js';

/**
 * Assistant icons (inline SVGs)
 */
export const assistantIcons = {
    disk: () => '<svg width="18px" height="18px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block; margin: 0 2px;"><path d="M3 19V5C3 3.89543 3.89543 3 5 3H16.1716C16.702 3 17.2107 3.21071 17.5858 3.58579L20.4142 6.41421C20.7893 6.78929 21 7.29799 21 7.82843V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path><path d="M8.6 9H15.4C15.7314 9 16 8.73137 16 8.4V3.6C16 3.26863 15.7314 3 15.4 3H8.6C8.26863 3 8 3.26863 8 3.6V8.4C8 8.73137 8.26863 9 8.6 9Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path></svg>',

    star: () => '<svg width="18px" height="18px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block; margin: 0 2px;"><path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path></svg>',

    pen: () => '<svg width="18px" height="18px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block; margin: 0 2px;"><path d="M14.3632 5.65156L15.8431 4.17157C16.6242 3.39052 17.8905 3.39052 18.6716 4.17157L20.0858 5.58579C20.8668 6.36683 20.8668 7.63316 20.0858 8.41421L18.6058 9.8942M14.3632 5.65156L4.74749 15.2672C4.41542 15.5993 4.21079 16.0376 4.16947 16.5054L3.92738 19.2459C3.87261 19.8659 4.39148 20.3848 5.0115 20.33L7.75191 20.0879C8.21972 20.0466 8.65806 19.8419 8.99013 19.5099L18.6058 9.8942M14.3632 5.65156L18.6058 9.8942" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path></svg>',

    close: () => '<svg width="18px" height="18px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block; margin: 0 2px;"><path d="M9.17218 14.8284L12.0006 12M14.829 9.17157L12.0006 12M12.0006 12L9.17218 9.17157M12.0006 12L14.829 14.8284" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
};

/**
 * Global state for assistant context
 */
export const assistantState = {
    isEditing: false,
    justDeleted: false,
    justAddedFirstTask: false,
    justCompletedTask: false,
    completedCount: 0,
    totalGoal: 0
};

/**
 * Context-aware assistant messages for each view
 */
export const assistantMessages = {
    focus: (taskCount, focusCount) => {
        // Editing state takes priority
        if (assistantState.isEditing) {
            return `Write your update and click the ${assistantIcons.disk()} save icon to save your changes.`;
        }

        // Reward message when task completed
        if (assistantState.justCompletedTask) {
            const { completedCount, totalGoal } = assistantState;
            if (completedCount >= totalGoal) {
                return `Bra jobbat! Alla ${totalGoal} uppgifter klara idag. Du är grym!`;
            } else {
                return `Snyggt! ${completedCount} av ${totalGoal} klar. Gör smajlisen gladare genom att fixa en till!`;
            }
        }

        // Delete state
        if (assistantState.justDeleted) {
            return 'Task deleted - you can undo using the notification that appeared below.';
        }

        // No tasks yet
        if (taskCount === 0) {
            return `Welcome! Add a task and click the ${assistantIcons.disk()} save icon to get started. Click on the face icon to see your progress.`;
        }

        // First task added - show comprehensive instructions immediately
        if (assistantState.justAddedFirstTask || (taskCount === 1 && focusCount === 0)) {
            return `Click the ${assistantIcons.star()} <strong>star icon</strong> to move tasks to Today's Focus. <strong>Swipe left</strong> to mark as done and move to archive, <strong>swipe right</strong> to move to backlog. <strong>Drag up/down</strong> to reorder tasks.`;
        }

        // Has tasks but no focus
        if (focusCount === 0) {
            return `Click the ${assistantIcons.star()} <strong>star icon</strong> on tasks to move them to Today's Focus. <strong>Swipe left</strong> to mark as done and move to archive, <strong>swipe right</strong> to move to backlog.`;
        }

        // Has focus tasks
        return `Great! Work on your focus tasks one at a time. <strong>Swipe left</strong> to mark as done and move to archive, or <strong>swipe right</strong> to move to backlog. <strong>Drag</strong> to reorder.`;
    },

    backlog: (backlogCount) => {
        if (assistantState.isEditing) {
            return `Write your update and click the ${assistantIcons.disk()} save icon to save your changes.`;
        }

        if (backlogCount === 0) {
            return 'Your backlog is empty.';
        } else {
            return `Swipe left on any task to move it back to Today. Click ${assistantIcons.pen()} to edit or ${assistantIcons.close()} to delete.`;
        }
    },

    archive: (archiveCount) => {
        if (archiveCount === 0) {
            return 'No completed tasks yet. Archive tasks by swiping left on them in the Today view.';
        } else {
            return `Well done! You've completed ${archiveCount} task${archiveCount === 1 ? '' : 's'}. Swipe left to move back to Today. Click ${assistantIcons.pen()} to edit or ${assistantIcons.close()} to delete.`;
        }
    },

    settings: () => {
        return 'Customize your experience. Adjust focus limits, enable auto-reset, change themes, and manage your data.';
    },

    guide: () => {
        return 'Learn how to use Ivy Focus effectively. The Ivy Lee Method helps you focus on what matters most.';
    }
};

/**
 * Typewriter effect - displays text character by character
 * @param {HTMLElement} element - The element to display text in
 * @param {string} htmlContent - The HTML content to display
 * @param {number} speed - Speed in milliseconds per character
 */
export function typewriterEffect(element, htmlContent, speed = 30) {
    // Clear any ongoing typewriter effect on this specific element
    if (element._typewriterTimeout) {
        clearTimeout(element._typewriterTimeout);
        element._typewriterTimeout = null;
    }

    // Split content into parts: text characters and HTML tags
    const parts = [];
    let currentPos = 0;
    const htmlPattern = /<[^>]+>/g;
    let match;

    while ((match = htmlPattern.exec(htmlContent)) !== null) {
        // Add text before the tag (character by character)
        const textBefore = htmlContent.substring(currentPos, match.index);
        for (let i = 0; i < textBefore.length; i++) {
            parts.push({ type: 'char', content: textBefore[i] });
        }

        // Add the HTML tag as a whole
        parts.push({ type: 'html', content: match[0] });
        currentPos = match.index + match[0].length;
    }

    // Add remaining text after last tag
    const remainingText = htmlContent.substring(currentPos);
    for (let i = 0; i < remainingText.length; i++) {
        parts.push({ type: 'char', content: remainingText[i] });
    }

    // Clear current content
    element.innerHTML = '';

    let partIndex = 0;
    let currentHTML = '';

    function typeNextPart() {
        if (partIndex < parts.length) {
            const part = parts[partIndex];
            currentHTML += part.content;
            element.innerHTML = currentHTML;
            partIndex++;

            element._typewriterTimeout = setTimeout(typeNextPart, speed);
        } else {
            // Finished typing
            element._typewriterTimeout = null;
        }
    }

    // Start typing
    typeNextPart();
}

/**
 * Update assistant message based on current view and state
 * @param {string} currentView - The current view name
 */
export function updateAssistantMessage(currentView) {
    const assistantSections = document.querySelectorAll('.assistant-section');
    const assistantMessageElements = document.querySelectorAll('.assistant-message');

    if (assistantSections.length === 0 || assistantMessageElements.length === 0) return;

    // Check if assistant is hidden
    const assistantHidden = localStorage.getItem('assistantHidden') === 'true';

    assistantSections.forEach(section => {
        if (assistantHidden) {
            section.classList.add('hidden');
        } else {
            section.classList.remove('hidden');
        }
    });

    if (assistantHidden) return;

    // Don't start typewriter if welcome modal is visible
    const welcomeModal = document.getElementById('welcomeModal');
    if (welcomeModal && welcomeModal.style.display === 'flex') {
        return;
    }

    // Get current state
    const tasks = storage.loadTasks();
    const focusTasks = tasks.filter(t => t.starred);
    const backlogTasks = storage.loadBacklog();
    const archiveTasks = storage.loadArchive();

    // Reset justAddedFirstTask if we now have more than 1 task
    if (assistantState.justAddedFirstTask && tasks.length > 1) {
        assistantState.justAddedFirstTask = false;
    }

    let message = '';

    switch (currentView) {
        case 'focus':
            message = assistantMessages.focus(tasks.length, focusTasks.length);
            break;
        case 'backlog':
            message = assistantMessages.backlog(backlogTasks.length);
            break;
        case 'archive':
            message = assistantMessages.archive(archiveTasks.length);
            break;
        case 'settings':
            message = assistantMessages.settings();
            break;
        case 'guide':
            message = assistantMessages.guide();
            break;
        default:
            message = 'Welcome to IvyFocus!';
    }

    // Update all assistant message elements with typewriter effect
    assistantMessageElements.forEach(element => {
        typewriterEffect(element, message, 30);
    });
}

/**
 * Initialize assistant feature
 */
export function initializeAssistant() {
    // Add click handlers to all close buttons
    const closeButtons = document.querySelectorAll('.assistant-close');

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            localStorage.setItem('assistantHidden', 'true');
            document.querySelectorAll('.assistant-section').forEach(section => {
                section.classList.add('hidden');
            });
        });
    });

    // Only update assistant message if welcome modal is not being shown
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome') === 'true';
    if (hasSeenWelcome) {
        // Modal won't show, safe to run typewriter immediately
        // Note: currentView needs to be passed from app.js
        return true; // Indicates initialization done, caller should update message
    }
    // Otherwise, updateAssistantMessage will be called after modal closes
    return false;
}
