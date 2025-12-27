import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InputGroup, InputAddon } from '../InputGroup';

// Mock icon component
const MockIcon = () => <svg data-testid="mock-icon" />;

describe('InputGroup', () => {
  it('renders input correctly', () => {
    render(
      <InputGroup>
        <input type="text" placeholder="Enter text" />
      </InputGroup>
    );

    expect(screen.getByPlaceholderText('Enter text')).toBeDefined();
  });

  it('renders left icon', () => {
    render(
      <InputGroup leftIcon={<MockIcon />}>
        <input type="text" />
      </InputGroup>
    );

    expect(screen.getByTestId('mock-icon')).toBeDefined();
  });

  it('renders right icon', () => {
    render(
      <InputGroup rightIcon={<MockIcon />}>
        <input type="text" />
      </InputGroup>
    );

    expect(screen.getByTestId('mock-icon')).toBeDefined();
  });

  it('renders left addon', () => {
    render(
      <InputGroup leftAddon={<span>https://</span>}>
        <input type="text" />
      </InputGroup>
    );

    expect(screen.getByText('https://')).toBeDefined();
  });

  it('renders right addon', () => {
    render(
      <InputGroup rightAddon={<button>Submit</button>}>
        <input type="text" />
      </InputGroup>
    );

    expect(screen.getByText('Submit')).toBeDefined();
  });

  it('applies disabled state', () => {
    render(
      <InputGroup disabled>
        <input type="text" />
      </InputGroup>
    );

    const input = screen.getByRole('textbox');
    expect(input.hasAttribute('disabled')).toBe(true);
  });

  it('applies error styling', () => {
    render(
      <InputGroup error>
        <input type="text" />
      </InputGroup>
    );

    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-error-500');
  });

  it('applies custom className', () => {
    const { container } = render(
      <InputGroup className="custom-class">
        <input type="text" />
      </InputGroup>
    );

    expect((container.firstChild as HTMLElement).className).toContain('custom-class');
  });

  it('renders with both icons', () => {
    render(
      <InputGroup
        leftIcon={<span data-testid="left-icon">L</span>}
        rightIcon={<span data-testid="right-icon">R</span>}
      >
        <input type="text" />
      </InputGroup>
    );

    expect(screen.getByTestId('left-icon')).toBeDefined();
    expect(screen.getByTestId('right-icon')).toBeDefined();
  });
});

describe('InputAddon', () => {
  it('renders children correctly', () => {
    render(<InputAddon>@example.com</InputAddon>);
    expect(screen.getByText('@example.com')).toBeDefined();
  });

  it('applies custom className', () => {
    render(<InputAddon className="custom-addon">Text</InputAddon>);
    const addon = screen.getByText('Text');
    expect(addon.className).toContain('custom-addon');
  });
});
