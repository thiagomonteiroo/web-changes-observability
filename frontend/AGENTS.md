<!-- BEGIN:nextjs-agent-rules -->

# Next.js AI Coding Agent Guidelines

This project is built with Next.js 15 (App Router), TypeScript, and Tailwind CSS.
Refer to `node_modules/next/dist/docs/` for version-matched documentation.

<!-- END:nextjs-agent-rules -->

# Web Changes Observability - Frontend Guidelines

## Component Principles:
1. **App Router Conventions**:
   - Server components by default.
   - Use `'use client'` on interactive views (modals, forms, tabs, diff visualizers).
2. **Observability UI Requirements**:
   - **Central Dashboard**: Visual overview of all monitored sites with change counts since creation.
   - **Spotlight / Unviewed Changes Section**: Clear prominent alert box for pages with pending unacknowledged changes.
   - **Acknowledge Button**: One-click action to confirm viewing the changes and clear the alert badge.
   - **Diff Viewer**: Clear green (+) highlights for added lines and red (-) for removed lines.
   - **New Documents Detected**: Explicit visual list for newly published PDF/DOCX files.
   - **Error Center**: Dedicated view and visual badges for scraping failures (timeouts, 403, 500).
   - **Schedule Picker**: Flexible UI allowing interval selection, multiple daily times (e.g. 08h, 12h, 16h, 20h), or periodic days (e.g. 1x a cada 3 dias).
