import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { instancesAPI, systemAPI } from '../services/api';

export default function CreateInstanceModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    api_key: '',
    account_id: '',
    tiktok_username: '',
    port: '',
    backend_api_url: 'https://o3-ttgifts.com/api/instances',
    dash_password: 'changeme',
    debug_mode: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestedPort, setSuggestedPort] = useState(null);

  useEffect(() => {
    // Get next available port
    systemAPI.getNextPort()
      .then(response => {
        if (response.success) {
          setSuggestedPort(response.port);
          setFormData(prev => ({ ...prev, port: response.port.toString() }));
        }
      })
      .catch(err => console.error('Error getting port:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await instancesAPI.create(formData);
      if (response.success) {
        onSuccess();
      } else {
        setError(response.message || 'Failed to create instance');
      }
    } catch (err) {
      setError(err.message || 'Failed to create instance');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Generate random API key
  const generateApiKey = () => {
    const key = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    setFormData(prev => ({ ...prev, api_key: key }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">Create New Instance</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Instance Name */}
          <div>
            <label className="label">Instance Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              placeholder="e.g., user-tracker-01"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier for this instance
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="label">API Key *</label>
            <div className="flex space-x-2">
              <input
                type="text"
                name="api_key"
                value={formData.api_key}
                onChange={handleChange}
                className="input flex-1"
                placeholder="066e8866-e7a3-46d3-9efc-d00c7c9172b5"
                required
              />
              <button
                type="button"
                onClick={generateApiKey}
                className="btn btn-secondary whitespace-nowrap"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Unique API key for backend authentication
            </p>
          </div>

          {/* Account ID */}
          <div>
            <label className="label">Account ID *</label>
            <input
              type="text"
              name="account_id"
              value={formData.account_id}
              onChange={handleChange}
              className="input"
              placeholder="68f0c824f05516c475153ab6"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Backend account identifier
            </p>
          </div>

          {/* TikTok Username */}
          <div>
            <label className="label">TikTok Username *</label>
            <input
              type="text"
              name="tiktok_username"
              value={formData.tiktok_username}
              onChange={handleChange}
              className="input"
              placeholder="user13622668497992"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              TikTok username to track (without @)
            </p>
          </div>

          {/* Port */}
          <div>
            <label className="label">Port *</label>
            <input
              type="number"
              name="port"
              value={formData.port}
              onChange={handleChange}
              className="input"
              placeholder="3000"
              min="3000"
              max="65535"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {suggestedPort && `Suggested available port: ${suggestedPort}`}
            </p>
          </div>

          {/* Backend API URL */}
          <div>
            <label className="label">Backend API URL</label>
            <input
              type="url"
              name="backend_api_url"
              value={formData.backend_api_url}
              onChange={handleChange}
              className="input"
              placeholder="https://o3-ttgifts.com/api/instances"
            />
          </div>

          {/* Dashboard Password */}
          <div>
            <label className="label">Dashboard Password</label>
            <input
              type="text"
              name="dash_password"
              value={formData.dash_password}
              onChange={handleChange}
              className="input"
              placeholder="changeme"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional legacy dashboard password
            </p>
          </div>

          {/* Debug Mode */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="debug_mode"
              checked={formData.debug_mode}
              onChange={handleChange}
              className="w-4 h-4 text-primary-600 rounded"
              id="debug_mode"
            />
            <label htmlFor="debug_mode" className="ml-2 text-sm text-gray-700">
              Enable debug mode
            </label>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Instance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
