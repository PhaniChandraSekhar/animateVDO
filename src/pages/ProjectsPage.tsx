import React from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import ProjectGrid from '../components/dashboard/ProjectGrid';
import ProjectWizard from '../components/ProjectWizard';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';

export default function ProjectsPage() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();
  const [showWizard, setShowWizard] = React.useState(false);

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your story creation projects
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            New Project
          </button>
        </div>

        {showWizard ? (
          <ProjectWizard />
        ) : (
          <ProjectGrid
            projects={projects}
            isLoading={loading}
            error={error}
          />
        )}
      </div>
    </DashboardLayout>
  );
}