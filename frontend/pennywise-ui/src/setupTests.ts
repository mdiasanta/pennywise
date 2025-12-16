import '@testing-library/jest-dom/vitest';

if (!window.matchMedia) {
  // jsdom does not implement matchMedia by default
  window.matchMedia = () =>
    ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
