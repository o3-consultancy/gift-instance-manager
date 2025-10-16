import Docker from 'dockerode';
import { InstanceModel, InstanceLogModel } from '../db/schema.js';

// Lazy initialization of Docker connection
let docker = null;

function getDocker() {
  if (!docker) {
    docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock'
    });
  }
  return docker;
}

export const DockerService = {
  /**
   * Test Docker connection
   */
  async testConnection() {
    try {
      await getDocker().ping();
      return { success: true, message: 'Docker connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Get Docker info
   */
  async getInfo() {
    try {
      const info = await getDocker().info();
      return {
        success: true,
        data: {
          containers: info.Containers,
          containersRunning: info.ContainersRunning,
          containersStopped: info.ContainersStopped,
          images: info.Images,
          serverVersion: info.ServerVersion,
          operatingSystem: info.OperatingSystem,
          architecture: info.Architecture,
          memTotal: info.MemTotal,
          cpus: info.NCPU
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Check if image exists
   */
  async imageExists(imageName) {
    try {
      const images = await getDocker().listImages();
      return images.some(img =>
        img.RepoTags && img.RepoTags.some(tag => tag.includes(imageName))
      );
    } catch (error) {
      console.error('Error checking image:', error);
      return false;
    }
  },

  /**
   * Create and start a new container for an instance
   */
  async createContainer(instance) {
    try {
      const imageName = process.env.GIFT_TRACKER_IMAGE || 'gift-tracker:latest';

      // Check if image exists
      const exists = await this.imageExists(imageName);
      if (!exists) {
        throw new Error(`Docker image ${imageName} not found. Please build it first.`);
      }

      // Container configuration
      const containerConfig = {
        Image: imageName,
        name: `gift-tracker-${instance.name}`,
        Env: [
          `API_KEY=${instance.api_key}`,
          `ACCOUNT_ID=${instance.account_id}`,
          `TIKTOK_USERNAME=${instance.tiktok_username}`,
          `PORT=3000`,
          `BACKEND_API_URL=${instance.backend_api_url || process.env.BACKEND_API_URL}`,
          `DASH_PASSWORD=${instance.dash_password || 'changeme'}`,
          `DEBUG_MODE=${instance.debug_mode ? 'true' : 'false'}`,
          `NODE_ENV=production`
        ],
        ExposedPorts: {
          '3000/tcp': {}
        },
        HostConfig: {
          PortBindings: {
            '3000/tcp': [{ HostPort: instance.port.toString() }]
          },
          RestartPolicy: {
            Name: 'unless-stopped'
          },
          Memory: 256 * 1024 * 1024, // 256MB
          MemorySwap: 512 * 1024 * 1024 // 512MB
        },
        Labels: {
          'app': 'gift-tracker',
          'instance.id': instance.id.toString(),
          'instance.name': instance.name,
          'managed-by': 'gift-instance-manager'
        }
      };

      // Create container
      const container = await getDocker().createContainer(containerConfig);

      // Update instance with container ID
      InstanceModel.updateContainerId(instance.id, container.id);

      // Log the creation
      InstanceLogModel.add(instance.id, 'info', 'Container created', { containerId: container.id });

      console.log(`✅ Container created for instance ${instance.name}: ${container.id}`);

      return {
        success: true,
        containerId: container.id,
        message: 'Container created successfully'
      };
    } catch (error) {
      console.error('Error creating container:', error);
      InstanceLogModel.add(instance.id, 'error', 'Container creation failed', { error: error.message });
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Start a container
   */
  async startContainer(instance) {
    try {
      if (!instance.container_id) {
        // No container exists, create one
        const createResult = await this.createContainer(instance);
        if (!createResult.success) {
          return createResult;
        }
        // Refresh instance data
        instance = InstanceModel.findById(instance.id);
      }

      const container = getDocker().getContainer(instance.container_id);

      // Check container state
      const containerInfo = await container.inspect();
      if (containerInfo.State.Running) {
        return {
          success: true,
          message: 'Container is already running'
        };
      }

      // Start the container
      await container.start();

      // Update instance status
      InstanceModel.markStarted(instance.id);
      InstanceLogModel.add(instance.id, 'info', 'Container started');

      console.log(`✅ Container started for instance ${instance.name}`);

      return {
        success: true,
        message: 'Container started successfully'
      };
    } catch (error) {
      console.error('Error starting container:', error);
      InstanceLogModel.add(instance.id, 'error', 'Container start failed', { error: error.message });

      // If container doesn't exist, clear the container_id
      if (error.statusCode === 404) {
        InstanceModel.updateContainerId(instance.id, null);
        InstanceModel.updateStatus(instance.id, 'stopped');
      }

      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Stop a container
   */
  async stopContainer(instance) {
    try {
      if (!instance.container_id) {
        return {
          success: false,
          message: 'No container ID found for this instance'
        };
      }

      const container = getDocker().getContainer(instance.container_id);

      // Check container state
      const containerInfo = await container.inspect();
      if (!containerInfo.State.Running) {
        InstanceModel.markStopped(instance.id);
        return {
          success: true,
          message: 'Container is already stopped'
        };
      }

      // Stop the container
      await container.stop({ t: 10 }); // 10 second timeout

      // Update instance status
      InstanceModel.markStopped(instance.id);
      InstanceLogModel.add(instance.id, 'info', 'Container stopped');

      console.log(`✅ Container stopped for instance ${instance.name}`);

      return {
        success: true,
        message: 'Container stopped successfully'
      };
    } catch (error) {
      console.error('Error stopping container:', error);
      InstanceLogModel.add(instance.id, 'error', 'Container stop failed', { error: error.message });

      // If container doesn't exist, clear the container_id
      if (error.statusCode === 404) {
        InstanceModel.updateContainerId(instance.id, null);
        InstanceModel.markStopped(instance.id);
      }

      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Restart a container
   */
  async restartContainer(instance) {
    try {
      if (!instance.container_id) {
        return await this.startContainer(instance);
      }

      const container = getDocker().getContainer(instance.container_id);
      await container.restart({ t: 10 });

      InstanceModel.markStarted(instance.id);
      InstanceLogModel.add(instance.id, 'info', 'Container restarted');

      return {
        success: true,
        message: 'Container restarted successfully'
      };
    } catch (error) {
      console.error('Error restarting container:', error);
      InstanceLogModel.add(instance.id, 'error', 'Container restart failed', { error: error.message });
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Delete a container
   */
  async deleteContainer(instance) {
    try {
      if (!instance.container_id) {
        return {
          success: true,
          message: 'No container to delete'
        };
      }

      const container = getDocker().getContainer(instance.container_id);

      // Stop container if running
      try {
        const containerInfo = await container.inspect();
        if (containerInfo.State.Running) {
          await container.stop({ t: 5 });
        }
      } catch (err) {
        // Container might already be stopped or not exist
      }

      // Remove container
      await container.remove({ force: true });

      // Update instance
      InstanceModel.updateContainerId(instance.id, null);
      InstanceModel.updateStatus(instance.id, 'stopped');
      InstanceLogModel.add(instance.id, 'info', 'Container deleted');

      console.log(`✅ Container deleted for instance ${instance.name}`);

      return {
        success: true,
        message: 'Container deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting container:', error);

      // If container doesn't exist, that's fine
      if (error.statusCode === 404) {
        InstanceModel.updateContainerId(instance.id, null);
        InstanceModel.updateStatus(instance.id, 'stopped');
        return {
          success: true,
          message: 'Container already deleted'
        };
      }

      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Get container logs
   */
  async getContainerLogs(instance, tail = 100) {
    try {
      if (!instance.container_id) {
        return {
          success: false,
          message: 'No container ID found for this instance'
        };
      }

      const container = getDocker().getContainer(instance.container_id);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: tail,
        timestamps: true
      });

      // Convert buffer to string and clean up
      const logString = logs.toString('utf8')
        .split('\n')
        .map(line => line.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim())
        .filter(line => line.length > 0);

      return {
        success: true,
        logs: logString
      };
    } catch (error) {
      console.error('Error getting container logs:', error);
      return {
        success: false,
        message: error.message,
        logs: []
      };
    }
  },

  /**
   * Get container stats
   */
  async getContainerStats(instance) {
    try {
      if (!instance.container_id) {
        return {
          success: false,
          message: 'No container ID found for this instance'
        };
      }

      const container = getDocker().getContainer(instance.container_id);
      const stats = await container.stats({ stream: false });

      // Calculate CPU usage
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
                      stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage -
                         stats.precpu_stats.system_cpu_usage;
      const cpuPercent = (cpuDelta / systemDelta) *
                        stats.cpu_stats.online_cpus * 100;

      // Calculate memory usage
      const memoryUsage = stats.memory_stats.usage;
      const memoryLimit = stats.memory_stats.limit;
      const memoryPercent = (memoryUsage / memoryLimit) * 100;

      return {
        success: true,
        stats: {
          cpu: cpuPercent.toFixed(2),
          memory: {
            usage: memoryUsage,
            limit: memoryLimit,
            percent: memoryPercent.toFixed(2)
          },
          network: stats.networks
        }
      };
    } catch (error) {
      console.error('Error getting container stats:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Get container status
   */
  async getContainerStatus(instance) {
    try {
      if (!instance.container_id) {
        return { status: 'no-container', running: false };
      }

      const container = getDocker().getContainer(instance.container_id);
      const containerInfo = await container.inspect();

      return {
        status: containerInfo.State.Status,
        running: containerInfo.State.Running,
        startedAt: containerInfo.State.StartedAt,
        finishedAt: containerInfo.State.FinishedAt
      };
    } catch (error) {
      if (error.statusCode === 404) {
        return { status: 'not-found', running: false };
      }
      return { status: 'error', running: false, error: error.message };
    }
  },

  /**
   * Sync all instance statuses with Docker
   */
  async syncAllStatuses() {
    try {
      const instances = InstanceModel.findAll();
      const updates = [];

      for (const instance of instances) {
        const status = await this.getContainerStatus(instance);

        if (status.running && instance.status !== 'running') {
          InstanceModel.updateStatus(instance.id, 'running');
          updates.push({ id: instance.id, status: 'running' });
        } else if (!status.running && instance.status === 'running') {
          InstanceModel.updateStatus(instance.id, 'stopped');
          updates.push({ id: instance.id, status: 'stopped' });
        }

        // Clear container_id if container not found
        if (status.status === 'not-found' && instance.container_id) {
          InstanceModel.updateContainerId(instance.id, null);
        }
      }

      return {
        success: true,
        updates: updates,
        message: `Synced ${instances.length} instances`
      };
    } catch (error) {
      console.error('Error syncing statuses:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
};

export default DockerService;
