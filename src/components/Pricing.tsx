import React from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const tiers = [
  {
    name: 'Hobby',
    price: 0,
    features: ['5 stories per month', 'Basic character designs', 'Standard voices', '720p video quality'],
    cta: 'Start for free',
    mostPopular: false,
  },
  {
    name: 'Pro',
    price: 29,
    features: [
      'Unlimited stories',
      'Advanced character customization',
      'Premium voice selection',
      '4K video quality',
      'Priority support',
    ],
    cta: 'Subscribe now',
    mostPopular: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    features: [
      'Custom story length',
      'Dedicated account manager',
      'Custom voice training',
      'API access',
      'Advanced analytics',
    ],
    cta: 'Contact sales',
    mostPopular: false,
  },
];

export default function Pricing() {
  return (
    <div id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">Pricing</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Choose the perfect plan for your needs
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Start creating amazing stories today with our flexible pricing options.
          </p>
        </div>
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col justify-between rounded-3xl bg-white p-8 xl:p-10 ${
                tier.mostPopular
                  ? 'lg:z-10 ring-2 ring-indigo-600 shadow-xl'
                  : 'ring-1 ring-gray-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className="text-lg font-semibold leading-8 text-gray-900">{tier.name}</h3>
                  {tier.mostPopular && (
                    <p className="rounded-full bg-indigo-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-indigo-600">
                      Most popular
                    </p>
                  )}
                </div>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">${tier.price}</span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-indigo-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                to="/auth"
                className={`mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  tier.mostPopular
                    ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-indigo-600 transition-colors duration-200'
                    : 'text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300 hover:bg-indigo-50 transition-all duration-200'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}