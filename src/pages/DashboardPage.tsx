import React, { useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import DashboardStats from '../components/dashboard/DashboardStats';
import ProjectGrid from '../components/dashboard/ProjectGrid';
import UsageAnalytics from '../components/UsageAnalytics';
import { supabase } from '../lib/supabase';
import { BarChart3, Folder } from 'lucide-react';
import type { Project } from '../types';

export default function DashboardPage() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();
  const [activeTab, setActiveTab] = useState<'projects' | 'analytics'>('projects');

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

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('projects')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'projects'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Projects
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'projects' ? (
          <div>
            <div className="flex items-center justify-between mb-6">
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
        ) : (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-6">Usage Analytics</h2>
            <UsageAnalytics />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}