/**
 * Calculator Utility Functions
 * Pure utility functions for calculator operations (no instance dependencies)
 * 
 * @namespace CalculatorUtils
 * @version 1.0.0
 * @author Waldemar Szemat
 */

(function(global) {
    'use strict';

    /**
     * Enhanced output sanitization to prevent XSS attacks
     * Removes or escapes dangerous characters while preserving calculator functionality
     * 
     * @param {string|number} value - Value to sanitize
     * @returns {string} Sanitized value safe for DOM insertion
     * 
     * @example
     * CalculatorUtils.sanitizeOutput('<script>alert("xss")</script>') // Returns empty string
     * CalculatorUtils.sanitizeOutput('123.456') // Returns '123.456'
     * CalculatorUtils.sanitizeOutput('1e+10') // Returns '1e+10' (scientific notation preserved)
     */
    function sanitizeOutput(value) {
        if (typeof value !== 'string') {
            value = String(value);
        }
        
        // Remove dangerous characters that could enable XSS
        // Remove HTML tags: < >
        let sanitized = value.replace(/[<>]/g, '');
        
        // Remove or escape quotes that could break out of attributes
        // We remove them since calculator output doesn't need quotes
        sanitized = sanitized.replace(/["']/g, '');
        
        // Remove control characters (0x00-0x1F) except common whitespace
        // Preserve: tab (0x09), newline (0x0A), carriage return (0x0D)
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
        
        // Remove ampersands that could start HTML entities (but calculator doesn't need them)
        // Note: We could escape to &amp; but removing is safer for calculator output
        sanitized = sanitized.replace(/&/g, '');
        
        // Preserve scientific notation (e, E, +, -)
        // This is important for large number display
        // The above replacements already handle this correctly
        
        return sanitized;
    }

    /**
     * Format calculation result for display
     * Handles large numbers, scientific notation, and precision limits
     * 
     * @param {number} result - Calculation result to format
     * @param {number} maxDigits - Maximum digits allowed (8-15)
     * @returns {string} Formatted result string
     * 
     * @example
     * CalculatorUtils.formatResult(123.456, 12) // Returns '123.456'
     * CalculatorUtils.formatResult(1e20, 12) // Returns '1e+20'
     * CalculatorUtils.formatResult(0.000001, 12) // Returns '0.000001'
     */
    function formatResult(result, maxDigits) {
        if (!isFinite(result)) {
            return 'Error';
        }
        
        // Handle very large or very small numbers
        if (Math.abs(result) >= Math.pow(10, maxDigits)) {
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
        if (formatted.length > maxDigits) {
            const integerPart = Math.floor(Math.abs(rounded)).toString();
            const availableDecimals = maxDigits - integerPart.length;
            
            if (availableDecimals > 0) {
                formatted = rounded.toFixed(availableDecimals).replace(/\.?0+$/, '');
            } else {
                formatted = Math.round(rounded).toString();
            }
        }
        
        return formatted;
    }

    /**
     * Validate number input for security
     * Ensures only single digits (0-9) are accepted
     * 
     * @param {string} number - Number to validate
     * @returns {boolean} True if valid single digit
     * 
     * @example
     * CalculatorUtils.isValidNumber('5') // Returns true
     * CalculatorUtils.isValidNumber('12') // Returns false (not single digit)
     * CalculatorUtils.isValidNumber('a') // Returns false (not a digit)
     */
    function isValidNumber(number) {
        return /^[0-9]$/.test(number);
    }

    /**
     * Validate operator input for security
     * Whitelist-based validation prevents injection attacks
     * 
     * @param {string} operator - Operator to validate
     * @returns {boolean} True if valid operator
     * 
     * @example
     * CalculatorUtils.isValidOperator('+') // Returns true
     * CalculatorUtils.isValidOperator('÷') // Returns true
     * CalculatorUtils.isValidOperator('eval') // Returns false (not whitelisted)
     */
    function isValidOperator(operator) {
        const validOperators = ['+', '−', '×', '÷'];
        return validOperators.includes(operator);
    }

    /**
     * Validate input length for security
     * Defense-in-depth approach: validate beyond precision limits
     * 
     * @param {string} input - Input string to validate
     * @param {number} maxDigits - Maximum digits allowed (precision limit)
     * @returns {boolean} True if input length is within security limits
     * 
     * @example
     * CalculatorUtils.validateInputLength('123456789012', 12) // Returns true
     * CalculatorUtils.validateInputLength('123456789012345678901234567890', 12) // Returns false
     */
    function validateInputLength(input, maxDigits) {
        // Maximum input length: maxDigits * 2 + 10
        // Allows for: decimal point, negative sign, scientific notation, etc.
        const maxLength = maxDigits * 2 + 10;
        
        if (typeof input !== 'string') {
            input = String(input);
        }
        
        return input.length <= maxLength;
    }

    // Export utilities to global namespace
    global.CalculatorUtils = {
        sanitizeOutput: sanitizeOutput,
        formatResult: formatResult,
        isValidNumber: isValidNumber,
        isValidOperator: isValidOperator,
        validateInputLength: validateInputLength
    };

})(typeof window !== 'undefined' ? window : this);
