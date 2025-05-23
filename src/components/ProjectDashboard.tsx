import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Project, StoryProgress } from '../types';
import { BookOpen, Wand2, Palette, Mic, Video, Loader2, Brain } from 'lucide-react'; // Added Brain for AI

interface ResearchData {
  summary: string;
  key_points: string[];
  sources: string[];
}

export default function ProjectDashboard() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [progress, setProgress] = useState<StoryProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchData, setResearchData] = useState<ResearchData | null>(null);


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
        if (projectData && projectData.research_data) {
          setResearchData(projectData.research_data as ResearchData);
        }

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

  const handleStartResearch = async () => {
    if (!project) return;

    setIsResearching(true);
    setResearchError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('ai-research', {
        body: { project_id: project.id, topic: project.topic },
      });

      if (functionError) {
        // The functionError from supabase.functions.invoke might be an object with a message property
        throw new Error(functionError.message || 'Unknown error invoking function');
      }
      if (data.error) { // Check if the function itself returned an error object (e.g. from its own try/catch)
        throw new Error(data.error);
      }


      setResearchData(data);
      // Update local project and progress state
      setProject(prev => prev ? { ...prev, research_data: data } : null);
      setProgress(prev => prev ? { ...prev, research: true } : null);
      setResearchError(null); // Clear any previous errors

    } catch (err: any) {
      console.error("Error calling ai-research function:", err);
      const displayError = err.message || 'An unexpected error occurred. Please try again.';
      setResearchError('Failed to complete AI research: ' + displayError);
    } finally {
      setIsResearching(false);
    }
  };

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
    { name: 'Research', icon: BookOpen, completed: progress.research, data: researchData },
    { name: 'Script', icon: Wand2, completed: progress.script, data: null }, // Assuming no specific data for these steps yet
    { name: 'Characters', icon: Palette, completed: progress.characters, data: null },
    { name: 'Audio', icon: Mic, completed: progress.audio, data: null },
    { name: 'Video', icon: Video, completed: progress.video, data: null },
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
                  <React.Fragment key={step.name}>
                    <div className="relative">
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
                            {step.completed ? 'Completed' : 'Pending'}
                          </div>
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <div className="absolute left-6 top-12 h-full w-px bg-gray-200" />
                      )}
                    </div>
                    {step.name === 'Research' && (
                      <div className="ml-16 mt-4 mb-4 pb-4 pl-1 border-l border-gray-200">
                        {/* Button and Loading/Error display section for Research step */}
                        <div className="ml-16 mt-4 mb-4 pb-4 pl-1 border-l border-gray-200 min-h-[60px]"> {/* Added min-h for layout consistency */}
                          {!researchData && !progress.research && !isResearching && (
                            <button
                              onClick={handleStartResearch}
                              disabled={isResearching} // This is somewhat redundant due to the !isResearching in the parent conditional
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                              <Brain className="mr-2 h-5 w-5" />
                              Start AI Research
                            </button>
                          )}
                          {isResearching && (
                             <div className="flex items-center text-sm text-indigo-600">
                               <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                               Researching topic, please wait... This may take a moment.
                             </div>
                          )}
                          {researchError && !isResearching && ( // Only show error if not currently researching
                            <p className="text-sm text-red-600 mt-2">{researchError}</p>
                          )}
                          {researchData && !isResearching && ( // Only show data if not currently researching (and no error)
                            <div className="mt-2 space-y-3 text-sm">
                              <div>
                                <h4 className="font-medium text-gray-800">Research Summary:</h4>
                                <p className="text-gray-600 whitespace-pre-wrap">{researchData.summary}</p>
                              </div>
                              {researchData.key_points && researchData.key_points.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-800">Key Points:</h4>
                                  <ul className="list-disc list-inside text-gray-600">
                                    {researchData.key_points.map((point, i) => <li key={i}>{point}</li>)}
                                  </ul>
                                </div>
                              )}
                              {researchData.sources && researchData.sources.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-800">Sources:</h4>
                                  <ul className="list-disc list-inside text-gray-600">
                                    {researchData.sources.map((source, i) => <li key={i}>{source}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}