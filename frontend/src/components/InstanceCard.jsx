import { Play, Square, Trash2, FileText, ExternalLink, Circle } from 'lucide-react';

export default function InstanceCard({ instance, onStart, onStop, onDelete, onShowLogs }) {
  const isRunning = instance.isRunning;
  const statusColor = isRunning ? 'bg-green-500' : 'bg-gray-400';
  const statusText = isRunning ? 'Running' : 'Stopped';

  return (
    <div className="card hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Circle className={`w-3 h-3 ${statusColor} rounded-full`} fill="currentColor" />
            <span className="text-xs font-medium text-gray-600">{statusText}</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">{instance.name}</h3>
          <p className="text-sm text-gray-600">@{instance.tiktok_username}</p>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Port:</span>
          <span className="font-mono font-medium">{instance.port}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Account ID:</span>
          <span className="font-mono text-xs">{instance.account_id}</span>
        </div>
        {isRunning && (
          <a
            href={`http://localhost:${instance.port}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 text-primary-600 hover:text-primary-700 py-2 px-3 bg-primary-50 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Dashboard</span>
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2 pt-4 border-t">
        {isRunning ? (
          <button
            onClick={() => onStop(instance.id)}
            className="flex-1 btn btn-secondary flex items-center justify-center space-x-2 py-2"
          >
            <Square className="w-4 h-4" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={() => onStart(instance.id)}
            className="flex-1 btn btn-success flex items-center justify-center space-x-2 py-2"
          >
            <Play className="w-4 h-4" />
            <span>Start</span>
          </button>
        )}

        <button
          onClick={() => onShowLogs(instance)}
          className="btn btn-secondary p-2"
          title="View Logs"
        >
          <FileText className="w-4 h-4" />
        </button>

        <button
          onClick={() => onDelete(instance.id)}
          className="btn btn-danger p-2"
          title="Delete Instance"
          disabled={isRunning}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Created Date */}
      <div className="mt-3 pt-3 border-t text-xs text-gray-500">
        Created: {new Date(instance.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
