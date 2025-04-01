import React from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import DashboardStats from '../components/dashboard/DashboardStats';
import ProjectGrid from '../components/dashboard/ProjectGrid';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';

export default function DashboardPage() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    async function loadProjects() {
      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (projectError) throw projectError;
        setProjects(projectData);
      } catch (err) {
        setError('Failed to load projects');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track your story creation progress and manage your projects.
          </p>
        </div>

        <DashboardStats />

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Projects</h2>
            <button
              onClick={() => window.location.href = '/create'}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              New Project
            </button>
          </div>
          <div className="mt-6">
            <ProjectGrid
              projects={projects}
              isLoading={loading}
              error={error}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}