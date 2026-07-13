
import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../services/profile.service';
import { Customer } from '../types/schema-03-core';
import { supabase } from '../lib/supabase';

const useProfile = () => {
  const [profile, setProfile] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fetchedProfile = await getProfile(user.id);
        if (fetchedProfile) {
          setProfile(fetchedProfile);
        } else {
          setError("Failed to fetch profile");
        }
      } else {
        setError("User not logged in");
      }
      setLoading(false);
    };

    fetchProfile();

    const channel = supabase
      .channel('public:customers')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'customers' }, payload => {
        if (payload.new.id === profile?.id) {
          setProfile(payload.new as Customer);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const handleUpdateProfile = async (updates: Partial<Customer>) => {
    if (!profile) return;
    setLoading(true);
    const updatedProfile = await updateProfile(profile.id, updates);
    if (updatedProfile) {
      setProfile(updatedProfile);
    } else {
      setError("Failed to update profile");
    }
    setLoading(false);
  };

  return { profile, loading, error, updateProfile: handleUpdateProfile };
};

export default useProfile;
