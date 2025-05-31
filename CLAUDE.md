# animateVDO - AI-Powered YouTube Story Video Creator

## Project Overview

animateVDO is an AI-powered platform that automates the entire process of creating animated story videos for YouTube. The platform transforms user ideas into complete videos through an end-to-end pipeline including AI research, script generation, character design, voiceover creation, and video compilation.

## Tech Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript 5.5.3
- **Build Tool**: Vite 5.4.2
- **Styling**: Tailwind CSS 3.4.1
- **Routing**: React Router DOM 6.22.2
- **Icons**: Lucide React
- **State Management**: React Context + Hooks

### Backend
- **Platform**: Supabase
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Edge Functions**: Deno runtime
- **Storage**: Supabase Storage (planned)

### AI Services (Planned)
- **Research**: Custom AI research APIs
- **Script Generation**: OpenAI/Anthropic APIs
- **Character Design**: DALL·E 3
- **Voice Generation**: ElevenLabs
- **Video Assembly**: Custom pipeline

## Features

### Implemented Features ✅
1. **User Authentication**
   - Sign up/Sign in with email
   - Protected routes
   - Role-based access (admin, reviewer, user)

2. **Dashboard**
   - Project statistics
   - Project grid view
   - Usage metrics display

3. **Project Management**
   - Create new projects
   - Track project status
   - Progress indicators for each stage

4. **Database Schema**
   - Users table with roles and quotas
   - Projects table with metadata
   - Story progress tracking
   - Stage-wise content storage
   - Review system structure
   - Usage metrics tracking

5. **UI/UX**
   - Responsive design
   - Modern gradient aesthetics
   - Loading states
   - Error handling

### Planned Features 🚧
1. **AI Research Module**
   - Topic analysis
   - Content gathering
   - Fact verification

2. **Script Generation**
   - AI-powered narrative creation
   - Multiple script styles
   - Character dialogue

3. **Character Design**
   - DALL·E 3 integration
   - Character consistency
   - Scene generation

4. **Audio Production**
   - ElevenLabs voice synthesis
   - Multiple voice options
   - Background music

5. **Video Compilation**
   - Automated video assembly
   - Transitions and effects
   - Export in multiple formats

6. **Subscription & Billing**
   - Stripe integration
   - Usage-based billing
   - Subscription management

## Requirements

### Development Environment
- Node.js 18+
- npm or yarn
- Git
- Supabase CLI (for local development)

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### API Keys (To be configured)
- OpenAI/Anthropic API key
- DALL·E 3 API access
- ElevenLabs API key
- Video processing service credentials

## Database Tables

1. **users**
   - id, email, name, role, created_at, usage_quota

2. **projects**
   - id, user_id, title, description, status, settings, research_data, created_at, updated_at

3. **story_progress**
   - id, project_id, research_completed, script_completed, characters_completed, audio_completed, video_completed

4. **story_stages**
   - id, project_id, stage_name, status, content, error_message, created_at, updated_at

5. **reviews**
   - id, project_id, stage_id, reviewer_id, status, feedback, created_at

6. **usage_metrics**
   - id, user_id, project_id, api_calls, tokens_used, cost, created_at

## TODO List

### High Priority 🔴
- [ ] Implement actual AI research functionality
- [ ] Create script generation module
- [ ] Integrate DALL·E 3 for character generation
- [ ] Set up ElevenLabs voice synthesis
- [ ] Build video compilation pipeline
- [ ] Add error handling for AI failures
- [ ] Implement retry mechanisms

### Medium Priority 🟡
- [ ] Add Stripe payment integration
- [ ] Build subscription management
- [ ] Create usage tracking system
- [ ] Implement review workflow
- [ ] Add project templates
- [ ] Create style presets
- [ ] Build export functionality

### Low Priority 🟢
- [ ] Add team collaboration features
- [ ] Implement project sharing
- [ ] Create analytics dashboard
- [ ] Add custom branding options
- [ ] Build API for external access
- [ ] Create mobile app
- [ ] Add batch processing

### UI/UX Improvements
- [ ] Add dark mode
- [ ] Improve loading animations
- [ ] Create onboarding flow
- [ ] Add tooltips and help
- [ ] Implement keyboard shortcuts
- [ ] Add progress notifications

### Technical Debt
- [ ] Add comprehensive testing
- [ ] Improve error boundaries
- [ ] Optimize bundle size
- [ ] Add performance monitoring
- [ ] Implement caching strategy
- [ ] Add logging system

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run type-check
```

## Project Structure

```
animateVDO/
├── src/
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── types/         # TypeScript types
│   ├── lib/           # Utilities and configs
│   └── main.tsx       # Entry point
├── supabase/
│   ├── functions/     # Edge functions
│   └── migrations/    # Database migrations
└── public/            # Static assets
```

## Notes for Development

1. **AI Integration Priority**: Focus on getting one complete pipeline working (research → script → video) before adding features
2. **Cost Management**: Implement usage tracking early to monitor API costs
3. **User Experience**: Keep the UI simple during initial development
4. **Testing**: Add tests for critical paths (auth, project creation, AI pipeline)
5. **Security**: Never expose API keys in frontend code

## Change Log

### 2025-01-31
- Initial CLAUDE.md file created
- Documented current project state
- Created comprehensive TODO list
- Added development guidelines
- **Implemented AI Research Module** ✅
  - Created AIResearchService class with support for multiple providers (Anthropic, OpenAI)
  - Integrated web search APIs (Tavily, Serper)
  - Added research data parsing and storage
  - Created ProjectDetailPage to display research progress and results
  - Added retry logic and error handling for AI services
  - Created ai-services.ts utility module for shared configurations
  - Updated edge function to use real AI services with fallback to mock data
- **Implemented Script Generation Module** ✅
  - Created ScriptGenerationService with Claude 3 Sonnet and GPT-4 support
  - Developed scene-by-scene script structure with narration and visuals
  - Added script parsing to extract structured data from AI responses
  - Integrated script display in ProjectDetailPage with scene breakdown
  - Implemented automatic progression from research to script generation
  - Added duration estimates and production metadata
- **Implemented DALL-E 3 Character Design** ✅
  - Created CharacterDesignService with DALL-E 3 integration
  - Automated character extraction from scripts
  - Dynamic art style selection based on content topic
  - Scene visual generation for key moments
  - Visual style guide with color palettes
  - Fallback placeholders for failed generations
- **Implemented ElevenLabs Voice Synthesis** ✅
  - Created VoiceSynthesisService with ElevenLabs API integration
  - Automatic voice selection based on content type
  - Scene-by-scene audio generation
  - Audio file storage in Supabase Storage
  - Duration calculation and tracking
  - Mock audio generation for testing
- **Implemented Video Compilation Pipeline** ✅
  - Created VideoCompilationService with FFmpeg integration planning
  - Scene asset preparation and mapping
  - Ken Burns effect implementation for images
  - Transition effects between scenes
  - Final video export configuration
  - Mock video generation for development
- **Implemented Comprehensive Error Handling** ✅
  - Created centralized error handling system with ErrorCode enum
  - Service-specific error handlers for each AI service
  - Retry logic with exponential backoff
  - User-friendly error messages
  - Error boundary components for React
  - Recovery strategies including fallbacks and retry queues
  - Database tables for error logs and retry queue
  - Integration with all AI service calls
- **Implemented Stripe Payment Integration** ✅
  - Created Stripe configuration with pricing plans
  - Built subscription checkout flow with Stripe Elements
  - Implemented webhook handler for subscription events
  - Database tables for subscriptions and payments
  - User quota enforcement based on plan limits
  - Real-time plan status updates in UI
  - Integrated checkout into pricing component
  - Added usage tracking in project creation
- **Created Usage Tracking System** ✅
  - Enhanced usage metrics database with service-specific fields
  - Built cost calculation system with pricing models
  - Created usage tracking utilities for all AI services
  - Implemented usage analytics dashboard with charts
  - Added monthly usage reports and limits checking
  - Integrated usage warnings and quota enforcement
  - Created shared usage tracker for edge functions
  - Added analytics tab to dashboard with detailed breakdowns

---
*This file should be updated whenever significant changes are made to the project.*