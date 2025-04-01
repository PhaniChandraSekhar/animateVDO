import React from 'react';
import { Users, Trophy, Target } from 'lucide-react';

export default function About() {
  return (
    <div id="about" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">About Us</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 sm:text-4xl">
            Revolutionizing Story Creation
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            We're a team of passionate creators and engineers dedicated to making story creation accessible to everyone through AI.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            <div className="flex flex-col items-start">
              <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-3 text-white shadow-lg">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <dt className="mt-4 font-semibold text-gray-900">Our Team</dt>
              <dd className="mt-2 leading-7 text-gray-600">
                A diverse group of storytellers, AI experts, and developers working to democratize content creation.
              </dd>
            </div>
            <div className="flex flex-col items-start">
              <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-3 text-white shadow-lg">
                <Trophy className="h-6 w-6 text-indigo-600" />
              </div>
              <dt className="mt-4 font-semibold text-gray-900">Our Mission</dt>
              <dd className="mt-2 leading-7 text-gray-600">
                To empower creators with AI tools that make high-quality storytelling accessible and efficient.
              </dd>
            </div>
            <div className="flex flex-col items-start">
              <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-3 text-white shadow-lg">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <dt className="mt-4 font-semibold text-gray-900">Our Vision</dt>
              <dd className="mt-2 leading-7 text-gray-600">
                A world where anyone can bring their stories to life through the power of AI technology.
              </dd>
            </div>
          </dl>
          
          <div className="mt-16 relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-base font-semibold leading-6 text-gray-900">Our Values</span>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {['Innovation', 'Quality', 'Accessibility', 'Community'].map((value) => (
              <div key={value} className="relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 hover:shadow-lg transition-shadow duration-200">
                <dt className="text-base font-semibold leading-7 text-gray-900">{value}</dt>
                <dd className="mt-2 text-sm leading-6 text-gray-600">
                  We believe in pushing boundaries while maintaining the highest standards of quality and making our technology accessible to everyone.
                </dd>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </div>
  );
}