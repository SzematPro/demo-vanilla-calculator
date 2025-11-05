/**
 * Professional Calculator Engine
 * Enterprise-grade calculator with 8-15-digit precision (configurable), error handling, and accessibility
 * 
 * Features:
 * - 8-15-digit maximum input/output (configurable: 8, 10, 12, 15 digits)
 * - Keyboard and touch support
 * - Error handling and validation
 * - Theme switching
 * - WCAG 2.2 compliance
 * - Mobile-first responsive design
 * - Security hardening (XSS prevention, input validation)
 * - Performance optimizations
 * - Comprehensive error handling
 * 
 * @version 1.0.0
 * @author Waldemar Szemat
 */

class Calculator {
    /**
     * Initialize calculator with enterprise-grade configuration
     * @throws {Error} If required DOM elements are missing
     */
    constructor() {
        // Validate DOM elements exist
        this.display = document.getElementById('displayText');
        this.operationDisplay = document.getElementById('operationDisplay');
        this.themeToggle = document.getElementById('themeToggle');
        this.themeIcon = document.getElementById('themeIcon');
        this.historyToggle = document.getElementById('historyToggle');
        this.settingsToggle = document.getElementById('settingsToggle');
        
        if (!this.display || !this.operationDisplay || !this.themeToggle || !this.themeIcon) {
            throw new Error('Required DOM elements not found. Calculator initialization failed.');
        }
        
        // Calculator state
        this.currentInput = '0';
        this.previousInput = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.maxDigits = 12;
        this.decimalPlaces = 0;
        this.hasDecimal = false;
        
        // Error states
        this.isError = false;
        this.isOverflow = false;
        
        // Theme management with safe localStorage access
        try {
            this.currentTheme = localStorage.getItem('calculator-theme') || 'light';
        } catch (error) {
            // Fallback if localStorage is unavailable
            this.currentTheme = 'light';
            console.warn('localStorage unavailable, using default theme');
        }
        
        // Performance optimization: Debouncing
        this.debounceTimer = null;
        this.debounceDelay = 150; // ms
        
        // Performance optimization: RequestAnimationFrame for smooth updates
        this.rafId = null;
        this.pendingDisplayUpdate = false;
        
        // History management
        this.history = [];
        this.historyLimit = 50;
        this.historyVisible = false;
        
        // Memory management
        this.memory = 0;
        this.memoryActive = false;
        
        // Settings
        this.settings = {
            precision: 12,
            historyLimit: 50
        };
        
        // Load settings from localStorage
        this.loadSettings();
        
        this.initializeCalculator();
        this.bindEvents();
        this.applyTheme();
    }
    
    /**
     * Initialize calculator state and UI
     */
    initializeCalculator() {
        this.updateDisplay();
        this.updateOperationDisplay();
        this.setupKeyboardSupport();
    }
    
    /**
     * Bind all event listeners with performance optimizations
     */
    bindEvents() {
        // Performance: Use event delegation instead of individual listeners
        const buttonsContainer = document.querySelector('.buttons-container');
        if (buttonsContainer) {
            buttonsContainer.addEventListener('click', (e) => {
                const button = e.target.closest('.btn');
                if (button) {
                    this.handleButtonClick(e);
                }
            }, { passive: true });
            
            // Touch feedback with event delegation
            buttonsContainer.addEventListener('touchstart', (e) => {
                const button = e.target.closest('.btn');
                if (button) {
                    button.style.transform = 'scale(0.95)';
                }
            }, { passive: true });
            
            buttonsContainer.addEventListener('touchend', (e) => {
                const button = e.target.closest('.btn');
                if (button) {
                    setTimeout(() => {
                        button.style.transform = '';
                    }, 150);
                }
            }, { passive: true });
        }
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme(), { passive: true });
        
        // Keyboard support with throttling
        // Note: Cannot use passive: true because we need preventDefault()
        let keyboardThrottle = null;
        document.addEventListener('keydown', (e) => {
            if (keyboardThrottle) return;
            keyboardThrottle = setTimeout(() => {
                keyboardThrottle = null;
            }, 50);
            this.handleKeyboard(e);
        });
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Header action buttons (history, settings)
        const historyToggle = document.getElementById('historyToggle');
        const settingsToggle = document.getElementById('settingsToggle');
        if (historyToggle) {
            historyToggle.addEventListener('click', () => this.performAction('toggle-history'), { passive: true });
        }
        if (settingsToggle) {
            settingsToggle.addEventListener('click', () => this.performAction('toggle-settings'), { passive: true });
        }
    }
    
    /**
     * Handle button click events with security validation
     * @param {Event} event - Click event
     */
    handleButtonClick(event) {
        const button = event.target.closest('.btn');
        if (!button) return;
        
        const action = button.dataset.action;
        const number = button.dataset.number;
        const operator = button.dataset.operator;
        
        // Security: Validate inputs
        if (number !== undefined && !this.isValidNumber(number)) {
            console.warn('Invalid number input detected:', number);
            return;
        }
        
        if (operator !== undefined && !this.isValidOperator(operator)) {
            console.warn('Invalid operator input detected:', operator);
            return;
        }
        
        // Add visual feedback
        this.addButtonFeedback(button);
        
        if (number !== undefined) {
            this.inputNumber(number);
        } else if (operator !== undefined) {
            this.inputOperator(operator);
        } else if (action) {
            this.performAction(action);
        }
    }
    
    /**
     * Validate number input for security
     * Uses utility function for consistency
     * @param {string} number - Number to validate
     * @returns {boolean} True if valid
     */
    isValidNumber(number) {
        if (typeof CalculatorUtils !== 'undefined' && CalculatorUtils.isValidNumber) {
            return CalculatorUtils.isValidNumber(number);
        }
        // Fallback if utils not loaded
        return /^[0-9]$/.test(number);
    }
    
    /**
     * Validate operator input for security
     * Uses utility function for consistency
     * @param {string} operator - Operator to validate
     * @returns {boolean} True if valid
     */
    isValidOperator(operator) {
        if (typeof CalculatorUtils !== 'undefined' && CalculatorUtils.isValidOperator) {
            return CalculatorUtils.isValidOperator(operator);
        }
        // Fallback if utils not loaded
        return ['+', '−', '×', '÷'].includes(operator);
    }
    
    /**
     * Add visual feedback to button press
     */
    addButtonFeedback(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }
    
    /**
     * Handle keyboard input with security and accessibility
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboard(event) {
        // Only handle if calculator is focused or user is typing
        const isFocused = document.activeElement === this.display || 
                        document.activeElement.closest('.calculator-container');
        
        if (!isFocused && event.target.tagName !== 'BODY') {
            return;
        }
        
        // Prevent default only for calculator-related keys
        const calculatorKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 
                               '+', '-', '*', '/', '=', 'Enter', '.', 'Escape', 
                               'Backspace', 'Delete', '%', 'r', 'R', 's', 'S',
                               'c', 'C', 'x', 'X', 'i', 'I', 'm', 'M'];
        
        if (calculatorKeys.includes(event.key)) {
            event.preventDefault();
        }
        
        const key = event.key;
        
        // Numbers with validation
        if (key >= '0' && key <= '9') {
            // Security: Enhanced input length validation (defense-in-depth)
            const futureInput = this.waitingForOperand ? key : (this.currentInput + key);
            if (typeof CalculatorUtils !== 'undefined' && CalculatorUtils.validateInputLength) {
                if (!CalculatorUtils.validateInputLength(futureInput, this.maxDigits)) {
                    this.showError('Input too long. Maximum length exceeded.');
                    return;
                }
            }
            this.inputNumber(key);
            return;
        }
        
        // Operators with validation
        switch (key) {
            case '+':
                this.inputOperator('+');
                break;
            case '-':
                this.inputOperator('−');
                break;
            case '*':
                this.inputOperator('×');
                break;
            case '/':
                this.inputOperator('÷');
                break;
            case '=':
            case 'Enter':
                this.performAction('equals');
                break;
            case '.':
                this.performAction('decimal');
                break;
            case 'Escape':
                this.performAction('clear');
                break;
            case 'Backspace':
                this.performAction('backspace');
                break;
            case 'Delete':
                this.performAction('clear-entry');
                break;
            // Advanced operations
            case '%':
                this.performAction('percentage');
                break;
            case 'r':
            case 'R':
                // Square root (r for root)
                this.performAction('square-root');
                break;
            case 's':
            case 'S':
                // Square (s for square)
                this.performAction('square');
                break;
            case 'c':
            case 'C':
                // C for Clear (C button), Cube is handled differently
                // Only if not Ctrl/Cmd+C (which is copy)
                if (!event.ctrlKey && !event.metaKey) {
                    this.performAction('clear');
                }
                break;
            case 'i':
            case 'I':
                // Reciprocal (1/x) - 'i' for inverse
                this.performAction('reciprocal');
                break;
            // Memory functions (using Shift+key combinations)
            case 'm':
            case 'M':
                if (event.shiftKey) {
                    // Shift+M for Memory Store (MS)
                    this.performAction('memory-store');
                } else {
                    // M for Memory Recall (MR)
                    this.performAction('memory-recall');
                }
                break;
        }
        
        // Advanced operations with special keys
        // Cube (x³) - use 'x' key for cube
        if ((key === 'x' || key === 'X') && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            this.performAction('cube');
            return;
        }
        
        // Memory functions with Ctrl/Cmd modifiers
        if (event.ctrlKey || event.metaKey) {
            switch (key.toLowerCase()) {
                case 'm':
                    // Ctrl+M or Cmd+M for Memory Store (MS)
                    event.preventDefault();
                    this.performAction('memory-store');
                    break;
                case 'r':
                    // Ctrl+R or Cmd+R conflicts with browser refresh, so skip
                    break;
                case '=':
                case 'numpadadd':
                    // Ctrl+= or Ctrl+Numpad+ for Memory Add (M+)
                    event.preventDefault();
                    this.performAction('memory-add');
                    break;
                case '-':
                case 'numpadsubtract':
                    // Ctrl+- or Ctrl+Numpad- for Memory Subtract (M-)
                    event.preventDefault();
                    this.performAction('memory-subtract');
                    break;
                case '0':
                case 'numpad0':
                    // Ctrl+0 for Memory Clear (MC)
                    event.preventDefault();
                    this.performAction('memory-clear');
                    break;
            }
        }
    }
    
    /**
     * Input a number with validation and security
     * @param {string} number - Number to input (single digit)
     */
    inputNumber(number) {
        // Security: Validate and sanitize input
        if (!this.isValidNumber(number)) {
            console.warn('Invalid number input:', number);
            return;
        }
        
        // Security: Enhanced input length validation (defense-in-depth)
        const futureInput = this.waitingForOperand ? number : (this.currentInput + number);
        if (typeof CalculatorUtils !== 'undefined' && CalculatorUtils.validateInputLength) {
            if (!CalculatorUtils.validateInputLength(futureInput, this.maxDigits)) {
                this.showError('Input too long. Maximum length exceeded.');
                // Log security event in development mode
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.warn('Security: Input length exceeded maximum:', futureInput.length);
                }
                return;
            }
        }
        
        if (this.isError) {
            this.clear();
        }
        
        if (this.waitingForOperand) {
            this.currentInput = number;
            this.waitingForOperand = false;
            this.hasDecimal = false;
            this.decimalPlaces = 0;
        } else {
            if (this.currentInput === '0') {
                this.currentInput = number;
            } else if (this.getDisplayLength() < this.maxDigits) {
                this.currentInput += number;
            }
        }
        
        this.updateDisplay();
    }
    
    /**
     * Input an operator
     */
    inputOperator(operator) {
        if (this.isError) {
            return;
        }
        
        const inputValue = parseFloat(this.currentInput);
        
        if (this.previousInput === null) {
            this.previousInput = inputValue;
        } else if (this.operator) {
            const result = this.calculate();
            this.currentInput = this.formatResult(result);
            this.previousInput = result;
        } else {
            this.previousInput = inputValue;
        }
        
        this.waitingForOperand = true;
        this.operator = operator;
        this.updateOperationDisplay();
    }
    
    /**
     * Perform calculator actions
     */
    performAction(action) {
        switch (action) {
            case 'clear':
                this.clear();
                break;
            case 'clear-entry':
                this.clearEntry();
                break;
            case 'backspace':
                this.backspace();
                break;
            case 'decimal':
                this.inputDecimal();
                break;
            case 'equals':
                this.calculate();
                break;
            // Memory functions
            case 'memory-store':
                this.memoryStore();
                break;
            case 'memory-recall':
                this.memoryRecall();
                break;
            case 'memory-add':
                this.memoryAdd();
                break;
            case 'memory-subtract':
                this.memorySubtract();
                break;
            case 'memory-clear':
                this.memoryClear();
                break;
            // Advanced operations
            case 'percentage':
                this.calculatePercentage();
                break;
            case 'square-root':
                this.calculateSquareRoot();
                break;
            case 'square':
                this.calculateSquare();
                break;
            case 'cube':
                this.calculateCube();
                break;
            case 'reciprocal':
                this.calculateReciprocal();
                break;
            // UI actions
            case 'toggle-history':
                this.toggleHistory();
                break;
            case 'toggle-settings':
                this.toggleSettings();
                break;
        }
    }
    
    /**
     * Clear all calculator state
     */
    clear() {
        this.currentInput = '0';
        this.previousInput = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.isError = false;
        this.isOverflow = false;
        this.hasDecimal = false;
        this.decimalPlaces = 0;
        this.updateDisplay();
        this.updateOperationDisplay();
    }
    
    /**
     * Clear current entry
     */
    clearEntry() {
        this.currentInput = '0';
        this.hasDecimal = false;
        this.decimalPlaces = 0;
        this.updateDisplay();
    }
    
    /**
     * Handle backspace
     */
    backspace() {
        if (this.isError) {
            this.clear();
            return;
        }
        
        if (this.currentInput.length > 1) {
            const lastChar = this.currentInput.slice(-1);
            this.currentInput = this.currentInput.slice(0, -1);
            
            if (lastChar === '.') {
                this.hasDecimal = false;
                this.decimalPlaces = 0;
            } else if (this.hasDecimal) {
                this.decimalPlaces = Math.max(0, this.decimalPlaces - 1);
            }
        } else {
            this.currentInput = '0';
            this.hasDecimal = false;
            this.decimalPlaces = 0;
        }
        
        this.updateDisplay();
    }
    
    /**
     * Input decimal point
     */
    inputDecimal() {
        // Security: Enhanced input length validation (defense-in-depth)
        const futureInput = this.waitingForOperand ? '0.' : (this.currentInput + '.');
        if (typeof CalculatorUtils !== 'undefined' && CalculatorUtils.validateInputLength) {
            if (!CalculatorUtils.validateInputLength(futureInput, this.maxDigits)) {
                this.showError('Input too long. Maximum length exceeded.');
                return;
            }
        }
        
        if (this.isError) {
            this.clear();
        }
        
        if (this.waitingForOperand) {
            this.currentInput = '0.';
            this.waitingForOperand = false;
            this.hasDecimal = true;
            this.decimalPlaces = 0;
        } else if (!this.hasDecimal && this.getDisplayLength() < this.maxDigits) {
            this.currentInput += '.';
            this.hasDecimal = true;
        }
        
        this.updateDisplay();
    }
    
    /**
     * Perform calculation with enhanced error handling and performance monitoring
     * @returns {number|undefined} Calculation result or undefined if error
     */
    calculate() {
        if (this.isError || this.operator === null || this.previousInput === null) {
            return undefined;
        }
        
        const prev = this.previousInput;
        const current = parseFloat(this.currentInput);
        
        // Validate inputs
        if (isNaN(prev) || isNaN(current)) {
            this.showError('Invalid input');
            return undefined;
        }
        
        const startTime = performance.now();
        let result;
        
        try {
            switch (this.operator) {
                case '+':
                    result = prev + current;
                    break;
                case '−':
                    result = prev - current;
                    break;
                case '×':
                    result = prev * current;
                    break;
                case '÷':
                    if (current === 0) {
                        this.showError('Cannot divide by zero');
                        return undefined;
                    }
                    result = prev / current;
                    break;
                default:
                    console.warn('Unknown operator:', this.operator);
                    return undefined;
            }
            
            // Check for overflow and invalid results
            if (!isFinite(result)) {
                if (isNaN(result)) {
                    this.showError('Invalid result');
                } else {
                    this.showError('Overflow');
                }
                return undefined;
            }
            
            // Save operator for history before clearing
            const savedOperator = this.operator;
            
            // Format and update result
            this.currentInput = this.formatResult(result);
            this.previousInput = null;
            this.operator = null;
            this.waitingForOperand = true;
            this.hasDecimal = this.currentInput.includes('.');
            this.decimalPlaces = this.hasDecimal ? this.currentInput.split('.')[1].length : 0;
            
            // Add to history (using saved operator)
            const expression = this.buildExpression(prev, savedOperator, current);
            this.addToHistory(expression, result);
            
            this.updateDisplay();
            this.updateOperationDisplay();
            
            return result;
            
        } catch (error) {
            console.error('Calculation error:', error);
            this.showError('Error');
            return undefined;
        }
    }
    
    /**
     * Format calculation result
     * Uses utility function for consistency
     */
    formatResult(result) {
        if (typeof CalculatorUtils !== 'undefined' && CalculatorUtils.formatResult) {
            return CalculatorUtils.formatResult(result, this.maxDigits);
        }
        // Fallback if utils not loaded
        if (!isFinite(result)) {
            return 'Error';
        }
        
        // Handle very large or very small numbers
        if (Math.abs(result) >= Math.pow(10, this.maxDigits)) {
            return result.toExponential(6);
        }
        
        // Round to avoid floating point precision issues
        const rounded = Math.round(result * Math.pow(10, 10)) / Math.pow(10, 10);
        
        // Format as string with appropriate precision
        let formatted = rounded.toString();
        
        // Remove trailing zeros and decimal point if not needed
        if (formatted.includes('.')) {
            formatted = formatted.replace(/\.?0+$/, '');
        }
        
        // Check length and truncate if necessary
        if (formatted.length > this.maxDigits) {
            const integerPart = Math.floor(Math.abs(rounded)).toString();
            const availableDecimals = this.maxDigits - integerPart.length;
            
            if (availableDecimals > 0) {
                formatted = rounded.toFixed(availableDecimals).replace(/\.?0+$/, '');
            } else {
                formatted = Math.round(rounded).toString();
            }
        }
        
        return formatted;
    }
    
    /**
     * Show error message
     */
    showError(message) {
        this.isError = true;
        this.currentInput = message;
        this.updateDisplay();
        
        // Auto-clear error after 2 seconds
        setTimeout(() => {
            if (this.isError) {
                this.clear();
            }
        }, 2000);
    }
    
    /**
     * Get current display length
     */
    getDisplayLength() {
        return this.currentInput.replace(/\./g, '').length;
    }
    
    /**
     * Update main display with security and accessibility
     * Uses RequestAnimationFrame for smooth updates
     */
    updateDisplay() {
        // Performance: Batch display updates using RequestAnimationFrame
        if (this.pendingDisplayUpdate) {
            return; // Already scheduled
        }
        
        this.pendingDisplayUpdate = true;
        
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        this.rafId = requestAnimationFrame(() => {
            this._performDisplayUpdate();
            this.pendingDisplayUpdate = false;
            this.rafId = null;
        });
    }
    
    /**
     * Internal method to perform the actual display update
     * @private
     */
    _performDisplayUpdate() {
        // Security: Sanitize output to prevent XSS
        const sanitizedInput = this.sanitizeOutput(this.currentInput);
        
        // Use textContent instead of innerHTML for security
        this.display.textContent = sanitizedInput;
        
        // Update ARIA attributes for accessibility (update parent element)
        const displayContainer = this.display.closest('.display');
        if (displayContainer) {
            // Preserve role attribute if it exists
            const existingRole = displayContainer.getAttribute('role') || 'textbox';
            displayContainer.setAttribute('role', existingRole);
            displayContainer.setAttribute('aria-label', `Calculator display: ${sanitizedInput}`);
        }
        
        // Add error styling
        if (this.isError) {
            this.display.style.color = '#dc3545';
            this.display.style.fontWeight = '600';
            this.display.setAttribute('aria-invalid', 'true');
        } else {
            this.display.style.color = '';
            this.display.style.fontWeight = '';
            this.display.removeAttribute('aria-invalid');
        }
        
        // Announce to screen readers (debounced)
        this.debouncedAnnounceToScreenReader(sanitizedInput);
    }
    
    /**
     * Sanitize output to prevent XSS attacks
     * Uses enhanced utility function for comprehensive security
     * @param {string} value - Value to sanitize
     * @returns {string} Sanitized value
     */
    sanitizeOutput(value) {
        if (typeof CalculatorUtils !== 'undefined' && CalculatorUtils.sanitizeOutput) {
            return CalculatorUtils.sanitizeOutput(value);
        }
        // Fallback if utils not loaded (basic sanitization)
        if (typeof value !== 'string') {
            value = String(value);
        }
        // Remove any potentially dangerous characters
        return value.replace(/[<>]/g, '');
    }
    
    /**
     * Update operation display
     */
    updateOperationDisplay() {
        if (this.previousInput !== null && this.operator) {
            const prev = this.formatResult(this.previousInput);
            this.operationDisplay.textContent = `${prev} ${this.operator}`;
        } else {
            this.operationDisplay.textContent = '';
        }
    }
    
    /**
     * Debounced version of announceToScreenReader for performance
     * @param {string} message - Message to announce
     */
    debouncedAnnounceToScreenReader(message) {
        // Clear existing debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Debounce screen reader announcements to prevent spam
        this.debounceTimer = setTimeout(() => {
            this.announceToScreenReader(message);
            this.debounceTimer = null;
        }, 100);
    }
    
    /**
     * Announce changes to screen readers with security
     * @param {string} message - Message to announce
     */
    announceToScreenReader(message) {
        // Security: Sanitize message before announcing
        const sanitizedMessage = this.sanitizeOutput(message);
        
        // Remove any existing announcements to prevent accumulation
        const existingAnnouncements = document.querySelectorAll('.sr-only-announcement');
        existingAnnouncements.forEach(el => el.remove());
        
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only sr-only-announcement';
        announcement.textContent = sanitizedMessage;
        
        document.body.appendChild(announcement);
        
        // Clean up after announcement
        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.parentNode.removeChild(announcement);
            }
        }, 1000);
    }
    
    /**
     * Toggle theme with safe localStorage access
     */
    toggleTheme() {
        const themes = ['light', 'dark', 'high-contrast'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.currentTheme = themes[nextIndex];
        this.applyTheme();
        
        try {
            localStorage.setItem('calculator-theme', this.currentTheme);
        } catch (error) {
            console.warn('Failed to save theme preference:', error);
        }
    }
    
    /**
     * Apply current theme with accessibility
     */
    applyTheme() {
        // Security: Validate theme value
        const validThemes = ['light', 'dark', 'high-contrast'];
        if (!validThemes.includes(this.currentTheme)) {
            this.currentTheme = 'light';
        }
        
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Use icons for theme switching
        const themeLabels = {
            'light': { icon: '🌙', label: 'Dark' },
            'dark': { icon: '☀️', label: 'High Contrast' },
            'high-contrast': { icon: '🌙', label: 'Light' }
        };
        const themeInfo = themeLabels[this.currentTheme] || themeLabels['light'];
        this.themeIcon.textContent = themeInfo.icon;
        this.themeToggle.setAttribute('aria-label', `Switch to ${themeInfo.label.toLowerCase()} theme`);
        this.themeToggle.setAttribute('title', `Switch to ${themeInfo.label.toLowerCase()} theme`);
    }
    
    /**
     * Build expression string for history
     */
    buildExpression(prev, operator, current) {
        return `${prev} ${operator} ${current}`;
    }
    
    /**
     * Add calculation to history
     */
    addToHistory(expression, result) {
        const historyItem = {
            id: Date.now(),
            expression: expression,
            result: result,
            timestamp: new Date().toISOString(),
            formattedDate: new Date().toLocaleString()
        };
        
        this.history.unshift(historyItem);
        
        // Limit history size
        if (this.history.length > this.historyLimit) {
            this.history = this.history.slice(0, this.historyLimit);
        }
        
        // Save to sessionStorage
        this.saveHistory();
        
        // Update history UI if visible
        if (this.historyVisible) {
            this.updateHistoryDisplay();
        }
    }
    
    /**
     * Save history to sessionStorage
     */
    saveHistory() {
        try {
            sessionStorage.setItem('calculator-history', JSON.stringify(this.history));
        } catch (error) {
            console.warn('Failed to save history:', error);
        }
    }
    
    /**
     * Load history from sessionStorage
     */
    loadHistory() {
        try {
            const saved = sessionStorage.getItem('calculator-history');
            if (saved) {
                this.history = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load history:', error);
        }
    }
    
    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
        this.saveHistory();
        this.updateHistoryDisplay();
        this.announceToScreenReader('History cleared');
    }
    
    /**
     * Toggle history panel
     */
    toggleHistory() {
        this.historyVisible = !this.historyVisible;
        const panel = document.getElementById('historyPanel');
        const overlay = document.getElementById('historyOverlay');
        
        if (panel) {
            if (this.historyVisible) {
                // Opening panel: set aria-hidden to false and use inert to allow focus
                panel.classList.add('open');
                panel.setAttribute('aria-hidden', 'false');
                panel.removeAttribute('inert');
                
                // Load and update history
                this.loadHistory();
                this.updateHistoryDisplay();
            } else {
                // Closing panel: first move focus away from any element inside
                const focusedElement = panel.querySelector(':focus');
                if (focusedElement) {
                    // Move focus back to the toggle button that opened the panel
                    if (this.historyToggle) {
                        this.historyToggle.focus();
                    } else {
                        // Fallback: blur the focused element
                        focusedElement.blur();
                    }
                }
                
                // Then set aria-hidden and use inert to prevent focus
                panel.classList.remove('open');
                panel.setAttribute('aria-hidden', 'true');
                panel.setAttribute('inert', '');
            }
        }
        
        if (overlay) {
            if (this.historyVisible) {
                overlay.classList.add('active');
                overlay.setAttribute('aria-hidden', 'false');
                overlay.removeAttribute('inert');
            } else {
                overlay.classList.remove('active');
                overlay.setAttribute('aria-hidden', 'true');
                overlay.setAttribute('inert', '');
            }
        }
    }
    
    /**
     * Update history display with performance optimization
     * Uses DocumentFragment for batch DOM updates
     */
    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        // Performance: Use DocumentFragment for batch DOM updates
        const fragment = document.createDocumentFragment();
        
        if (this.history.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'history-empty';
            empty.textContent = 'No calculations yet';
            fragment.appendChild(empty);
        } else {
            // Performance: Limit visible items for large history (virtual scrolling preparation)
            // Note: Current implementation shows first 50 items. For history lists exceeding 100 items,
            // consider implementing virtual scrolling to improve performance. Virtual scrolling would
            // only render visible items in the viewport, significantly reducing DOM nodes and memory usage.
            // Implementation would use techniques like: calculate visible range, render only visible items,
            // adjust scroll position, and handle dynamic item heights. Libraries like react-window patterns
            // or vanilla JS implementations can be used. Threshold: Consider virtual scrolling when
            // history limit exceeds 100 items.
            const visibleItems = this.history.slice(0, 50); // Show first 50 items
            
            visibleItems.forEach(item => {
                const listItem = document.createElement('div');
                listItem.className = 'history-item';
                listItem.setAttribute('role', 'button');
                listItem.setAttribute('tabindex', '0');
                listItem.setAttribute('aria-label', `Calculation: ${item.expression} equals ${item.result}`);
                
                // Security: Use textContent for sanitized output
                const expressionDiv = document.createElement('div');
                expressionDiv.className = 'history-expression';
                expressionDiv.textContent = this.sanitizeOutput(item.expression);
                
                const resultDiv = document.createElement('div');
                resultDiv.className = 'history-result';
                resultDiv.textContent = this.sanitizeOutput(item.result);
                
                // Store result as data attribute for event delegation
                listItem.setAttribute('data-result', this.sanitizeOutput(item.result));
                
                listItem.appendChild(expressionDiv);
                listItem.appendChild(resultDiv);
                
                fragment.appendChild(listItem);
            });
        }
        
        // Single DOM update
        historyList.innerHTML = '';
        historyList.appendChild(fragment);
        
        // Performance: Use event delegation for history items (single listener instead of many)
        // Remove existing listeners if any (cleanup)
        if (this.historyClickHandler) {
            historyList.removeEventListener('click', this.historyClickHandler);
        }
        if (this.historyKeydownHandler) {
            historyList.removeEventListener('keydown', this.historyKeydownHandler);
        }
        
        // Single click listener for all history items (event delegation)
        this.historyClickHandler = (e) => {
            const item = e.target.closest('.history-item');
            if (item) {
                const result = item.getAttribute('data-result');
                if (result) {
                    this.useHistoryItem(result);
                }
            }
        };
        historyList.addEventListener('click', this.historyClickHandler, { passive: true });
        
        // Single keydown listener for all history items (event delegation)
        this.historyKeydownHandler = (e) => {
            if (e.target.classList.contains('history-item')) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const result = e.target.getAttribute('data-result');
                    if (result) {
                        this.useHistoryItem(result);
                    }
                }
            }
        };
        historyList.addEventListener('keydown', this.historyKeydownHandler);
    }
    
    /**
     * Use history item as input
     */
    useHistoryItem(value) {
        this.currentInput = String(value);
        this.waitingForOperand = false;
        this.isError = false;
        this.updateDisplay();
        this.announceToScreenReader(`Using result: ${value}`);
    }
    
    /**
     * Memory Store (MS)
     */
    memoryStore() {
        const value = parseFloat(this.currentInput);
        if (!isNaN(value)) {
            this.memory = value;
            this.memoryActive = true;
            this.updateMemoryIndicator();
            this.announceToScreenReader(`Memory stored: ${value}`);
        }
    }
    
    /**
     * Memory Recall (MR)
     */
    memoryRecall() {
        if (this.memoryActive) {
            this.currentInput = this.formatResult(this.memory);
            this.waitingForOperand = false;
            this.isError = false;
            this.updateDisplay();
            this.announceToScreenReader(`Memory recalled: ${this.memory}`);
        }
    }
    
    /**
     * Memory Add (M+)
     */
    memoryAdd() {
        const value = parseFloat(this.currentInput);
        if (!isNaN(value)) {
            this.memory += value;
            this.memoryActive = true;
            this.updateMemoryIndicator();
            this.announceToScreenReader(`Added to memory: ${value}`);
        }
    }
    
    /**
     * Memory Subtract (M-)
     */
    memorySubtract() {
        const value = parseFloat(this.currentInput);
        if (!isNaN(value)) {
            this.memory -= value;
            this.memoryActive = true;
            this.updateMemoryIndicator();
            this.announceToScreenReader(`Subtracted from memory: ${value}`);
        }
    }
    
    /**
     * Memory Clear (MC)
     */
    memoryClear() {
        this.memory = 0;
        this.memoryActive = false;
        this.updateMemoryIndicator();
        this.announceToScreenReader('Memory cleared');
    }
    
    /**
     * Update memory indicator
     */
    updateMemoryIndicator() {
        const indicator = document.getElementById('memoryIndicator');
        if (indicator) {
            indicator.classList.toggle('active', this.memoryActive);
            indicator.setAttribute('aria-label', this.memoryActive ? `Memory: ${this.memory}` : 'No memory stored');
        }
    }
    
    /**
     * Calculate percentage
     */
    calculatePercentage() {
        const value = parseFloat(this.currentInput);
        if (!isNaN(value)) {
            const result = value / 100;
            this.currentInput = this.formatResult(result);
            this.waitingForOperand = true;
            this.updateDisplay();
            this.announceToScreenReader(`Percentage: ${this.currentInput}`);
        }
    }
    
    /**
     * Calculate square root
     */
    calculateSquareRoot() {
        const value = parseFloat(this.currentInput);
        if (!isNaN(value) && value >= 0) {
            const result = Math.sqrt(value);
            this.currentInput = this.formatResult(result);
            this.waitingForOperand = true;
            this.updateDisplay();
            this.announceToScreenReader(`Square root: ${this.currentInput}`);
        } else if (value < 0) {
            this.showError('Invalid input');
        }
    }
    
    /**
     * Calculate square
     */
    calculateSquare() {
        const value = parseFloat(this.currentInput);
        if (!isNaN(value)) {
            const result = value * value;
            this.currentInput = this.formatResult(result);
            this.waitingForOperand = true;
            this.updateDisplay();
            this.announceToScreenReader(`Square: ${this.currentInput}`);
        }
    }
    
    /**
     * Calculate cube
     */
    calculateCube() {
        const value = parseFloat(this.currentInput);
        if (!isNaN(value)) {
            const result = value * value * value;
            this.currentInput = this.formatResult(result);
            this.waitingForOperand = true;
            this.updateDisplay();
            this.announceToScreenReader(`Cube: ${this.currentInput}`);
        }
    }
    
    /**
     * Calculate reciprocal (1/x)
     */
    calculateReciprocal() {
        const value = parseFloat(this.currentInput);
        if (!isNaN(value) && value !== 0) {
            const result = 1 / value;
            this.currentInput = this.formatResult(result);
            this.waitingForOperand = true;
            this.updateDisplay();
            this.announceToScreenReader(`Reciprocal: ${this.currentInput}`);
        } else if (value === 0) {
            this.showError('Cannot divide by zero');
        }
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('calculator-settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
        
        // Apply settings
        this.maxDigits = this.settings.precision;
        this.historyLimit = this.settings.historyLimit;
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('calculator-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }
    
    /**
     * Toggle settings panel
     */
    toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        if (panel) {
            const isOpen = panel.classList.contains('open');
            const willBeOpen = !isOpen;
            
            if (willBeOpen) {
                // Opening panel: set aria-hidden to false and use inert to allow focus
                panel.classList.add('open');
                panel.setAttribute('aria-hidden', 'false');
                panel.removeAttribute('inert');
                
                // Render settings
                this.renderSettings();
            } else {
                // Closing panel: first move focus away from any element inside
                const focusedElement = panel.querySelector(':focus');
                if (focusedElement) {
                    // Move focus back to the toggle button that opened the panel
                    if (this.settingsToggle) {
                        this.settingsToggle.focus();
                    } else {
                        // Fallback: blur the focused element
                        focusedElement.blur();
                    }
                }
                
                // Then set aria-hidden and use inert to prevent focus
                panel.classList.remove('open');
                panel.setAttribute('aria-hidden', 'true');
                panel.setAttribute('inert', '');
            }
            
            const overlay = document.getElementById('settingsOverlay');
            if (overlay) {
                if (willBeOpen) {
                    overlay.setAttribute('aria-hidden', 'false');
                    overlay.removeAttribute('inert');
                } else {
                    overlay.setAttribute('aria-hidden', 'true');
                    overlay.setAttribute('inert', '');
                }
            }
        }
    }
    
    /**
     * Render settings panel
     */
    renderSettings() {
        const settingsContent = document.getElementById('settingsContent');
        if (!settingsContent) return;
        
        settingsContent.innerHTML = `
            <div class="settings-header">
                <h2 class="settings-title">Settings</h2>
                <button class="settings-close" id="settingsClose" aria-label="Close settings">×</button>
            </div>
            <div class="settings-group">
                <div class="settings-group-title">Theme</div>
                <div class="settings-option">
                    <label class="settings-option-label">Theme</label>
                    <select class="settings-select" id="themeSelect">
                        <option value="light" ${this.currentTheme === 'light' ? 'selected' : ''}>Light</option>
                        <option value="dark" ${this.currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
                        <option value="high-contrast" ${this.currentTheme === 'high-contrast' ? 'selected' : ''}>High Contrast</option>
                    </select>
                </div>
            </div>
            <div class="settings-group">
                <div class="settings-group-title">Preferences</div>
                <div class="settings-option">
                    <label class="settings-option-label">Precision (digits)</label>
                    <select class="settings-select" id="precisionSelect">
                        <option value="8" ${this.settings.precision === 8 ? 'selected' : ''}>8</option>
                        <option value="10" ${this.settings.precision === 10 ? 'selected' : ''}>10</option>
                        <option value="12" ${this.settings.precision === 12 ? 'selected' : ''}>12</option>
                        <option value="15" ${this.settings.precision === 15 ? 'selected' : ''}>15</option>
                    </select>
                </div>
                <div class="settings-option">
                    <label class="settings-option-label">History Limit</label>
                    <select class="settings-select" id="historyLimitSelect">
                        <option value="25" ${this.settings.historyLimit === 25 ? 'selected' : ''}>25</option>
                        <option value="50" ${this.settings.historyLimit === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${this.settings.historyLimit === 100 ? 'selected' : ''}>100</option>
                    </select>
                </div>
            </div>
        `;
        
        // Bind settings event listeners
        const themeSelect = document.getElementById('themeSelect');
        const precisionSelect = document.getElementById('precisionSelect');
        const historyLimitSelect = document.getElementById('historyLimitSelect');
        const settingsClose = document.getElementById('settingsClose');
        
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.currentTheme = e.target.value;
                this.applyTheme();
                this.saveSettings();
            });
        }
        
        if (precisionSelect) {
            precisionSelect.addEventListener('change', (e) => {
                this.settings.precision = parseInt(e.target.value);
                this.maxDigits = this.settings.precision;
                this.saveSettings();
            });
        }
        
        if (historyLimitSelect) {
            historyLimitSelect.addEventListener('change', (e) => {
                this.settings.historyLimit = parseInt(e.target.value);
                this.historyLimit = this.settings.historyLimit;
                if (this.history.length > this.historyLimit) {
                    this.history = this.history.slice(0, this.historyLimit);
                }
                this.saveSettings();
            });
        }
        
        if (settingsClose) {
            settingsClose.addEventListener('click', () => this.toggleSettings());
        }
    }
    
    /**
     * Setup keyboard support
     */
    setupKeyboardSupport() {
        // Focus management
        this.display.addEventListener('focus', () => {
            this.display.style.outline = '2px solid var(--btn-operator-bg)';
        });
        
        this.display.addEventListener('blur', () => {
            this.display.style.outline = '';
        });
        
        // Make display focusable
        this.display.setAttribute('tabindex', '0');
    }
}

// Screen reader only class for accessibility
const style = document.createElement('style');
style.textContent = `
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
`;
document.head.appendChild(style);

// Core Web Vitals Monitoring
// Only logs warnings when metrics exceed thresholds
// Set window.PERFORMANCE_VERBOSE = true to enable verbose logging
const PERFORMANCE_VERBOSE = window.PERFORMANCE_VERBOSE === true;

if ('PerformanceObserver' in window) {
    // Monitor Largest Contentful Paint (LCP)
    try {
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry && lastEntry.renderTime) {
                const lcp = lastEntry.renderTime;
                // Only log if above threshold or verbose mode enabled
                if (lcp > 2500) {
                    console.warn('LCP (Largest Contentful Paint) exceeds target:', lcp.toFixed(2), 'ms (target: < 2500ms)');
                } else if (PERFORMANCE_VERBOSE) {
                    console.log('LCP (Largest Contentful Paint):', lcp.toFixed(2), 'ms');
                }
            }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
        // Silently fail - monitoring not critical
    }
    
    // Monitor Interaction to Next Paint (INP)
    try {
        let inpWarningCount = 0;
        const MAX_INP_WARNINGS = 5; // Limit warnings to prevent spam
        const inpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration && entry.duration > 200) {
                    // Only log first few warnings to avoid console spam
                    if (inpWarningCount < MAX_INP_WARNINGS) {
                        console.warn('INP (Interaction to Next Paint) exceeds target:', entry.duration.toFixed(2), 'ms (target: < 200ms)');
                        inpWarningCount++;
                    } else if (inpWarningCount === MAX_INP_WARNINGS) {
                        // Log once that we're suppressing further warnings
                        console.warn('INP warnings suppressed (exceeded limit). Enable verbose mode with window.PERFORMANCE_VERBOSE = true');
                        inpWarningCount++;
                    }
                    // In verbose mode, always log
                    if (window.PERFORMANCE_VERBOSE) {
                        console.warn('INP (Interaction to Next Paint):', entry.duration.toFixed(2), 'ms');
                    }
                }
            }
        });
        inpObserver.observe({ entryTypes: ['event'] });
    } catch (e) {
        // Silently fail - monitoring not critical
    }
    
    // Monitor Cumulative Layout Shift (CLS)
    try {
        // Suppress CLS warnings on test pages (they have dynamic content that causes expected layout shifts)
        const isTestPage = window.location.pathname.includes('tests.html') || 
                           window.location.pathname.includes('test');
        
        let clsValue = 0;
        let clsWarningCount = 0;
        const MAX_CLS_WARNINGS = 3; // Limit warnings to prevent spam
        
        const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            // Only log if above threshold and not on test page
            if (clsValue > 0.1 && !isTestPage) {
                // Only log first few warnings to avoid console spam
                if (clsWarningCount < MAX_CLS_WARNINGS) {
                    console.warn('CLS (Cumulative Layout Shift) exceeds target:', clsValue.toFixed(4), '(target: < 0.1)');
                    clsWarningCount++;
                } else if (clsWarningCount === MAX_CLS_WARNINGS) {
                    // Log once that we're suppressing further warnings
                    console.warn('CLS warnings suppressed (exceeded limit). Enable verbose mode with window.PERFORMANCE_VERBOSE = true');
                    clsWarningCount++;
                }
                // In verbose mode, always log
                if (window.PERFORMANCE_VERBOSE) {
                    console.warn('CLS (Cumulative Layout Shift):', clsValue.toFixed(4));
                }
            } else if (window.PERFORMANCE_VERBOSE && !isTestPage) {
                console.log('CLS (Cumulative Layout Shift):', clsValue.toFixed(4));
            }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
        // Silently fail - monitoring not critical
    }
}

// Monitor First Contentful Paint (FCP)
if ('PerformanceObserver' in window) {
    try {
        const fcpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    const fcp = entry.startTime;
                    // Only log if above threshold
                    if (fcp > 1800) {
                        console.warn('FCP (First Contentful Paint) exceeds target:', fcp.toFixed(2), 'ms (target: < 1800ms)');
                    } else if (PERFORMANCE_VERBOSE) {
                        console.log('FCP (First Contentful Paint):', fcp.toFixed(2), 'ms');
                    }
                }
            }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
        // Silently fail - monitoring not critical
    }
}

// Initialize calculator when DOM is loaded
// Note: Calculator is initialized in index.html to expose it globally for event handlers

// Service Worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                // Service worker registered successfully
                // Only log errors, not successful registration
            })
            .catch(registrationError => {
                // Only log registration failures
                console.warn('Service Worker registration failed:', registrationError);
            });
    });
}
