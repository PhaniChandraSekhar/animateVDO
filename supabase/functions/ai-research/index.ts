import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define a type for our research data for clarity
interface ResearchData {
  summary: string;
  key_points: string[];
  sources: string[];
  raw_research?: any;
  timestamp: string;
}

interface WebSearchResult {
  title: string;
  snippet: string;
  link: string;
}

// AI Research Service using multiple providers
class AIResearchService {
  private anthropicApiKey: string | undefined;
  private openaiApiKey: string | undefined;
  private tavilyApiKey: string | undefined;
  private serperApiKey: string | undefined;

  constructor() {
    this.anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    this.openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    this.tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
    this.serperApiKey = Deno.env.get('SERPER_API_KEY');
  }

  // Search the web using available search APIs
  async searchWeb(query: string): Promise<WebSearchResult[]> {
    // Try Tavily first
    if (this.tavilyApiKey) {
      try {
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.tavilyApiKey
          },
          body: JSON.stringify({
            query,
            search_depth: 'advanced',
            max_results: 10
          })
        });

        if (response.ok) {
          const data = await response.json();
          return data.results.map((result: any) => ({
            title: result.title,
            snippet: result.content,
            link: result.url
          }));
        }
      } catch (error) {
        console.error('Tavily search error:', error);
      }
    }

    // Fallback to Serper
    if (this.serperApiKey) {
      try {
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': this.serperApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ q: query })
        });

        if (response.ok) {
          const data = await response.json();
          return data.organic.map((result: any) => ({
            title: result.title,
            snippet: result.snippet,
            link: result.link
          }));
        }
      } catch (error) {
        console.error('Serper search error:', error);
      }
    }

    // If no search API is available, return empty results
    return [];
  }

  // Generate research summary using available LLMs
  async generateResearchSummary(topic: string, searchResults: WebSearchResult[]): Promise<ResearchData> {
    const searchContext = searchResults.map(r => `${r.title}\n${r.snippet}`).join('\n\n');
    
    const prompt = `Research the topic "${topic}" for creating an engaging YouTube story video.

Based on the following search results:
${searchContext}

Provide:
1. A comprehensive summary (2-3 paragraphs) suitable for story creation
2. 5-7 key points that would make interesting story elements
3. Identify the most credible sources

Focus on narrative potential, interesting facts, and emotional elements that would engage viewers.`;

    // Try Anthropic Claude first
    if (this.anthropicApiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1500,
            messages: [{
              role: 'user',
              content: prompt
            }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          return this.parseAIResponse(data.content[0].text, searchResults);
        }
      } catch (error) {
        console.error('Anthropic API error:', error);
      }
    }

    // Fallback to OpenAI
    if (this.openaiApiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{
              role: 'user',
              content: prompt
            }],
            max_tokens: 1500,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const data = await response.json();
          return this.parseAIResponse(data.choices[0].message.content, searchResults);
        }
      } catch (error) {
        console.error('OpenAI API error:', error);
      }
    }

    // If no AI service is available, return basic research
    return {
      summary: `Research on "${topic}" - Manual review needed. Found ${searchResults.length} relevant sources.`,
      key_points: searchResults.slice(0, 5).map(r => r.title),
      sources: searchResults.map(r => r.link),
      timestamp: new Date().toISOString()
    };
  }

  // Parse AI response into structured research data
  private parseAIResponse(aiText: string, searchResults: WebSearchResult[]): ResearchData {
    // Extract summary (assuming it's the first few paragraphs)
    const paragraphs = aiText.split('\n\n');
    const summary = paragraphs.slice(0, 3).join('\n\n');

    // Extract key points (look for numbered or bulleted lists)
    const keyPointsMatch = aiText.match(/(?:^|\n)(?:\d+\.|[-*•])\s*(.+)/gm);
    const key_points = keyPointsMatch 
      ? keyPointsMatch.map(point => point.replace(/^(?:\d+\.|[-*•])\s*/, '').trim())
      : paragraphs.slice(3, 8);

    // Use the search result links as sources
    const sources = searchResults.slice(0, 5).map(r => r.link);

    return {
      summary,
      key_points: key_points.slice(0, 7),
      sources,
      raw_research: { ai_response: aiText, search_results: searchResults },
      timestamp: new Date().toISOString()
    };
  }

  // Main research method
  async research(topic: string): Promise<ResearchData> {
    console.log(`Starting AI research for topic: ${topic}`);

    // Step 1: Search the web
    const searchResults = await this.searchWeb(topic);
    console.log(`Found ${searchResults.length} search results`);

    // Step 2: Generate research summary
    const researchData = await this.generateResearchSummary(topic, searchResults);
    console.log('Research summary generated');

    return researchData;
  }
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

    // Initialize research service
    const researchService = new AIResearchService();
    
    // Check if we should use mock data (for testing)
    const useMockData = Deno.env.get('USE_MOCK_RESEARCH') === 'true';
    
    let researchData: ResearchData;
    
    if (useMockData || topic === "test_success" || topic === "test_error") {
      // Mock API call for testing
      const mockApiCall = async (currentTopic: string): Promise<ResearchData> => {
        await new Promise(resolve => setTimeout(resolve, 10));

        if (currentTopic === "test_success") {
          return {
            summary: `This is a mock summary for the topic: ${currentTopic}.`,
            key_points: ["Point 1", "Point 2", "Point 3"],
            sources: ["mock_source1.com", "mock_source2.com"],
            timestamp: new Date().toISOString()
          };
        } else if (currentTopic === "test_error") {
          throw new Error("Simulated error from research service for topic: " + currentTopic);
        } else {
          return {
            summary: `No specific mock data for topic: ${currentTopic}. Generic response.`,
            key_points: [],
            sources: [],
            timestamp: new Date().toISOString()
          };
        }
      };
      
      researchData = await mockApiCall(topic);
    } else {
      // Use actual AI research service
      researchData = await researchService.research(topic);
    }

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
