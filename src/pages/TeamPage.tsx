import React from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { UserPlus2, Mail, Shield } from 'lucide-react';

export default function TeamPage() {
  const [team, setTeam] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    async function loadTeam() {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (userError) throw userError;
        setTeam(userData);
      } catch (err) {
        setError('Failed to load team members');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadTeam();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your team members and their roles
            </p>
          </div>
          <button className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
            <UserPlus2 className="h-4 w-4 mr-2" />
            Invite Member
          </button>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
          <ul role="list" className="divide-y divide-gray-100">
            {team.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-x-6 p-5">
                <div className="flex min-w-0 gap-x-4">
                  <img 
                    src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.full_name}`} 
                    alt="" 
                    className="h-12 w-12 flex-none rounded-full bg-gray-50" 
                  />
                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-gray-900">
                      {member.full_name}
                    </p>
                    <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                      <Mail className="h-4 w-4" />
                      <p>{member.email}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-x-4">
                  <div className="hidden sm:flex sm:flex-col sm:items-end">
                    <div className="flex items-center gap-x-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <p className="text-sm leading-6 text-gray-900 capitalize">
                        {member.role}
                      </p>
                    </div>
                  </div>
                  <button className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}