import React from 'react';
import { 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

interface Stat {
  name: string;
  value: number;
  icon: React.ElementType;
  change: number;
  changeType: 'increase' | 'decrease';
}

const stats: Stat[] = [
  {
    name: 'Total Projects',
    value: 12,
    icon: Layers,
    change: 12,
    changeType: 'increase',
  },
  {
    name: 'Completed',
    value: 4,
    icon: CheckCircle2,
    change: 2,
    changeType: 'increase',
  },
  {
    name: 'In Progress',
    value: 7,
    icon: Clock,
    change: 3,
    changeType: 'increase',
  },
  {
    name: 'Issues',
    value: 1,
    icon: AlertTriangle,
    change: 1,
    changeType: 'decrease',
  },
];

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6"
          >
            <dt>
              <div className="absolute rounded-md bg-indigo-500 p-3">
                <Icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {stat.value}
              </p>
              <p
                className={`ml-2 flex items-baseline text-sm font-semibold ${
                  stat.changeType === 'increase'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                <TrendingUp
                  className={`h-4 w-4 flex-shrink-0 self-center ${
                    stat.changeType === 'increase'
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="sr-only">
                  {stat.changeType === 'increase' ? 'Increased by' : 'Decreased by'}
                </span>
                {stat.change}
              </p>
            </dd>
          </div>
        );
      })}
    </div>
  );
}