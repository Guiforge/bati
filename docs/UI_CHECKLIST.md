# UI/UX Design Checklist

> Best practices and checklists for UI components and flows, adapted from [Checklist Design](https://www.checklist.design/).

This document serves as a reference for ensuring high-quality, consistent, and user-friendly UI implementation in the Bati project.

---

## 🧩 Components

### Button

*A fundamental component for enabling user actions.*

- **Base Style**: Define a default style (fill, outline, or underline) to maintain consistency.
- **Shape**: Standardize visual properties: padding, border, border radius, and shadow.
- **Variants**: Create distinct visual types to represent hierarchy (e.g., Primary vs. Secondary buttons).
- **Copy**: Use clear, instructional text. Users should know exactly what happens *before* they click.
  - *Tip*: Generic copy like 'Okay' or 'Cancel' is acceptable only if the context (title/label) is clear.
- **States**: Define visual changes for all interaction states: `default`, `hover` (if applicable), `focused`, `pressed`, and `disabled`.

### Input Field

*Essential for forms and data collection.*

- **Input Field**: Ensure the text size is readable on all devices (min 16px to avoid zoom on iOS).
- **Label**: Clearly state what information is required. Avoid all-caps for better readability.
- **Placeholder Text**: Use as an example of expected input.
  - *Note*: Text color must be notably lighter than user input so it's not mistaken for filled data.
- **Data Format**: Restrict input to relevant values (e.g., numeric keyboard for phone numbers).
- **Illustration/Icon**: Use visual cues to break up long lists of fields or clarify intent.
- **Hint**: Provide elaboration or help text for complex fields where a label isn't enough.

### Card

*A modular container for grouping related information.*

- **Style**: Define default background, border, and shadow properties.
- **Consistency**: Maintain one base style for all cards across the app.
- **Spacing**: Use a consistent spacing framework (e.g., multiples of 4px or 8px) for padding.
- **Responsiveness**: Design for content structure across various screen sizes.
  - *Mobile*: Adopt a 'top-down' approach to avoid overfilling rows.
- **Content Hierarchy**: Prioritize the primary action.
  - *Tip*: Place links or actions at the bottom so users consume content before deciding.

---

## 🎨 Topics

### Dark Mode

*Ensuring a comfortable viewing experience in low-light environments.*

- **Aligned Colors**: Set up a system of semantic color variables that invert logically between modes.
- **Brand Integrity**: Maintain brand identity using primary, non-neutral colors that work in both modes.
- **Elevation**: Use lighter surfaces or borders to express elevation, as shadows are less effective in dark mode.
- **Switching**: Respect system settings by default, but allow a manual override in settings.

---

## 🌊 Flows (General Principles)

- **Feedback**: Always provide immediate feedback for user actions (loading states, success messages, error toasts).
- **Validation**: Validate input as early as possible (e.g., on blur) rather than only on submit.
- **Navigation**: Ensure users can easily go back or cancel a flow without losing data if possible.
- **Empty States**: Design helpful empty states that guide users on how to get started.

---

*For more checklists and details, visit [Checklist Design](https://www.checklist.design/).*
