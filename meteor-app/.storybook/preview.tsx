import type { Preview } from '@storybook/react-webpack5';
import { Grommet } from 'grommet';
import React from 'react';

// iOS-style theme matching the main app
const theme = {
  global: {
    colors: {
      brand: '#007aff', // iOS blue
    },
    font: {
      family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    control: {
      border: {
        radius: '8px',
      },
    },
  },
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <Grommet theme={theme} full>
        <Story />
      </Grommet>
    ),
  ],
};

export default preview;