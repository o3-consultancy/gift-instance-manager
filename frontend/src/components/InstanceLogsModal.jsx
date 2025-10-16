import { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { instancesAPI } from '../services/api';

export default function InstanceLogsModal({ instance, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tail, setTail] = useState(100);

  useEffect(() => {
    loadLogs();
  }, [tail]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await instancesAPI.getLogs(instance.id, tail);
      if (response.success) {
        setLogs(response.logs || []);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Instance Logs</h2>
            <p className="text-sm text-gray-600">{instance.name}</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={tail}
              onChange={(e) => setTail(parseInt(e.target.value))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1"
            >
              <option value={50}>50 lines</option>
              <option value={100}>100 lines</option>
              <option value={200}>200 lines</option>
              <option value={500}>500 lines</option>
            </select>
            <button
              onClick={loadLogs}
              className="btn btn-secondary p-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Logs Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-600">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-600">
              No logs available
              {!instance.isRunning && (
                <p className="text-sm mt-2">Instance is not running</p>
              )}
            </div>
          ) : (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
              {logs.join('\n')}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
