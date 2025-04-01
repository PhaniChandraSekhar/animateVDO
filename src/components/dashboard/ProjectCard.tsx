import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-700 bg-green-50';
      case 'error':
        return 'text-red-700 bg-red-50';
      default:
        return 'text-yellow-700 bg-yellow-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 truncate">
          {project.title}
        </h3>
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(project.status)}`}>
          {getStatusIcon(project.status)}
          <span className="ml-1 capitalize">{project.status}</span>
        </span>
      </div>
      
      {project.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
          {project.description}
        </p>
      )}
      
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-gray-500">
          Created {new Date(project.created_at).toLocaleDateString()}
        </div>
        <div className="text-indigo-600">
          Est. Cost: ${project.estimated_cost}
        </div>
      </div>
    </Link>
  );
}