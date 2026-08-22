import { supabase } from '@/lib/supabase';

export interface PlatformPublicProfile {
  id: string;
  slug: 'soug-admin';
  display_name: string;
  bio: string;
  avatar_url: string | null;
  is_active: boolean;
}

export async function getPlatformPublicProfile(
  slug: string = 'soug-admin',
): Promise<PlatformPublicProfile | null> {
  if (slug !== 'soug-admin') return null;

  const { data, error } = await supabase
    .from('platform_public_profiles')
    .select('id, slug, display_name, bio, avatar_url, is_active')
    .eq('slug', 'soug-admin')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching platform public profile:', error);
    return null;
  }

  return data as PlatformPublicProfile | null;
}

export async function searchPlatformPublicProfiles(query: string): Promise<PlatformPublicProfile[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized || !'soug-admin'.includes(normalized)) return [];

  const profile = await getPlatformPublicProfile('soug-admin');
  return profile ? [profile] : [];
}
