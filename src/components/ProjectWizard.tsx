import React, { useState } from 'react';
import { Wand2, BookOpen, Mic, Video, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ProjectWizard() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([
          {
            user_id: user.id,
            topic,
            status: 'research'
          }
        ])
        .select()
        .single();
      
      if (projectError) throw projectError;
      
      // Create story progress
      const { error: progressError } = await supabase
        .from('story_progress')
        .insert([
          {
            project_id: project.id,
            research: false,
            script: false,
            characters: false,
            audio: false,
            video: false
          }
        ]);
      
      if (progressError) throw progressError;
      navigate(`/projects/${project.id}`);
    } catch (error) {
      setError(error.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 lg:py-20">
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl text-center">Create Your Story</h2>
          <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
            Enter your story topic and let our AI handle the rest.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-8">
          <div className="space-y-2">
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
              Story Topic
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3"
                placeholder="e.g., The history of space exploration"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-6 shadow-inner">
            <h3 className="text-lg font-semibold text-gray-900">Process Overview</h3>
            <div className="mt-6 space-y-5">
              <Step icon={BookOpen} text="AI researches your topic thoroughly" />
              <Step icon={Wand2} text="Generates an engaging script" />
              <Step icon={CheckCircle2} text="Creates character designs with DALL·E" />
              <Step icon={Mic} text="Produces professional voiceovers" />
              <Step icon={Video} text="Compiles everything into a video" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors duration-200"
          >
            {loading ? 'Creating...' : 'Start Creating'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Step({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center space-x-4 text-gray-700">
      <Icon className="h-6 w-6 text-indigo-600" />
      <span>{text}</span>
    </div>
  );
}