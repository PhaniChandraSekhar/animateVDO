import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Project, StoryProgress } from '../types';
import { BookOpen, Wand2, Palette, Mic, Video, Loader2 } from 'lucide-react';

export default function ProjectDashboard() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [progress, setProgress] = useState<StoryProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProjectData() {
      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);

        // Fetch progress details
        const { data: progressData, error: progressError } = await supabase
          .from('story_progress')
          .select('*')
          .eq('project_id', id)
          .single();

        if (progressError) throw progressError;
        setProgress(progressData);
      } catch (err) {
        setError('Failed to load project data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProjectData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !project || !progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Error</h2>
          <p className="mt-2 text-gray-600">{error || 'Project not found'}</p>
        </div>
      </div>
    );
  }

  const steps = [
    { name: 'Research', icon: BookOpen, completed: progress.research },
    { name: 'Script', icon: Wand2, completed: progress.script },
    { name: 'Characters', icon: Palette, completed: progress.characters },
    { name: 'Audio', icon: Mic, completed: progress.audio },
    { name: 'Video', icon: Video, completed: progress.video },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{project.topic}</h1>
          <p className="mt-2 text-gray-600">Status: {project.status}</p>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900">Progress</h2>
            <div className="mt-6">
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.name} className="relative">
                    <div className="flex items-center space-x-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                        step.completed 
                          ? 'bg-indigo-600' 
                          : 'bg-gray-100'
                      }`}>
                        <step.icon className={`h-6 w-6 ${
                          step.completed 
                            ? 'text-white' 
                            : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {step.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {step.completed ? 'Completed' : 'In progress'}
                        </div>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="absolute left-6 top-12 h-12 w-px bg-gray-200" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}