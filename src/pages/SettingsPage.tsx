import React from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { Save, User as UserIcon, Bell, Shield, Key } from 'lucide-react';

export default function SettingsPage() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [notifications, setNotifications] = React.useState({
    email: true,
    push: true,
    weekly: false
  });

  React.useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('Not authenticated');

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (userError) throw userError;
        
        setUser(userData);
        setFullName(userData.full_name || '');
        setEmail(userData.email);
      } catch (err) {
        console.error('Error loading user:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-100 rounded w-1/4" />
          <div className="space-y-6">
            <div className="h-40 bg-gray-100 rounded-lg" />
            <div className="h-40 bg-gray-100 rounded-lg" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* Profile Settings */}
            <form onSubmit={handleSave} className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
              <div className="px-4 py-6 sm:p-8">
                <div className="flex items-center gap-x-3 mb-6">
                  <UserIcon className="h-6 w-6 text-gray-400" />
                  <h2 className="text-base font-semibold leading-7 text-gray-900">Profile</h2>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            {/* Notification Settings */}
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
              <div className="px-4 py-6 sm:p-8">
                <div className="flex items-center gap-x-3 mb-6">
                  <Bell className="h-6 w-6 text-gray-400" />
                  <h2 className="text-base font-semibold leading-7 text-gray-900">Notifications</h2>
                </div>
                
                <div className="space-y-6">
                  {Object.entries(notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {key === 'weekly' ? 'Weekly digest' : `${key} notifications`}
                        </p>
                        <p className="text-sm text-gray-500">
                          Receive notifications about your projects and reviews
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifications(prev => ({ ...prev, [key]: !value }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                          value ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            value ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Type */}
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
              <div className="flex items-center gap-x-3 mb-4">
                <Shield className="h-6 w-6 text-gray-400" />
                <h2 className="text-base font-semibold leading-7 text-gray-900">Account</h2>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{user?.role}</p>
                    <p className="text-sm text-gray-500">Current plan</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
              <div className="flex items-center gap-x-3 mb-4">
                <Key className="h-6 w-6 text-gray-400" />
                <h2 className="text-base font-semibold leading-7 text-gray-900">Security</h2>
              </div>
              <button className="w-full rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}