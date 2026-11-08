import type { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'ui-wc',
  // Stencil compiles src only; tsconfig.json also covers tests and configs for type-checking and lint.
  tsconfig: 'tsconfig.build.json',
  sourceMap: true,
  outputTargets: [
    // For bundlers (React wrapper in packages/ui, Electron): one tree-shakable module per element.
    // Importing the module registers the element. The Stencil runtime is bundled in, so consumers
    // need no @stencil/core at runtime.
    {
      type: 'dist-custom-elements',
      dir: 'dist/components',
      customElementsExportBehavior: 'auto-define-custom-elements',
      externalRuntime: false,
      generateTypeDeclarations: true,
    },
    // Plain HTML demo (src/index.html) with the lazy loader: no framework, no bundler.
    { type: 'www', dir: 'www', serviceWorker: null },
  ],
};
