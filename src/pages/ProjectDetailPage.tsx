import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { aiServiceConfig, retryAIService } from '../lib/ai-services';
import { AIServiceError, getUserFriendlyMessage, RecoveryStrategies } from '../lib/error-handling';
import { AIErrorBoundary } from '../components/ErrorBoundary';
import { BookOpen, Wand2, Image, Mic, Video, CheckCircle2, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

interface Project {
  id: string;
  user_id: string;
  topic: string;
  status: string;
  research_data?: any;
  created_at: string;
  updated_at: string;
}

interface StoryProgress {
  research: boolean;
  script: boolean;
  characters: boolean;
  audio: boolean;
  video: boolean;
}

interface StoryStage {
  id: string;
  project_id: string;
  stage_name: string;
  status: string;
  content?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface StageInfo {
  name: string;
  icon: React.ElementType;
  description: string;
  completed: boolean;
  active: boolean;
  error?: string;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [progress, setProgress] = useState<StoryProgress | null>(null);
  const [scriptData, setScriptData] = useState<any>(null);
  const [characterData, setCharacterData] = useState<any>(null);
  const [audioData, setAudioData] = useState<any>(null);
  const [videoData, setVideoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchProjectDetails();
    }
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch progress
      const { data: progressData, error: progressError } = await supabase
        .from('story_progress')
        .select('*')
        .eq('project_id', id)
        .single();

      if (progressError) throw progressError;
      setProgress(progressData);

      // Fetch script data if available
      const { data: scriptStage } = await supabase
        .from('story_stages')
        .select('*')
        .eq('project_id', id)
        .eq('stage_name', 'script')
        .single();
        
      if (scriptStage && scriptStage.content) {
        setScriptData(scriptStage.content);
      }

      // Fetch character data if available
      const { data: characterStage } = await supabase
        .from('story_stages')
        .select('*')
        .eq('project_id', id)
        .eq('stage_name', 'characters')
        .single();
        
      if (characterStage && characterStage.content) {
        setCharacterData(characterStage.content);
      }

      // Fetch audio data if available
      const { data: audioStage } = await supabase
        .from('story_stages')
        .select('*')
        .eq('project_id', id)
        .eq('stage_name', 'audio')
        .single();
        
      if (audioStage && audioStage.content) {
        setAudioData(audioStage.content);
      }

      // Fetch video data if available
      const { data: videoStage } = await supabase
        .from('story_stages')
        .select('*')
        .eq('project_id', id)
        .eq('stage_name', 'video')
        .single();
        
      if (videoStage && videoStage.content) {
        setVideoData(videoStage.content);
      }

      // Auto-start stages based on current status
      if (projectData.status === 'research' && !progressData.research && !projectData.research_data) {
        await startResearch(projectData);
      } else if (projectData.status === 'script' && !progressData.script) {
        await startScriptGeneration(projectData);
      } else if (projectData.status === 'characters' && !progressData.characters) {
        await startCharacterDesign(projectData);
      } else if (projectData.status === 'audio' && !progressData.audio) {
        await startVoiceSynthesis(projectData);
      } else if (projectData.status === 'video' && !progressData.video) {
        await startVideoCompilation(projectData);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const startResearch = async (projectData: Project) => {
    if (!aiServiceConfig.research.enabled) {
      console.log('AI Research is disabled. Using mock data.');
      return;
    }

    setProcessing(true);
    try {
      // Call the AI research edge function
      const { data, error } = await retryAIService(
        async () => supabase.functions.invoke('ai-research', {
          body: { 
            topic: projectData.topic,
            project_id: projectData.id
          }
        }),
        'research'
      );

      if (error) throw error;

      // Refresh project data to get updated research
      await fetchProjectDetails();
      
      // Don't automatically move to next stage - wait for manual trigger or page refresh
    } catch (error: any) {
      console.error('Research failed:', error);
      const userMessage = error instanceof AIServiceError ? error.userMessage : getUserFriendlyMessage(error);
      setError(userMessage);
      
      // Store error and queue for retry if retryable
      await supabase
        .from('story_stages')
        .insert({
          project_id: projectData.id,
          stage_name: 'research',
          status: 'failed',
          error_message: error.message || 'Research failed',
          created_at: new Date().toISOString()
        });
        
      if (error instanceof AIServiceError && error.retryable) {
        await RecoveryStrategies.queueForRetry(projectData.id, 'research', supabase);
      }
    } finally {
      setProcessing(false);
    }
  };

  const startScriptGeneration = async (projectData: Project) => {
    if (!aiServiceConfig.script.enabled) {
      console.log('Script generation is disabled.');
      return;
    }

    setProcessing(true);
    try {
      // Call the AI script generation edge function
      const { data, error } = await retryAIService(
        async () => supabase.functions.invoke('ai-script', {
          body: { 
            project_id: projectData.id
          }
        }),
        'script'
      );

      if (error) throw error;
      
      // Store the script data
      setScriptData(data);
      
      // Refresh project data
      await fetchProjectDetails();
    } catch (error: any) {
      console.error('Script generation failed:', error);
      setError('Failed to generate script. Please try again.');
      
      // Store error in database
      await supabase
        .from('story_stages')
        .insert({
          project_id: projectData.id,
          stage_name: 'script',
          status: 'failed',
          error_message: error.message || 'Script generation failed',
          created_at: new Date().toISOString()
        });
    } finally {
      setProcessing(false);
    }
  };

  const startCharacterDesign = async (projectData: Project) => {
    if (!aiServiceConfig.characterDesign.enabled) {
      console.log('Character design is disabled.');
      return;
    }

    setProcessing(true);
    try {
      // Call the AI character design edge function
      const { data, error } = await retryAIService(
        async () => supabase.functions.invoke('ai-character-design', {
          body: { 
            project_id: projectData.id
          }
        }),
        'characterDesign'
      );

      if (error) throw error;
      
      // Store the character data
      setCharacterData(data);
      
      // Refresh project data
      await fetchProjectDetails();
    } catch (error: any) {
      console.error('Character design failed:', error);
      setError('Failed to generate character designs. Please try again.');
      
      // Store error in database
      await supabase
        .from('story_stages')
        .insert({
          project_id: projectData.id,
          stage_name: 'characters',
          status: 'failed',
          error_message: error.message || 'Character design failed',
          created_at: new Date().toISOString()
        });
    } finally {
      setProcessing(false);
    }
  };

  const startVoiceSynthesis = async (projectData: Project) => {
    if (!aiServiceConfig.voiceSynthesis.enabled) {
      console.log('Voice synthesis is disabled.');
      return;
    }

    setProcessing(true);
    try {
      // Call the AI voice synthesis edge function
      const { data, error } = await retryAIService(
        async () => supabase.functions.invoke('ai-voice-synthesis', {
          body: { 
            project_id: projectData.id
          }
        }),
        'voiceSynthesis'
      );

      if (error) throw error;
      
      // Store the audio data
      setAudioData(data);
      
      // Refresh project data
      await fetchProjectDetails();
    } catch (error: any) {
      console.error('Voice synthesis failed:', error);
      setError('Failed to generate voice narration. Please try again.');
      
      // Store error in database
      await supabase
        .from('story_stages')
        .insert({
          project_id: projectData.id,
          stage_name: 'audio',
          status: 'failed',
          error_message: error.message || 'Voice synthesis failed',
          created_at: new Date().toISOString()
        });
    } finally {
      setProcessing(false);
    }
  };

  const startVideoCompilation = async (projectData: Project) => {
    if (!aiServiceConfig.videoCompilation.enabled) {
      console.log('Video compilation is disabled.');
      return;
    }

    setProcessing(true);
    try {
      // Call the video compilation edge function
      const { data, error } = await retryAIService(
        async () => supabase.functions.invoke('video-compilation', {
          body: { 
            project_id: projectData.id
          }
        }),
        'videoCompilation'
      );

      if (error) throw error;
      
      // Store the video data
      setVideoData(data);
      
      // Refresh project data
      await fetchProjectDetails();
    } catch (error: any) {
      console.error('Video compilation failed:', error);
      setError('Failed to compile video. Please try again.');
      
      // Store error in database
      await supabase
        .from('story_stages')
        .insert({
          project_id: projectData.id,
          stage_name: 'video',
          status: 'failed',
          error_message: error.message || 'Video compilation failed',
          created_at: new Date().toISOString()
        });
    } finally {
      setProcessing(false);
    }
  };

  const updateProjectStatus = async (newStatus: string) => {
    if (!project) return;

    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', project.id);

    if (error) {
      console.error('Failed to update project status:', error);
    } else {
      setProject({ ...project, status: newStatus });
    }
  };

  const getStages = (): StageInfo[] => {
    if (!project || !progress) return [];

    const currentStatus = project.status;
    const stages: StageInfo[] = [
      {
        name: 'Research',
        icon: BookOpen,
        description: 'AI researches your topic',
        completed: progress.research,
        active: currentStatus === 'research'
      },
      {
        name: 'Script',
        icon: Wand2,
        description: 'Generate engaging narrative',
        completed: progress.script,
        active: currentStatus === 'script'
      },
      {
        name: 'Characters',
        icon: Image,
        description: 'Design characters with DALL·E',
        completed: progress.characters,
        active: currentStatus === 'characters'
      },
      {
        name: 'Audio',
        icon: Mic,
        description: 'Create voiceovers',
        completed: progress.audio,
        active: currentStatus === 'audio'
      },
      {
        name: 'Video',
        icon: Video,
        description: 'Compile final video',
        completed: progress.video,
        active: currentStatus === 'video'
      }
    ];

    return stages;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const stages = getStages();

  return (
    <AIErrorBoundary service="Project Details" onError={(error) => setError(getUserFriendlyMessage(error))}>
      <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">{project.topic}</h1>
        <p className="text-gray-600 mt-2">
          Created {new Date(project.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Progress Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Production Progress</h2>
        
        <div className="space-y-8">
          {stages.map((stage, index) => (
            <div key={stage.name} className="relative">
              {index < stages.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
              )}
              
              <div className="flex items-start space-x-4">
                <div className={`
                  flex items-center justify-center w-12 h-12 rounded-full
                  ${stage.completed ? 'bg-green-100' : stage.active ? 'bg-indigo-100' : 'bg-gray-100'}
                `}>
                  {stage.completed ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : stage.active && processing ? (
                    <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                  ) : (
                    <stage.icon className={`h-6 w-6 ${stage.active ? 'text-indigo-600' : 'text-gray-400'}`} />
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className={`text-lg font-medium ${stage.active ? 'text-gray-900' : 'text-gray-600'}`}>
                    {stage.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{stage.description}</p>
                  
                  {stage.active && processing && (
                    <p className="text-sm text-indigo-600 mt-2">Processing...</p>
                  )}
                  
                  {stage.error && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      {stage.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Research Results */}
      {project.research_data && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Research Results</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{project.research_data.summary}</p>
            </div>
            
            {project.research_data.key_points && project.research_data.key_points.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Key Points</h3>
                <ul className="list-disc list-inside space-y-1">
                  {project.research_data.key_points.map((point: string, index: number) => (
                    <li key={index} className="text-gray-700">{point}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {project.research_data.sources && project.research_data.sources.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Sources</h3>
                <ul className="space-y-1">
                  {project.research_data.sources.map((source: string, index: number) => (
                    <li key={index}>
                      <a 
                        href={source} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 text-sm"
                      >
                        {source}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Script Results */}
      {scriptData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Script</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900">Title</h3>
              <p className="text-lg text-gray-800 mt-1">{scriptData.title}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700">Duration</h4>
                <p className="text-gray-600">{scriptData.duration_estimate}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-700">Target Audience</h4>
                <p className="text-gray-600">{scriptData.target_audience}</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Scenes</h3>
              <div className="space-y-4">
                {scriptData.scenes.map((scene: any) => (
                  <div key={scene.scene_number} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-800">Scene {scene.scene_number}</h4>
                      <span className="text-sm text-gray-500">{scene.duration}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{scene.description}</p>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-700 italic">"{scene.narration}"</p>
                    </div>
                    {scene.visuals && scene.visuals.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Visuals:</p>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {scene.visuals.map((visual: string, idx: number) => (
                            <li key={idx}>{visual}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Character Designs */}
      {characterData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Character Designs & Visuals</h2>
          
          {/* Style Guide */}
          <div className="mb-8">
            <h3 className="font-medium text-gray-900 mb-3">Visual Style Guide</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700"><strong>Art Style:</strong> {characterData.style_guide.art_style}</p>
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Color Palette:</p>
                <div className="flex gap-2">
                  {characterData.style_guide.color_palette.map((color: string, idx: number) => (
                    <div 
                      key={idx} 
                      className="w-8 h-8 rounded border border-gray-300" 
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Characters */}
          <div className="mb-8">
            <h3 className="font-medium text-gray-900 mb-4">Characters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {characterData.characters.map((character: any, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={character.image_url} 
                    alt={character.name}
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(character.name);
                    }}
                  />
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900">{character.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{character.role}</p>
                    <p className="text-sm text-gray-700 mt-2">{character.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Scene Visuals */}
          {characterData.scenes && characterData.scenes.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Key Scene Visuals</h3>
              <div className="space-y-4">
                {characterData.scenes.map((scene: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                    <img 
                      src={scene.image_url} 
                      alt={`Scene ${scene.scene_number}`}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/800x400?text=Scene+' + scene.scene_number;
                      }}
                    />
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900">Scene {scene.scene_number}</h4>
                      <p className="text-sm text-gray-700 mt-1">{scene.description}</p>
                      <p className="text-sm text-gray-600 mt-2">Mood: {scene.mood}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audio/Voice Results */}
      {audioData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Voice Narration</h2>
          
          {/* Voice Settings */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Voice Settings</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700"><strong>Voice:</strong> {audioData.voice_settings.voice_name}</p>
              <p className="text-sm text-gray-700 mt-1"><strong>Total Duration:</strong> {audioData.total_duration}</p>
            </div>
          </div>
          
          {/* Audio Files */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">Scene Audio</h3>
            <div className="space-y-4">
              {audioData.audio_files.map((audio: any) => (
                <div key={audio.scene_number} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-800">Scene {audio.scene_number}</h4>
                    <span className="text-sm text-gray-500">{Math.floor(audio.duration / 60)}:{(audio.duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 italic">"{audio.narration_text}"</p>
                  {audio.audio_url && (
                    <audio controls className="w-full">
                      <source src={audio.audio_url} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Final Video */}
      {videoData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Final Video</h2>
          
          {/* Video Player */}
          <div className="mb-6">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              {videoData.video_url.includes('example.com') ? (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Video Preview</p>
                    <p className="text-sm opacity-75 mt-2">Full video compilation in production mode</p>
                  </div>
                </div>
              ) : (
                <video 
                  controls 
                  className="w-full h-full"
                  poster={videoData.thumbnail_url}
                >
                  <source src={videoData.video_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          </div>
          
          {/* Video Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Duration</p>
              <p className="text-lg text-gray-900">{videoData.duration}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Resolution</p>
              <p className="text-lg text-gray-900">{videoData.resolution}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Format</p>
              <p className="text-lg text-gray-900">{videoData.format.toUpperCase()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">File Size</p>
              <p className="text-lg text-gray-900">{(videoData.file_size / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
          </div>
          
          {/* Download Button */}
          <div className="mt-6 flex gap-4">
            <a 
              href={videoData.video_url} 
              download={`${project.topic.replace(/\s+/g, '_')}_video.mp4`}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Video className="h-5 w-5 mr-2" />
              Download Video
            </a>
            <a 
              href={videoData.thumbnail_url} 
              download={`${project.topic.replace(/\s+/g, '_')}_thumbnail.jpg`}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Image className="h-5 w-5 mr-2" />
              Download Thumbnail
            </a>
          </div>
        </div>
      )}
      </div>
    </AIErrorBoundary>
  );
}