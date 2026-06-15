<!-- Sync Impact Report
  Version change: (none) → 1.0.0 (initial creation)
  Modified principles: N/A (initial creation)
  Added sections:
    - Core Principles (6 principles)
    - Technology Constraints
    - Review & Escalation Protocol
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/spec-template.md ✅ updated (provenance added to requirements)
    - .specify/templates/plan-template.md ✅ no changes needed (Constitution Check is dynamic)
    - .specify/templates/tasks-template.md ✅ no changes needed (MVP-first approach already present)
    - .specify/templates/checklist-template.md ✅ no changes needed (generic template)
  Follow-up TODOs: None
-->

# Senate RPG Constitution

## Core Principles

### I. Human-Agent Boundary

Humans decide WHAT to build and WHY at specification altitude.
Agents own HOW: implementation choices, file layout, naming
conventions, and all tactical decisions below the spec line.
Agents MUST NOT alter scope, redefine acceptance criteria, or
re-prioritize stories without explicit human approval.

### II. Escalation Discipline

Worker agents MUST escalate if and only if one of the following
conditions is met:

- **(a)** A spec ambiguity forces a decision that could change
  observable behavior.
- **(b)** A proposed implementation would violate a constitutional
  principle.
- **(c)** An acceptance criterion is technically unachievable
  within the stated constraints.

All other decisions are the worker's responsibility. Escalation
on stylistic, organizational, or preference matters is prohibited.

### III. Deployable Probe First

The first milestone of every feature MUST be a deployable probe:
a minimal, end-to-end slice that can be opened in a browser or
otherwise verified. No feature plan is approved without
identifying its probe scope.

### IV. Static-Only Stack

The project MUST be a static site using vanilla JavaScript.
There MUST be no build step, no transpilation, no bundler, and
no backend server. All assets MUST be servable from a plain
file system or static hosting provider. Third-party libraries
loaded via CDN are permitted only when justified in the spec.

### V. Requirement Provenance

Every requirement in a specification MUST carry provenance:
who decided it and at what weighted percentage of influence.
Format: `— Provenance: <author/source> @ <weight>%`.
This ensures traceability and prevents requirements from
appearing without accountability.

### VI. Spec-Only Review

The reviewer arbitrates exclusively against the specification.
If the spec is silent on a style, naming, or structural choice,
that decision belongs to the worker. Reviewers MUST NOT reject
work based on preferences not codified in the spec or this
constitution.

## Technology Constraints

- **Languages**: HTML, CSS, vanilla JavaScript (ES modules
  permitted).
- **Build tools**: None. No webpack, rollup, vite, esbuild, or
  equivalent. No preprocessors (Sass, Less, TypeScript).
- **Backend**: None. No server-side runtime. No API endpoints
  hosted by this project.
- **Hosting**: Static file serving only (e.g., GitHub Pages,
  Netlify static, S3 + CloudFront, or local `file://`).
- **CDN dependencies**: Permitted when the spec explicitly
  approves them. Each CDN dependency MUST be documented in the
  spec with provenance per Principle V.

## Review & Escalation Protocol

1. **Before review**: The worker self-checks against all six
   principles and the acceptance criteria in the spec.
2. **During review**: The reviewer verifies compliance with the
   spec and this constitution. Spec-silent matters are not
   grounds for rejection (Principle VI).
3. **Escalation path**: Worker → spec author (human). Escalations
   MUST cite the specific clause — (a), (b), or (c) from
   Principle II — that triggered them.
4. **Resolution**: The human updates the spec or constitution.
   The worker resumes once the ambiguity is resolved in writing.

## Governance

This constitution is the highest-authority document for the
Senate RPG project. All specifications, plans, tasks, and
reviews MUST comply with its principles.

- **Amendments**: Any change to this constitution MUST be
  documented with a version bump, rationale, and the date of
  change. Amendments require human approval.
- **Versioning**: Semantic versioning applies.
  - MAJOR: Principle removed, redefined, or made incompatible.
  - MINOR: New principle or section added; material expansion.
  - PATCH: Clarifications, typo fixes, non-semantic refinements.
- **Compliance review**: Every spec and plan MUST include a
  Constitution Check section verifying alignment with all
  active principles before implementation begins.

**Version**: 1.0.0 | **Ratified**: 2026-06-15 | **Last Amended**: 2026-06-15
