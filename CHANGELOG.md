# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2024-12-19

### Fixed

- Fixed operator selection bug where changing operator before entering a second number would incorrectly trigger a calculation. Now the operator is simply updated when changed before entering a new operand, and calculation only occurs when an operator is changed after a second number has been entered.
- Fixed duplicate "Theme" label appearing in settings modal. Removed redundant label element and properly associated the theme select dropdown with the group title using `aria-labelledby` for accessibility.
- Fixed high-contrast theme toggle icon to use a proper contrast symbol (SVG icon with split circle and radiating rays) instead of the moon emoji, making it more recognizable and appropriate for the high-contrast/accessibility theme option.
- Fixed layout shift in Casio theme when operation display appears/disappears by ensuring consistent space reservation using opacity transitions and pseudo-element placeholders.

### Added

- Added new "Casio" theme featuring ultra-realistic calculator appearance inspired by Casio DH-12 desktop calculator. The theme includes:
  - Dark charcoal gray matte finish casing with subtle gradients
  - Light blue-green LCD display background with scanline effect
  - Dark gray buttons with white text and 3D raised appearance
  - Orange/amber clear button matching classic calculator design
  - Realistic shadows and bevels for depth and tactile appearance
  - Maintains all calculator functionality, responsive design, and accessibility features
- Added new "TI SR-56 Vintage" theme featuring ultra-realistic vintage calculator appearance inspired by Texas Instruments SR-56 programmable calculator. The theme includes:
  - Deep matte black casing with vintage aesthetic
  - Bright red LED display with authentic glow effect and scanlines
  - Black buttons with white text and concave/dished surface appearance
  - Yellow/gold clear buttons matching original design
  - Metallic gold trim accents around calculator
  - Realistic shadows and depth effects for authentic retro-futuristic look
  - Maintains all calculator functionality, responsive design, and accessibility features
- Added test case for operator change behavior to verify correct functionality when operators are changed before entering a second number.
- Added test case for operator change after entering second number to ensure calculation still works correctly in that scenario.

## [1.0.0] - Initial Release

### Added

- Initial release of the Enterprise Edition calculator
- 8-15-digit precision with overflow protection (configurable: 8, 10, 12, 15 digits)
- Basic arithmetic operations: Addition, Subtraction, Multiplication, Division
- Advanced operations: Percentage (%), Square Root (√), Square (x²), Cube (x³), Reciprocal (1/x)
- Memory functions: Memory Store (MS), Memory Recall (MR), Memory Add (M+), Memory Subtract (M-), Memory Clear (MC)
- Calculation history with sessionStorage persistence
- Settings panel for customizing precision, theme, and history limit
- Theme switching: Light, Dark, and High Contrast modes
- Comprehensive accessibility support (WCAG 2.2 compliance)
- Keyboard support with shortcuts
- Mobile-first responsive design
- Security hardening (XSS prevention, input validation)
- Performance optimizations
- Comprehensive error handling
- Test suite with automated testing

[Unreleased]: https://github.com/yourusername/demo-vanilla-calculator/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/yourusername/demo-vanilla-calculator/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/yourusername/demo-vanilla-calculator/releases/tag/v1.0.0
