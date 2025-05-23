import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define a type for our research data for clarity
interface ResearchData {
  summary: string;
  key_points: string[];
  sources: string[];
}

// Extracted request handler logic
export async function handleRequest(req: Request, supabaseClient: SupabaseClient): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { topic, project_id } = await req.json()
    console.log('Researching topic:', topic, 'for project_id:', project_id)

    if (!project_id) {
      // Return a 400 Bad Request for missing project_id
      return new Response(
        JSON.stringify({ error: "project_id is required." }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } },
      )
    }
    if (!topic) {
       // Return a 400 Bad Request for missing topic
       return new Response(
        JSON.stringify({ error: "topic is required." }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } },
      )
    }

    // const apiKey = Deno.env.get("RESEARCH_API_KEY");
    // if (!apiKey) {
    //   console.error('RESEARCH_API_KEY not found in environment variables')
    //   return new Response(
    //     JSON.stringify({ error: 'API key not configured.' }),
    //     { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } },
    //   )
    // }

    // Mock API call simulation (remains the same)
    const mockApiCall = async (currentTopic: string): Promise<ResearchData> => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Reduced delay for tests

      if (currentTopic === "test_success") {
        return {
          summary: `This is a mock summary for the topic: ${currentTopic}.`,
          key_points: ["Point 1", "Point 2", "Point 3"],
          sources: ["mock_source1.com", "mock_source2.com"]
        };
      } else if (currentTopic === "test_error") {
        throw new Error("Simulated error from research service for topic: " + currentTopic);
      } else {
        return {
          summary: `No specific mock data for topic: ${currentTopic}. Generic response.`,
          key_points: [],
          sources: []
        };
      }
    };

    const researchData = await mockApiCall(topic);

    // Store research data in projects table
    const { error: projectUpdateError } = await supabaseClient
      .from('projects')
      .update({ research_data: researchData })
      .eq('id', project_id)

    if (projectUpdateError) {
      console.error('Error updating project research data:', projectUpdateError)
      throw new Error(`Failed to update project research data: ${projectUpdateError.message}`)
    }
    console.log('Project research data updated for project_id:', project_id)

    // Update story_progress table
    const { error: progressUpdateError } = await supabaseClient
      .from('story_progress')
      .update({ research: true })
      .eq('project_id', project_id)

    if (progressUpdateError) {
      console.error('Error updating story progress:', progressUpdateError)
      throw new Error(`Failed to update story progress: ${progressUpdateError.message}`)
    }
    console.log('Story progress updated for project_id:', project_id)

    return new Response(
      JSON.stringify(researchData),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } },
    )
  } catch (error) {
    console.error('Error in ai-research function:', error.message)
    // Ensure consistent error response structure
    const errorMessage = error.message || "An unexpected error occurred.";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } },
    )
  }
}

// Main serve function using the extracted handler
serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key not found in environment variables')
    return new Response(
      JSON.stringify({ error: 'Supabase client not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } },
    )
  }

  // Create a new Supabase client for each request.
  // The Authorization header from the original request is passed to the Supabase client.
  // This ensures that RLS policies are correctly applied.
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  })

  return await handleRequest(req, supabaseClient);
})
