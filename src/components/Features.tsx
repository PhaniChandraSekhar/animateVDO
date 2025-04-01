import React from 'react';
import { Wand2, BookOpen, Mic, Video, Sparkles, Zap, Brain, Palette } from 'lucide-react';

export default function Features() {
  return (
    <div id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">AI-Powered Creation</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to create engaging stories
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Transform your ideas into captivating animated stories with our comprehensive AI toolkit.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none lg:grid lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
          <div className="relative pl-16">
            <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
              <Brain className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-8 tracking-tight text-gray-900">
                Smart Research
              </h3>
              <p className="mt-2 text-base leading-7 text-gray-600">
                Our AI analyzes multiple sources to gather comprehensive, accurate information for your story.
              </p>
            </div>
          </div>
          <div className="relative pl-16">
            <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
              <Wand2 className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-8 tracking-tight text-gray-900">
                Automated Scriptwriting
              </h3>
              <p className="mt-2 text-base leading-7 text-gray-600">
                Transform research into engaging narratives with our advanced language models.
              </p>
            </div>
          </div>
          <div className="relative pl-16">
            <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
              <Palette className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-8 tracking-tight text-gray-900">
                Character Design
              </h3>
              <p className="mt-2 text-base leading-7 text-gray-600">
                Generate unique, expressive characters using DALL·E 3's cutting-edge AI.
              </p>
            </div>
          </div>
          <div className="relative pl-16">
            <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
              <Mic className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-8 tracking-tight text-gray-900">
                Professional Audio
              </h3>
              <p className="mt-2 text-base leading-7 text-gray-600">
                Create natural voiceovers and background music with ElevenLabs' voice synthesis.
              </p>
            </div>
          </div>
          <div className="relative pl-16">
            <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
              <Video className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-8 tracking-tight text-gray-900">
                Video Production
              </h3>
              <p className="mt-2 text-base leading-7 text-gray-600">
                Automatically combine all elements into a polished, professional video.
              </p>
            </div>
          </div>
          <div className="relative pl-16">
            <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
              <Zap className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-8 tracking-tight text-gray-900">
                Fast Turnaround
              </h3>
              <p className="mt-2 text-base leading-7 text-gray-600">
                Complete your video projects in hours instead of days or weeks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}