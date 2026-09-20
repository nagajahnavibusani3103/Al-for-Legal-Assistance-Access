# LexiLens Accessibility (a11y) & WCAG 2.1 AA Compliance Guide

LexiLens is engineered to ensure legal information is accessible to everyone, including individuals with low vision, motor impairments, or cognitive disabilities, adhering strictly to **WCAG 2.1 AA** standards.

---

## 1. Semantic HTML & Landmark Structure

- **Landmark Regions:** All pages are structured using semantic HTML5 landmarks:
  - `<header>`: Contains primary navigation, user profile, and persistent legal disclaimer banner.
  - `<nav>`: Breadcrumbs and document workspace navigation tabs.
  - `<main id="main-content">`: Main document view, analysis panels, and interactive chat interface.
  - `<section>`: Clearly demarcated content modules (Executive Summary, Attention Areas, Obligations Tracker).
  - `<aside>`: Auxiliary document metadata and lawyer preparation drawer.
- **Heading Hierarchy:** Headings follow a strict logical hierarchy (`<h1>` for document title, `<h2>` for primary panels, `<h3>` for individual clauses and sections) without skipping levels.

---

## 2. Keyboard Navigation & Focus Management

- **Full Keyboard Operability:** Every interactive element (buttons, tabs, inputs, modal triggers, checklist toggles) is fully operable via standard keyboard controls (`Tab`, `Shift+Tab`, `Enter`, `Space`).
- **Visible Focus Indicators:** All focusable controls feature prominent, high-contrast focus rings:
  `focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`
- **Modal Focus Management:**
  - When a modal opens (e.g. `UploadModal`, `AuthModal`), focus is automatically directed to the primary input.
  - Pressing the `Escape` key immediately closes open modals.
  - Focus is trapped within modal dialogs to prevent keyboard navigation to obscured background elements.

---

## 3. Screen Reader Accommodations (ARIA)

- **Live Regions (`aria-live`):**
  - Document upload and ingestion progress indicators declare `role="status"` and `aria-live="polite"`, ensuring screen readers announce stage transitions (*"Parsing text..."*, *"Generating embeddings..."*, *"Document ready"*) without interrupting the user.
  - AI chat responses stream updates into an `aria-live="polite"` container.
- **Dialogs & Overlays:**
  - Modals declare `role="dialog"`, `aria-modal="true"`, and are labeled by `aria-labelledby` referencing the dialog title.
- **Icon Accessibility:**
  - Decorative Lucide icons are marked with `aria-hidden="true"`.
  - Icon-only action buttons (e.g. close buttons, copy citation buttons) declare explicit `aria-label` attributes.
- **Collapsible Elements:**
  - Accordion panels and dropdown drawers include `aria-expanded="true|false"` and `aria-controls`.

---

## 4. Color Contrast & Multi-Sensory Design

- **Contrast Ratios:** Text across light and dark modes maintains at least a **4.5:1** contrast ratio against backgrounds (and at least **3:1** for large text and UI components).
- **Non-Color Dependent Indicators:**
  - Risk and severity badges (e.g. *Critical*, *Attention*, *Informational*) do not rely on color alone. Each badge incorporates distinct typography, textual labels, and unique iconography (e.g. `AlertTriangle`, `Info`, `CheckCircle`).
- **Touch Target Sizing:** Interactive buttons and touch targets meet the minimum WCAG 2.1 AAA recommendation of at least 44x44 CSS pixels.
