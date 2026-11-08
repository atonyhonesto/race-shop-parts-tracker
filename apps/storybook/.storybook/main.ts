import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  // Runs axe on every story; violations show in the Accessibility panel.
  addons: ['@storybook/addon-a11y'],
  core: { disableTelemetry: true },
};

export default config;
