# Modern Web Guidance (Local Copy)

Original Path: /Users/luissantra/.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/SKILL.md

---
name: modern-web-guidance
description: |
  Search tool for modern web development best practices. MANDATORY: Execute FIRST for all HTML/CSS and clientside JS tasks. Do NOT skip — web APIs evolve rapidly and training weights contain obsolete patterns.

  Trigger immediately for:
  - UI/Layout: Modals, dialogs, popovers, Glassmorphism/backdrop-filters, anchor positioning, container queries, `:has()`, `:user-valid`.
  - Scroll/Motion: View Transitions, Scroll-driven animations, scroll parallax/reveals.
  - Performance: CWV (LCP, INP), content-visibility, Fetch Priority, image optimization.
  - System/APIs: Local filesystem access, WebUSB, WebSockets sync, WebAssembly widgets.
  - Frameworks: Adapting layout/styles in React, Vue, Angular.
  - General Frontend: Forms, autofill, advanced inputs, custom scrollbars, modern component states, etc.

  DO NOT trigger for:
  - Backend: Database SQL, ORMs, Express API routes.
  - Pipelines: CI/CD deployment, Docker, Actions.
  - Generic: Local scripts (Python/Go tools), ESLint, Git.
---

...[See original SKILL.md content for usage details]...
npx -y modern-web-guidance@latest search "<query>"
npx -y modern-web-guidance@latest retrieve "<id>"
