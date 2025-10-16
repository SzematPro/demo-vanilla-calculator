/**
 * Professional Calculator Engine
 * Enterprise-grade calculator with 12-digit precision, error handling, and accessibility
 * 
 * Features:
 * - 12-digit maximum input/output
 * - Keyboard and touch support
 * - Error handling and validation
 * - Theme switching
 * - WCAG 2.2 compliance
 * - Mobile-first responsive design
 */

class Calculator {
    constructor() {
        this.display = document.getElementById('displayText');
        this.operationDisplay = document.getElementById('operationDisplay');
        this.themeToggle = document.getElementById('themeToggle');
        this.themeIcon = document.getElementById('themeIcon');
        
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
        
        // Theme management
        this.currentTheme = localStorage.getItem('calculator-theme') || 'light';
        
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
     * Bind all event listeners
     */
    bindEvents() {
        // Button clicks
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', (e) => this.handleButtonClick(e));
        });
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Keyboard support
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Touch feedback
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('touchstart', (e) => {
                e.target.style.transform = 'scale(0.95)';
            });
            
            button.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 150);
            });
        });
    }
    
    /**
     * Handle button click events
     */
    handleButtonClick(event) {
        const button = event.target;
        const action = button.dataset.action;
        const number = button.dataset.number;
        const operator = button.dataset.operator;
        
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
     * Add visual feedback to button press
     */
    addButtonFeedback(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }
    
    /**
     * Handle keyboard input
     */
    handleKeyboard(event) {
        event.preventDefault();
        
        const key = event.key;
        const keyCode = event.keyCode;
        
        // Numbers
        if (key >= '0' && key <= '9') {
            this.inputNumber(key);
            return;
        }
        
        // Operators
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
            case 'Delete':
                this.performAction('backspace');
                break;
        }
        
        // Special keys
        if (keyCode === 8) { // Backspace
            this.performAction('backspace');
        } else if (keyCode === 46) { // Delete
            this.performAction('clear-entry');
        }
    }
    
    /**
     * Input a number
     */
    inputNumber(number) {
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
     * Perform calculation
     */
    calculate() {
        if (this.isError || this.operator === null || this.previousInput === null) {
            return;
        }
        
        const prev = this.previousInput;
        const current = parseFloat(this.currentInput);
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
                        return;
                    }
                    result = prev / current;
                    break;
                default:
                    return;
            }
            
            // Check for overflow
            if (!isFinite(result)) {
                this.showError('Overflow');
                return;
            }
            
            this.currentInput = this.formatResult(result);
            this.previousInput = null;
            this.operator = null;
            this.waitingForOperand = true;
            this.hasDecimal = this.currentInput.includes('.');
            this.decimalPlaces = this.hasDecimal ? this.currentInput.split('.')[1].length : 0;
            
            this.updateDisplay();
            this.updateOperationDisplay();
            
        } catch (error) {
            this.showError('Error');
        }
    }
    
    /**
     * Format calculation result
     */
    formatResult(result) {
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
     * Update main display
     */
    updateDisplay() {
        this.display.textContent = this.currentInput;
        
        // Add error styling
        if (this.isError) {
            this.display.style.color = '#dc3545';
            this.display.style.fontWeight = '600';
        } else {
            this.display.style.color = '';
            this.display.style.fontWeight = '';
        }
        
        // Announce to screen readers
        this.announceToScreenReader(this.currentInput);
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
     * Announce changes to screen readers
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    /**
     * Toggle theme
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('calculator-theme', this.currentTheme);
    }
    
    /**
     * Apply current theme
     */
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.themeIcon.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
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

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Calculator();
});

// Service Worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
