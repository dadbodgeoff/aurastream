'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@aurastream/shared';
import {
  PageContainer,
  Modal,
  ConfirmDialog,
  UserIcon,
  SettingsIcon,
  CheckIcon,
} from '@/components/dashboard';
import { cn } from '@/lib/utils';

// =============================================================================
// Tab Components
// =============================================================================

type SettingsTab = 'profile' | 'billing' | 'security' | 'preferences';

const tabs: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'billing', label: 'Billing' },
  { id: 'security', label: 'Security' },
  { id: 'preferences', label: 'Preferences' },
];

// =============================================================================
// Profile Tab
// =============================================================================

function ProfileTab({ user }: { user: any }) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implement profile update API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-1">Profile Information</h3>
        <p className="text-sm text-text-muted">Update your account profile information</p>
      </div>

      <div className="grid gap-6 max-w-lg">
        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Avatar</label>
          <div className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" loading="lazy" decoding="async" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-interactive-600/10 flex items-center justify-center text-interactive-600">
                <UserIcon className="w-8 h-8" />
              </div>
            )}
            <button className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-default rounded-lg transition-colors">
              Change Avatar
            </button>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2.5 bg-background-elevated border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-interactive-600 focus:ring-1 focus:ring-interactive-600/20"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-2.5 bg-background-surface border border-border-subtle rounded-lg text-text-muted cursor-not-allowed"
          />
          <p className="text-xs text-text-muted mt-1">Contact support to change your email</p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Billing Tab
// =============================================================================

function BillingTab({ user }: { user: any }) {
  const [isLoading, setIsLoading] = useState(false);
  const isPremium = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio' || user?.subscriptionTier === 'unlimited';

  const handleUpgrade = async (planId: string) => {
    setIsLoading(true);
    try {
      const { apiClient } = await import('@aurastream/api-client');
      const response = await apiClient.subscriptions.createCheckout({
        plan: planId as 'pro' | 'studio',
        successUrl: `${window.location.origin}/dashboard/settings?tab=billing&success=true`,
        cancelUrl: `${window.location.origin}/dashboard/settings?tab=billing&canceled=true`,
      });
      
      // Redirect to Stripe Checkout
      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: ['3 assets total', '1 brand kit', 'Basic templates', 'Community support'],
      current: user?.subscriptionTier === 'free',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$24.99',
      period: 'per month',
      features: ['50 assets per month', '5 brand kits', 'AI Prompt Coach', 'Priority support', 'Advanced templates'],
      current: user?.subscriptionTier === 'pro',
      recommended: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-1">Subscription</h3>
        <p className="text-sm text-text-muted">Manage your subscription and billing</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'relative p-4 rounded-xl border-2 transition-colors',
              plan.current
                ? 'border-interactive-600 bg-interactive-600/5'
                : 'border-border-subtle hover:border-border-default'
            )}
          >
            {plan.recommended && (
              <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-interactive-600 text-white text-micro font-medium rounded-full">
                Recommended
              </span>
            )}
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-text-primary">{plan.name}</h4>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-bold text-text-primary">{plan.price}</span>
                <span className="text-text-muted text-xs">/{plan.period}</span>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
            {plan.current ? (
              <span className="block w-full text-center py-1.5 text-xs font-medium text-interactive-600">
                Current Plan
              </span>
            ) : plan.id === 'free' ? (
              <span className="block w-full text-center py-1.5 text-xs font-medium text-text-muted">
                —
              </span>
            ) : (
              <button 
                onClick={() => handleUpgrade(plan.id)}
                disabled={isLoading}
                className="w-full py-2 bg-interactive-600 hover:bg-interactive-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Upgrade'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// =============================================================================
// Security Tab
// =============================================================================

function SecurityTab() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-1">Security</h3>
        <p className="text-sm text-text-muted">Manage your account security settings</p>
      </div>

      <div className="space-y-4 max-w-lg">
        {/* Password */}
        <div className="p-4 bg-background-surface border border-border-subtle rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-text-primary">Password</h4>
              <p className="text-sm text-text-muted">Last changed 30 days ago</p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-default rounded-lg transition-colors"
            >
              Change
            </button>
          </div>
        </div>

        {/* Two-Factor Auth */}
        <div className="p-4 bg-background-surface border border-border-subtle rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-text-primary">Two-Factor Authentication</h4>
              <p className="text-sm text-text-muted">Add an extra layer of security</p>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-interactive-600 hover:bg-interactive-600/10 rounded-lg transition-colors">
              Enable
            </button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-red-500">Delete Account</h4>
              <p className="text-sm text-text-muted">Permanently delete your account and all data</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowPasswordModal(false)}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button className="px-4 py-2 text-sm font-medium bg-interactive-600 hover:bg-interactive-500 text-white rounded-lg transition-colors">
              Update Password
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Current Password</label>
            <input type="password" className="w-full px-4 py-2.5 bg-background-elevated border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-interactive-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">New Password</label>
            <input type="password" className="w-full px-4 py-2.5 bg-background-elevated border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-interactive-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Confirm New Password</label>
            <input type="password" className="w-full px-4 py-2.5 bg-background-elevated border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-interactive-600" />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => { /* TODO: Delete account */ }}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost."
        confirmLabel="Delete Account"
        variant="danger"
      />
    </div>
  );
}


// =============================================================================
// Preferences Tab
// =============================================================================

function PreferencesTab() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [emailNotifications, setEmailNotifications] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-1">Preferences</h3>
        <p className="text-sm text-text-muted">Customize your experience</p>
      </div>

      <div className="space-y-6 max-w-lg">
        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">Theme</label>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg border transition-colors capitalize',
                  theme === t
                    ? 'border-interactive-600 bg-interactive-600/10 text-interactive-600'
                    : 'border-border-subtle text-text-secondary hover:border-border-default'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between p-4 bg-background-surface border border-border-subtle rounded-xl">
          <div>
            <h4 className="font-medium text-text-primary">Email Notifications</h4>
            <p className="text-sm text-text-muted">Receive updates about your assets</p>
          </div>
          <button
            onClick={() => setEmailNotifications(!emailNotifications)}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors',
              emailNotifications ? 'bg-interactive-600' : 'bg-background-elevated'
            )}
          >
            <span
              className={cn(
                'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                emailNotifications ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const tabParam = searchParams.get('tab') as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam || 'profile');

  return (
    <PageContainer title="Settings" description="Manage your account settings and preferences">
      {/* Tabs */}
      <div className="border-b border-border-subtle">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-interactive-600 text-interactive-600'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="pt-6">
        {activeTab === 'profile' && <ProfileTab user={user} />}
        {activeTab === 'billing' && <BillingTab user={user} />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
      </div>
    </PageContainer>
  );
}
