import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { AppearanceSettings } from '@/components/profile/AppearanceSettings';
import { PasswordForm } from '@/components/profile/PasswordForm';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { SettingsSection } from '@/components/profile/SettingsSection';
import { PageHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';

/** Personal details (with a live preview), password and theme. */
export function ProfilePage() {
  const { user } = useAuth();
  const [preview, setPreview] = useState(null);
  useDocumentTitle('Profile & settings');

  if (!user) return null;

  const previewUser = preview
    ? {
        ...user,
        name: preview.name?.trim() || user.name,
        title: preview.title?.trim() ?? user.title,
        avatarColor: preview.avatarColor || user.avatarColor,
      }
    : user;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow="Account"
        icon={UserRound}
        title="Profile & settings"
        description="Manage your personal details, password and appearance."
      />

      {/* Preferences layout: label column left, controls right, hairlines between sections. */}
      <div className="border-b border-line">
        <ProfileHeader user={previewUser} />

        <SettingsSection
          title="Personal information"
          description="Your name, job title and avatar colour are visible to everyone in your teams."
        >
          <ProfileForm user={user} onPreviewChange={setPreview} />
        </SettingsSection>

        <SettingsSection
          title="Password"
          description="Use 8 to 72 characters with at least one letter and one number. You’ll stay signed in here; your other devices will be signed out."
        >
          <PasswordForm />
        </SettingsSection>

        <SettingsSection
          title="Appearance"
          description="Choose how TaskFlow looks. The theme is saved on this device."
        >
          <AppearanceSettings />
        </SettingsSection>
      </div>
    </div>
  );
}
