import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { instancesAPI, systemAPI } from '../services/api';
import {
  Plus,
  Play,
  Square,
  Trash2,
  RefreshCw,
  FileText,
  Settings,
  LogOut,
  Activity,
  Server
} from 'lucide-react';
import InstanceCard from '../components/InstanceCard';
import CreateInstanceModal from '../components/CreateInstanceModal';
import InstanceLogsModal from '../components/InstanceLogsModal';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dockerInfo, setDockerInfo] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInstances();
    loadDockerInfo();

    // Auto-refresh every 10 seconds
    const interval = setInterval(loadInstances, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadInstances = async () => {
    try {
      const response = await instancesAPI.getAll();
      if (response.success) {
        setInstances(response.data);
      }
    } catch (error) {
      console.error('Error loading instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDockerInfo = async () => {
    try {
      const response = await systemAPI.dockerInfo();
      if (response.success) {
        setDockerInfo(response.data);
      }
    } catch (error) {
      console.error('Error loading Docker info:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadInstances(), systemAPI.sync()]);
    setRefreshing(false);
  };

  const handleStartInstance = async (id) => {
    try {
      await instancesAPI.start(id);
      await loadInstances();
    } catch (error) {
      console.error('Error starting instance:', error);
      alert('Failed to start instance: ' + (error.message || 'Unknown error'));
    }
  };

  const handleStopInstance = async (id) => {
    try {
      await instancesAPI.stop(id);
      await loadInstances();
    } catch (error) {
      console.error('Error stopping instance:', error);
      alert('Failed to stop instance: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteInstance = async (id) => {
    if (!confirm('Are you sure you want to delete this instance?')) return;

    try {
      await instancesAPI.delete(id);
      await loadInstances();
    } catch (error) {
      console.error('Error deleting instance:', error);
      alert('Failed to delete instance: ' + (error.message || 'Unknown error'));
    }
  };

  const handleShowLogs = (instance) => {
    setSelectedInstance(instance);
    setShowLogsModal(true);
  };

  const handleStartAll = async () => {
    if (!confirm('Start all stopped instances?')) return;
    try {
      await instancesAPI.startAll();
      await loadInstances();
    } catch (error) {
      console.error('Error starting all instances:', error);
    }
  };

  const handleStopAll = async () => {
    if (!confirm('Stop all running instances?')) return;
    try {
      await instancesAPI.stopAll();
      await loadInstances();
    } catch (error) {
      console.error('Error stopping all instances:', error);
    }
  };

  const runningCount = instances.filter(i => i.isRunning).length;
  const stoppedCount = instances.length - runningCount;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading instances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Activity className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gift Instance Manager
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome, {user?.username}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                className="btn btn-secondary flex items-center space-x-2"
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button onClick={logout} className="btn btn-secondary flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Instances</p>
                <p className="text-3xl font-bold text-gray-900">{instances.length}</p>
              </div>
              <Server className="w-12 h-12 text-primary-600 opacity-20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Running</p>
                <p className="text-3xl font-bold text-green-600">{runningCount}</p>
              </div>
              <Play className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stopped</p>
                <p className="text-3xl font-bold text-gray-600">{stoppedCount}</p>
              </div>
              <Square className="w-12 h-12 text-gray-600 opacity-20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Docker Containers</p>
                <p className="text-3xl font-bold text-primary-600">
                  {dockerInfo?.containersRunning || 0}
                </p>
              </div>
              <Activity className="w-12 h-12 text-primary-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Instances</h2>
          <div className="flex space-x-3">
            <button
              onClick={handleStartAll}
              className="btn btn-success flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Start All</span>
            </button>
            <button
              onClick={handleStopAll}
              className="btn btn-secondary flex items-center space-x-2"
            >
              <Square className="w-4 h-4" />
              <span>Stop All</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Instance</span>
            </button>
          </div>
        </div>

        {/* Instances Grid */}
        {instances.length === 0 ? (
          <div className="card text-center py-12">
            <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No instances yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first gift tracker instance to get started
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Instance</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                onStart={handleStartInstance}
                onStop={handleStopInstance}
                onDelete={handleDeleteInstance}
                onShowLogs={handleShowLogs}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateInstanceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadInstances();
          }}
        />
      )}

      {showLogsModal && selectedInstance && (
        <InstanceLogsModal
          instance={selectedInstance}
          onClose={() => {
            setShowLogsModal(false);
            setSelectedInstance(null);
          }}
        />
      )}
    </div>
  );
}
