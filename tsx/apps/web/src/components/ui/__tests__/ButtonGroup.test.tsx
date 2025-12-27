import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ButtonGroup, ButtonGroupItem } from '../ButtonGroup';

describe('ButtonGroup', () => {
  it('renders children correctly', () => {
    render(
      <ButtonGroup>
        <button>Button 1</button>
        <button>Button 2</button>
        <button>Button 3</button>
      </ButtonGroup>
    );

    expect(screen.getByText('Button 1')).toBeDefined();
    expect(screen.getByText('Button 2')).toBeDefined();
    expect(screen.getByText('Button 3')).toBeDefined();
  });

  it('applies role="group" to container', () => {
    render(
      <ButtonGroup>
        <button>Button 1</button>
      </ButtonGroup>
    );

    expect(screen.getByRole('group')).toBeDefined();
  });

  it('applies disabled state to all children', () => {
    render(
      <ButtonGroup disabled>
        <button>Button 1</button>
        <button>Button 2</button>
      </ButtonGroup>
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveProperty('disabled', true);
    });
  });

  it('applies custom className', () => {
    render(
      <ButtonGroup className="custom-class">
        <button>Button 1</button>
      </ButtonGroup>
    );

    expect(screen.getByRole('group').className).toContain('custom-class');
  });

  it('renders in vertical orientation', () => {
    render(
      <ButtonGroup orientation="vertical">
        <button>Button 1</button>
        <button>Button 2</button>
      </ButtonGroup>
    );

    expect(screen.getByRole('group').className).toContain('flex-col');
  });

  it('renders in horizontal orientation by default', () => {
    render(
      <ButtonGroup>
        <button>Button 1</button>
        <button>Button 2</button>
      </ButtonGroup>
    );

    expect(screen.getByRole('group').className).toContain('flex-row');
  });
});

describe('ButtonGroupItem', () => {
  it('renders children correctly', () => {
    render(<ButtonGroupItem>Click me</ButtonGroupItem>);
    expect(screen.getByText('Click me')).toBeDefined();
  });

  it('applies active styling when active', () => {
    render(<ButtonGroupItem active>Active</ButtonGroupItem>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-interactive-600');
  });

  it('does not apply active styling when not active', () => {
    render(<ButtonGroupItem>Inactive</ButtonGroupItem>);
    const button = screen.getByRole('button');
    expect(button.className).not.toContain('bg-interactive-600');
  });
});
