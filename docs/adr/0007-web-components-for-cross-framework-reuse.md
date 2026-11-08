# 0007. Build the life-limit gauge as a Web Component (Stencil)

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

The life-limit gauge is the one visual the whole team relies on: how much of a part's life is
used, and whether it is near (80%) or at (100%) its limit. It has to look and behave the same in
the React web app, the Electron app, and places that aren't React at all, such as a plain HTML page
(a pit-wall display, an embedded status page, or a future non-React tool).

Most of `packages/ui` is React and will stay React; the apps are React. The question is how to make
the one component that must work everywhere framework-independent, without turning the whole
component library into Web Components.

## Decision

- **The gauge is a standard custom element, `<life-gauge>`,** in `packages/ui-wc`, built with
  **Stencil**.
  - **Outputs:** a tree-shakable module that registers the element when imported, for bundlers
    (React, Electron), and a lazy loader for plain HTML (one `<script type="module">` tag; demo in
    `src/index.html`).
  - **Contract:** properties `percent`, `status`, `label` and `size`.
  - **Accessibility:** `role="meter"` with `aria-valuetext`, and the status always printed as text.
  - **Theming:** CSS custom properties from `packages/ui/src/tokens.css`. They inherit into the
    shadow DOM, so light and dark themes need no extra code.
- **React consumes it through a thin wrapper** (`packages/ui/src/components/LifeGauge.tsx`).
  React 19 passes props to custom elements as properties, so the wrapper only adds types and a
  stable React API. It needs no wrapper-generation package.
- **Only components that genuinely need to run outside React go into `ui-wc`.** Everything else
  stays React in `packages/ui`.
- **Tests:**
  - Vitest renders the **compiled** element in jsdom, the same artifact consumers import.
  - The React wrapper has its own tests.
  - Storybook stories are checked with axe in light and dark themes.

## Why Stencil (and not Lit)

Lit was the initial recommendation: a smaller runtime (about 5 KB), no compiler, and the same Vite
toolchain. Stencil was chosen instead (project owner's decision). Stencil's advantages for this
team:

- **Familiar authoring:** TSX and decorators will feel familiar to React developers.
- **Built-in distribution:** a lazy loader for plain HTML pages and custom-elements output for
  bundlers, without extra config.
- **A path to a larger design system:** if more components move here, Stencil's output targets can
  generate framework wrappers (React, Angular, Vue) automatically.

Costs we accept, and how we handled them:

| Cost                                                  | Mitigation                                                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| A second compiler with its own TypeScript and rules   | Separate `tsconfig.build.json` for Stencil. `verbatimModuleSyntax` is off in this package only, because Stencil strips its decorator imports. |
| Stencil's JSX types an expression as an error `any`   | `render()` declares `VNode`, and one lint rule is off for Stencil files only, with a comment explaining why.                                  |
| Component modules may export only the component class | Shared logic lives in `src/utils/life.ts`, which is also unit-tested directly.                                                                |
| Bigger runtime than Lit                               | The gauge chunk is about 7 KB gzipped and has its own bundle budget, so growth fails CI.                                                      |

## Consequences

- **Easier:**
  - One implementation of the gauge's look, thresholds and accessibility, for every surface.
  - A non-React page needs one script tag.
- **Harder:**
  - Two component models in the repo.
  - `ui-wc` must be built before apps that use it can type-check or test, and CI builds first.
  - Server-side rendering would need extra work, but we don't do SSR.

## Alternatives considered

- **Lit.** Smaller and simpler to build. It was the recommended option and stays a reasonable
  switch if Stencil's extra compiler becomes a burden. The element's public API (tag, properties,
  CSS custom properties) wouldn't change.
- **React-only component, with Electron rendering React.** That works for the two apps, but not for
  plain HTML or any non-React tool. It is the cross-framework case we're designing for.
- **All of `packages/ui` as Web Components.** One component model, but form controls, dialogs and
  focus management are much harder to get right across shadow DOM boundaries. It is too much risk
  for components that only React uses today.
