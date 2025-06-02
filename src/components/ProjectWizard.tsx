import React, { useState, useEffect } from 'react';
import { Wand2, BookOpen, Mic, Video, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { canCreateStory, getUserPlan, PRICING_PLANS } from '../lib/stripe';

export default function ProjectWizard() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userPlan, setUserPlan] = useState<string>('hobby');
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [canCreate, setCanCreate] = useState({ allowed: true, reason: '' });
  const [creatingStage, setCreatingStage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkUserQuota();
  }, []);

  const checkUserQuota = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user data including plan and monthly count
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_plan, monthly_story_count')
      .eq('id', user.id)
      .single();

    if (userData) {
      const plan = userData.subscription_plan || 'hobby';
      setUserPlan(plan);
      setMonthlyCount(userData.monthly_story_count || 0);
      
      // Check if user can create more stories
      const canCreateResult = canCreateStory(plan as any, userData.monthly_story_count || 0);
      setCanCreate(canCreateResult);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Starting project creation...');
      setCreatingStage('Authenticating user...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      console.log('User authenticated:', user.id);
      setCreatingStage('Checking quota...');

      // Check quota again before creating
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_plan, monthly_story_count')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
        throw userError;
      }

      if (userData) {
        console.log('User data:', userData);
        const canCreateResult = canCreateStory(
          userData.subscription_plan as any,
          userData.monthly_story_count || 0
        );
        
        if (!canCreateResult.allowed) {
          setError(canCreateResult.reason || 'Cannot create more stories');
          setLoading(false);
          return;
        }
      }

      // Create project
      console.log('Creating project with topic:', topic);
      setCreatingStage('Creating project...');
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
      
      if (projectError) {
        console.error('Project creation error:', projectError);
        throw projectError;
      }
      
      console.log('Project created successfully:', project);
      
      // Create story progress
      console.log('Creating story progress for project:', project.id);
      setCreatingStage('Setting up story pipeline...');
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
      
      if (progressError) {
        console.error('Story progress creation error:', progressError);
        throw progressError;
      }
      
      console.log('Story progress created successfully');
      
      // Increment user's monthly story count
      console.log('Incrementing user story count...');
      const { error: rpcError } = await supabase.rpc('increment_story_count', { user_id_param: user.id });
      
      if (rpcError) {
        console.error('RPC error (increment_story_count):', rpcError);
        // Don't throw here, just log the error as this is not critical
      }
      
      console.log('Navigating to project:', `/projects/${project.id}`);
      setCreatingStage('Redirecting to project...');
      
      // Add a small delay to show the redirect message
      setTimeout(() => {
        navigate(`/projects/${project.id}`);
      }, 500);
    } catch (error: any) {
      console.error('Project creation failed:', error);
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

          {/* Usage Info */}
          {userPlan === 'hobby' && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                You're on the {PRICING_PLANS.hobby.name} plan: {monthlyCount}/{PRICING_PLANS.hobby.limits.stories_per_month} stories this month
              </p>
              {monthlyCount >= PRICING_PLANS.hobby.limits.stories_per_month - 1 && (
                <p className="text-sm text-blue-700 mt-1">
                  <a href="#pricing" className="underline font-medium">Upgrade to Pro</a> for unlimited stories!
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !canCreate.allowed}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors duration-200"
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                {creatingStage || 'Creating...'}
              </span>
            ) : !canCreate.allowed ? 'Upgrade to Continue' : 'Start Creating'}
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