import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wand2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Hero() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="relative isolate pt-14 dark:bg-gray-900">
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>
      
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
            Transform Ideas into Animated Stories with AI
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Automate your YouTube story creation with AI-powered research, scriptwriting, character design, and video production.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button
              onClick={handleGetStarted}
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {user ? 'Go to Dashboard' : 'Start Creating'}
            </button>
            <a href="#features" className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
              Watch demo <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-3xl ring-1 ring-gray-200 dark:ring-gray-700 lg:mx-0 lg:flex lg:max-w-none">
          <div className="p-8 sm:p-10 lg:flex-auto">
            <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">How it works</h3>
            <div className="mt-6 flex items-center gap-x-4">
              <div className="h-px flex-auto bg-gray-100 dark:bg-gray-700" />
            </div>
            <ul role="list" className="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 text-gray-600 dark:text-gray-300 sm:grid-cols-2 sm:gap-6">
              <li className="flex gap-x-3">
                <Wand2 className="h-6 w-5 flex-none text-indigo-600" aria-hidden="true" />
                AI-powered research and scriptwriting
              </li>
              <li className="flex gap-x-3">
                <Wand2 className="h-6 w-5 flex-none text-indigo-600" aria-hidden="true" />
                Character design with DALL·E 3
              </li>
              <li className="flex gap-x-3">
                <Wand2 className="h-6 w-5 flex-none text-indigo-600" aria-hidden="true" />
                Professional voiceovers with ElevenLabs
              </li>
              <li className="flex gap-x-3">
                <Wand2 className="h-6 w-5 flex-none text-indigo-600" aria-hidden="true" />
                Automated video compilation
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}