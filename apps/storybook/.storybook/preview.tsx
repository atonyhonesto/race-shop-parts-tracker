import '@raceshop/ui/styles.css';

import type { Decorator, Preview } from '@storybook/react-vite';

/** Toolbar switch for light/dark, using the same data-theme attribute the apps use. */
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme as string | undefined;
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    layout: 'padded',
    // WCAG 2.2 A and AA rules. 'error' marks violations as failures in the panel and test runs.
    a11y: {
      test: 'error',
      options: {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      },
    },
    controls: { expanded: true },
  },
};

export default preview;
