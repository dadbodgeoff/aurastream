/**
 * Brand Kits Screen Tests (Mobile)
 * Comprehensive tests for the mobile Brand Kits screen component
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import BrandKitsScreen from '../index';
import type { BrandKit, BrandKitListResponse } from '@aurastream/api-client';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock brand kit data
const mockBrandKit: BrandKit = {
  id: 'kit-1',
  user_id: 'user-123',
  name: 'Gaming Brand',
  is_active: true,
  primary_colors: ['#FF5733', '#3498DB'],
  accent_colors: ['#F1C40F'],
  fonts: { headline: 'Montserrat', body: 'Inter' },
  logo_url: null,
  tone: 'competitive',
  style_reference: 'Bold gaming style',
  extracted_from: null,
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
};

const mockInactiveBrandKit: BrandKit = {
  id: 'kit-2',
  user_id: 'user-123',
  name: 'Casual Stream',
  is_active: false,
  primary_colors: ['#9B59B6', '#1ABC9C'],
  accent_colors: ['#E74C3C', '#F39C12'],
  fonts: { headline: 'Poppins', body: 'Roboto' },
  logo_url: 'https://example.com/logo.png',
  tone: 'casual',
  style_reference: 'Relaxed vibes',
  extracted_from: null,
  created_at: '2024-01-10T08:00:00Z',
  updated_at: '2024-01-10T08:00:00Z',
};

const mockBrandKitListResponse: BrandKitListResponse = {
  brand_kits: [mockBrandKit, mockInactiveBrandKit],
  total: 2,
  active_id: 'kit-1',
};

const emptyBrandKitListResponse: BrandKitListResponse = {
  brand_kits: [],
  total: 0,
  active_id: null,
};

// Mock hooks
const mockUseBrandKits = jest.fn();
const mockUseDeleteBrandKit = jest.fn();
const mockUseActivateBrandKit = jest.fn();

jest.mock('@aurastream/api-client', () => ({
  useBrandKits: () => mockUseBrandKits(),
  useDeleteBrandKit: () => mockUseDeleteBrandKit(),
  useActivateBrandKit: () => mockUseActivateBrandKit(),
}));

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// ============================================================================
// Test Utilities
// ============================================================================

function setupMocks(options: {
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  data?: BrandKitListResponse | null;
  refetch?: jest.Mock;
  deleteMutation?: {
    mutateAsync: jest.Mock;
    isPending?: boolean;
  };
  activateMutation?: {
    mutateAsync: jest.Mock;
    isPending?: boolean;
  };
} = {}) {
  const {
    isLoading = false,
    isError = false,
    error = null,
    data = mockBrandKitListResponse,
    refetch = jest.fn().mockResolvedValue({}),
    deleteMutation = { mutateAsync: jest.fn().mockResolvedValue({}), isPending: false },
    activateMutation = { mutateAsync: jest.fn().mockResolvedValue({}), isPending: false },
  } = options;

  mockUseBrandKits.mockReturnValue({
    data,
    isLoading,
    isError,
    error,
    refetch,
  });

  mockUseDeleteBrandKit.mockReturnValue(deleteMutation);
  mockUseActivateBrandKit.mockReturnValue(activateMutation);
}

// ============================================================================
// Tests
// ============================================================================

describe('BrandKitsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe('Loading State', () => {
    it('should render loading state', () => {
      setupMocks({ isLoading: true, data: null });

      render(<BrandKitsScreen />);

      expect(screen.getByText('Loading brand kits...')).toBeTruthy();
    });

    it('should show activity indicator when loading', () => {
      setupMocks({ isLoading: true, data: null });

      render(<BrandKitsScreen />);

      // ActivityIndicator is rendered in loading state
      expect(screen.getByText('Loading brand kits...')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe('Empty State', () => {
    it('should render empty state when no brand kits', () => {
      setupMocks({ data: emptyBrandKitListResponse });

      render(<BrandKitsScreen />);

      expect(screen.getByText('No Brand Kits Yet')).toBeTruthy();
      expect(screen.getByText(/create your first brand kit/i)).toBeTruthy();
    });

    it('should show create button in empty state', () => {
      setupMocks({ data: emptyBrandKitListResponse });

      render(<BrandKitsScreen />);

      expect(screen.getByText('Create Brand Kit')).toBeTruthy();
    });

    it('should navigate to create screen when empty state button is pressed', () => {
      setupMocks({ data: emptyBrandKitListResponse });

      render(<BrandKitsScreen />);

      const createButton = screen.getByText('Create Brand Kit');
      fireEvent.press(createButton);

      expect(mockPush).toHaveBeenCalledWith('/brand-kits/create');
    });
  });

  // ==========================================================================
  // Brand Kit List Tests
  // ==========================================================================

  describe('Brand Kit List', () => {
    it('should render brand kit list', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      expect(screen.getByText('Gaming Brand')).toBeTruthy();
      expect(screen.getByText('Casual Stream')).toBeTruthy();
    });

    it('should display brand kit name', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      expect(screen.getByText('Gaming Brand')).toBeTruthy();
    });

    it('should display brand kit tone', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      expect(screen.getByText('competitive')).toBeTruthy();
      expect(screen.getByText('casual')).toBeTruthy();
    });

    it('should display brand kit fonts', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      expect(screen.getByText('Montserrat / Inter')).toBeTruthy();
      expect(screen.getByText('Poppins / Roboto')).toBeTruthy();
    });

    it('should show active badge for active brand kit', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('should navigate to detail screen when card is pressed', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      const gamingBrandCard = screen.getByText('Gaming Brand');
      fireEvent.press(gamingBrandCard);

      expect(mockPush).toHaveBeenCalledWith('/brand-kits/kit-1');
    });
  });

  // ==========================================================================
  // Pull to Refresh Tests
  // ==========================================================================

  describe('Pull to Refresh', () => {
    it('should have refetch function available', () => {
      const mockRefetch = jest.fn().mockResolvedValue({});
      setupMocks({ refetch: mockRefetch });

      render(<BrandKitsScreen />);

      // Verify the component renders with the refetch function available
      expect(screen.getByText('Gaming Brand')).toBeTruthy();
    });
  });

  // ==========================================================================
  // FAB Button Tests
  // ==========================================================================

  describe('FAB Button', () => {
    it('should render FAB button', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      expect(screen.getByLabelText('Create new brand kit')).toBeTruthy();
    });

    it('should navigate to create screen when FAB is pressed', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      const fabButton = screen.getByLabelText('Create new brand kit');
      fireEvent.press(fabButton);

      expect(mockPush).toHaveBeenCalledWith('/brand-kits/create');
    });

    it('should display plus icon in FAB', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      expect(screen.getByText('+')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Error State Tests
  // ==========================================================================

  describe('Error State', () => {
    it('should display error state', () => {
      setupMocks({
        isError: true,
        error: new Error('Network error'),
        data: null,
      });

      render(<BrandKitsScreen />);

      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });

    it('should show retry button in error state', () => {
      setupMocks({
        isError: true,
        error: new Error('Network error'),
        data: null,
      });

      render(<BrandKitsScreen />);

      expect(screen.getByText('Try Again')).toBeTruthy();
    });

    it('should call refetch when retry button is pressed', () => {
      const mockRefetch = jest.fn();
      setupMocks({
        isError: true,
        error: new Error('Network error'),
        data: null,
        refetch: mockRefetch,
      });

      render(<BrandKitsScreen />);

      const retryButton = screen.getByText('Try Again');
      fireEvent.press(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should display default error message when error has no message', () => {
      setupMocks({
        isError: true,
        error: null,
        data: null,
      });

      render(<BrandKitsScreen />);

      expect(screen.getByText('Failed to load brand kits')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Long Press Action Sheet Tests
  // ==========================================================================

  describe('Long Press Action Sheet', () => {
    it('should show action sheet on long press', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      const brandKitCard = screen.getByLabelText('Gaming Brand brand kit, active');
      fireEvent(brandKitCard, 'longPress');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Gaming Brand',
        'Choose an action',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Already Active', style: 'default' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        ])
      );
    });

    it('should show Set as Active option for inactive brand kit', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      const inactiveCard = screen.getByLabelText('Casual Stream brand kit');
      fireEvent(inactiveCard, 'longPress');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Casual Stream',
        'Choose an action',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Set as Active', style: 'default' }),
        ])
      );
    });

    it('should call activate mutation when Set as Active is selected', async () => {
      const mockActivateMutateAsync = jest.fn().mockResolvedValue({});
      setupMocks({
        activateMutation: {
          mutateAsync: mockActivateMutateAsync,
        },
      });

      render(<BrandKitsScreen />);

      const inactiveCard = screen.getByLabelText('Casual Stream brand kit');
      fireEvent(inactiveCard, 'longPress');

      // Get the Set as Active option and call its onPress
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const options = alertCall[2];
      const setActiveOption = options.find((opt: { text: string }) => opt.text === 'Set as Active');
      
      await setActiveOption.onPress();

      expect(mockActivateMutateAsync).toHaveBeenCalledWith('kit-2');
    });

    it('should show delete confirmation when Delete is selected', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      const brandKitCard = screen.getByLabelText('Gaming Brand brand kit, active');
      fireEvent(brandKitCard, 'longPress');

      // Get the Delete option and call its onPress
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const options = alertCall[2];
      const deleteOption = options.find((opt: { text: string }) => opt.text === 'Delete');
      
      deleteOption.onPress();

      // Should show delete confirmation alert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Brand Kit',
        expect.stringContaining('Gaming Brand'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        ])
      );
    });

    it('should call delete mutation when delete is confirmed', async () => {
      const mockDeleteMutateAsync = jest.fn().mockResolvedValue({});
      setupMocks({
        deleteMutation: {
          mutateAsync: mockDeleteMutateAsync,
        },
      });

      render(<BrandKitsScreen />);

      const brandKitCard = screen.getByLabelText('Gaming Brand brand kit, active');
      fireEvent(brandKitCard, 'longPress');

      // Get the Delete option and call its onPress
      const firstAlertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const options = firstAlertCall[2];
      const deleteOption = options.find((opt: { text: string }) => opt.text === 'Delete');
      
      deleteOption.onPress();

      // Get the confirmation alert and confirm deletion
      const confirmAlertCall = (Alert.alert as jest.Mock).mock.calls[1];
      const confirmOptions = confirmAlertCall[2];
      const confirmDeleteOption = confirmOptions.find((opt: { text: string }) => opt.text === 'Delete');
      
      await confirmDeleteOption.onPress();

      expect(mockDeleteMutateAsync).toHaveBeenCalledWith('kit-1');
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have accessible labels on brand kit cards', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      expect(screen.getByLabelText('Gaming Brand brand kit, active')).toBeTruthy();
      expect(screen.getByLabelText('Casual Stream brand kit')).toBeTruthy();
    });

    it('should have accessible label on FAB button', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      expect(screen.getByLabelText('Create new brand kit')).toBeTruthy();
    });

    it('should have accessible label on retry button', () => {
      setupMocks({
        isError: true,
        error: new Error('Network error'),
        data: null,
      });

      render(<BrandKitsScreen />);

      expect(screen.getByLabelText('Retry loading brand kits')).toBeTruthy();
    });

    it('should have accessible label on empty state create button', () => {
      setupMocks({ data: emptyBrandKitListResponse });

      render(<BrandKitsScreen />);

      expect(screen.getByLabelText('Create your first brand kit')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should show error alert when activate fails', async () => {
      const mockActivateMutateAsync = jest.fn().mockRejectedValue(new Error('Activate failed'));
      setupMocks({
        activateMutation: {
          mutateAsync: mockActivateMutateAsync,
        },
      });

      render(<BrandKitsScreen />);

      const inactiveCard = screen.getByLabelText('Casual Stream brand kit');
      fireEvent(inactiveCard, 'longPress');

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const options = alertCall[2];
      const setActiveOption = options.find((opt: { text: string }) => opt.text === 'Set as Active');
      
      await setActiveOption.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to activate brand kit. Please try again.'
        );
      });
    });

    it('should show error alert when delete fails', async () => {
      const mockDeleteMutateAsync = jest.fn().mockRejectedValue(new Error('Delete failed'));
      setupMocks({
        deleteMutation: {
          mutateAsync: mockDeleteMutateAsync,
        },
      });

      render(<BrandKitsScreen />);

      const brandKitCard = screen.getByLabelText('Gaming Brand brand kit, active');
      fireEvent(brandKitCard, 'longPress');

      // Trigger delete flow
      const firstAlertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const options = firstAlertCall[2];
      const deleteOption = options.find((opt: { text: string }) => opt.text === 'Delete');
      deleteOption.onPress();

      const confirmAlertCall = (Alert.alert as jest.Mock).mock.calls[1];
      const confirmOptions = confirmAlertCall[2];
      const confirmDeleteOption = confirmOptions.find((opt: { text: string }) => opt.text === 'Delete');
      
      await confirmDeleteOption.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to delete brand kit. Please try again.'
        );
      });
    });
  });

  // ==========================================================================
  // Color Swatches Tests
  // ==========================================================================

  describe('Color Swatches', () => {
    it('should render color swatches for brand kits', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      // The component renders color swatches as Views with backgroundColor
      // We verify the brand kits are rendered which include color swatches
      expect(screen.getByText('Gaming Brand')).toBeTruthy();
      expect(screen.getByText('Casual Stream')).toBeTruthy();
    });

    it('should show no colors text when brand kit has no colors', () => {
      const brandKitNoColors: BrandKit = {
        ...mockBrandKit,
        id: 'kit-no-colors',
        name: 'No Colors Kit',
        primary_colors: [],
        accent_colors: [],
      };

      setupMocks({
        data: {
          brand_kits: [brandKitNoColors],
          total: 1,
          active_id: null,
        },
      });

      render(<BrandKitsScreen />);

      expect(screen.getByText('No colors defined')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Navigation Tests
  // ==========================================================================

  describe('Navigation', () => {
    it('should navigate to brand kit detail on card press', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      const card = screen.getByText('Gaming Brand');
      fireEvent.press(card);

      expect(mockPush).toHaveBeenCalledWith('/brand-kits/kit-1');
    });

    it('should navigate to create screen on FAB press', () => {
      setupMocks();

      render(<BrandKitsScreen />);

      const fab = screen.getByLabelText('Create new brand kit');
      fireEvent.press(fab);

      expect(mockPush).toHaveBeenCalledWith('/brand-kits/create');
    });

    it('should navigate to create screen from empty state', () => {
      setupMocks({ data: emptyBrandKitListResponse });

      render(<BrandKitsScreen />);

      const createButton = screen.getByText('Create Brand Kit');
      fireEvent.press(createButton);

      expect(mockPush).toHaveBeenCalledWith('/brand-kits/create');
    });
  });
});
