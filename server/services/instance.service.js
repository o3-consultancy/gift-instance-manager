import { InstanceModel, InstanceLogModel } from '../db/schema.js';
import { DockerService } from './docker.service.js';

export const InstanceService = {
  /**
   * Get all instances with their current Docker status
   */
  async getAllInstances() {
    try {
      const instances = InstanceModel.findAll();

      // Enrich with Docker status
      const enrichedInstances = await Promise.all(
        instances.map(async (instance) => {
          const dockerStatus = await DockerService.getContainerStatus(instance);
          return {
            ...instance,
            dockerStatus: dockerStatus.status,
            isRunning: dockerStatus.running
          };
        })
      );

      return {
        success: true,
        data: enrichedInstances
      };
    } catch (error) {
      console.error('Error getting instances:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Get instance by ID with Docker status
   */
  async getInstance(id) {
    try {
      const instance = InstanceModel.findById(id);
      if (!instance) {
        return {
          success: false,
          message: 'Instance not found'
        };
      }

      const dockerStatus = await DockerService.getContainerStatus(instance);

      return {
        success: true,
        data: {
          ...instance,
          dockerStatus: dockerStatus.status,
          isRunning: dockerStatus.running
        }
      };
    } catch (error) {
      console.error('Error getting instance:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Create a new instance
   */
  async createInstance(data) {
    try {
      // Validate required fields
      const requiredFields = ['name', 'api_key', 'account_id', 'tiktok_username', 'port'];
      for (const field of requiredFields) {
        if (!data[field]) {
          return {
            success: false,
            message: `Missing required field: ${field}`
          };
        }
      }

      // Check if name already exists
      const existingByName = InstanceModel.findByName(data.name);
      if (existingByName) {
        return {
          success: false,
          message: 'Instance with this name already exists'
        };
      }

      // Check if port is already in use
      const existingByPort = InstanceModel.findByPort(data.port);
      if (existingByPort) {
        return {
          success: false,
          message: `Port ${data.port} is already in use by instance: ${existingByPort.name}`
        };
      }

      // Set defaults
      const instanceData = {
        name: data.name,
        api_key: data.api_key,
        account_id: data.account_id,
        tiktok_username: data.tiktok_username,
        port: parseInt(data.port),
        backend_api_url: data.backend_api_url || process.env.BACKEND_API_URL,
        dash_password: data.dash_password || 'changeme',
        debug_mode: data.debug_mode ? 1 : 0,
        docker_image: data.docker_image || null
      };

      // Create instance in database
      const instance = InstanceModel.create(instanceData);

      // Log creation
      InstanceLogModel.add(instance.id, 'info', 'Instance created', instanceData);

      console.log(`✅ Instance created: ${instance.name} (ID: ${instance.id})`);

      return {
        success: true,
        data: instance,
        message: 'Instance created successfully'
      };
    } catch (error) {
      console.error('Error creating instance:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Update an instance
   */
  async updateInstance(id, data) {
    try {
      const instance = InstanceModel.findById(id);
      if (!instance) {
        return {
          success: false,
          message: 'Instance not found'
        };
      }

      // Check if instance is running
      const dockerStatus = await DockerService.getContainerStatus(instance);
      if (dockerStatus.running) {
        return {
          success: false,
          message: 'Cannot update a running instance. Please stop it first.'
        };
      }

      // If name is being changed, check for conflicts
      if (data.name && data.name !== instance.name) {
        const existingByName = InstanceModel.findByName(data.name);
        if (existingByName) {
          return {
            success: false,
            message: 'Instance with this name already exists'
          };
        }
      }

      // If port is being changed, check for conflicts
      if (data.port && data.port !== instance.port) {
        const existingByPort = InstanceModel.findByPort(data.port);
        if (existingByPort) {
          return {
            success: false,
            message: `Port ${data.port} is already in use by instance: ${existingByPort.name}`
          };
        }
      }

      // Convert debug_mode to integer if present
      if (data.debug_mode !== undefined) {
        data.debug_mode = data.debug_mode ? 1 : 0;
      }

      // Convert port to integer if present
      if (data.port !== undefined) {
        data.port = parseInt(data.port);
      }

      // Update instance
      const updatedInstance = InstanceModel.update(id, data);

      // If container exists, delete it so it will be recreated with new config
      if (instance.container_id) {
        await DockerService.deleteContainer(instance);
      }

      InstanceLogModel.add(id, 'info', 'Instance updated', data);

      console.log(`✅ Instance updated: ${updatedInstance.name} (ID: ${id})`);

      return {
        success: true,
        data: updatedInstance,
        message: 'Instance updated successfully'
      };
    } catch (error) {
      console.error('Error updating instance:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Delete an instance
   */
  async deleteInstance(id) {
    try {
      const instance = InstanceModel.findById(id);
      if (!instance) {
        return {
          success: false,
          message: 'Instance not found'
        };
      }

      // Stop and delete container if exists
      if (instance.container_id) {
        await DockerService.deleteContainer(instance);
      }

      // Delete from database
      InstanceModel.delete(id);

      console.log(`✅ Instance deleted: ${instance.name} (ID: ${id})`);

      return {
        success: true,
        message: 'Instance deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting instance:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Start an instance
   */
  async startInstance(id) {
    try {
      const instance = InstanceModel.findById(id);
      if (!instance) {
        return {
          success: false,
          message: 'Instance not found'
        };
      }

      const result = await DockerService.startContainer(instance);
      return result;
    } catch (error) {
      console.error('Error starting instance:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Stop an instance
   */
  async stopInstance(id) {
    try {
      const instance = InstanceModel.findById(id);
      if (!instance) {
        return {
          success: false,
          message: 'Instance not found'
        };
      }

      const result = await DockerService.stopContainer(instance);
      return result;
    } catch (error) {
      console.error('Error stopping instance:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Restart an instance
   */
  async restartInstance(id) {
    try {
      const instance = InstanceModel.findById(id);
      if (!instance) {
        return {
          success: false,
          message: 'Instance not found'
        };
      }

      const result = await DockerService.restartContainer(instance);
      return result;
    } catch (error) {
      console.error('Error restarting instance:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Get instance logs
   */
  async getInstanceLogs(id, tail = 100) {
    try {
      const instance = InstanceModel.findById(id);
      if (!instance) {
        return {
          success: false,
          message: 'Instance not found'
        };
      }

      return await DockerService.getContainerLogs(instance, tail);
    } catch (error) {
      console.error('Error getting instance logs:', error);
      return {
        success: false,
        message: error.message,
        logs: []
      };
    }
  },

  /**
   * Get instance statistics
   */
  async getInstanceStats(id) {
    try {
      const instance = InstanceModel.findById(id);
      if (!instance) {
        return {
          success: false,
          message: 'Instance not found'
        };
      }

      return await DockerService.getContainerStats(instance);
    } catch (error) {
      console.error('Error getting instance stats:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Get available ports
   */
  getAvailablePorts() {
    const portStart = parseInt(process.env.INSTANCE_PORT_START) || 3000;
    const portEnd = parseInt(process.env.INSTANCE_PORT_END) || 4000;
    const usedPorts = InstanceModel.getUsedPorts();

    const availablePorts = [];
    for (let port = portStart; port <= portEnd; port++) {
      if (!usedPorts.includes(port)) {
        availablePorts.push(port);
      }
    }

    return {
      success: true,
      data: {
        available: availablePorts,
        used: usedPorts,
        range: { start: portStart, end: portEnd }
      }
    };
  },

  /**
   * Get next available port
   */
  getNextAvailablePort() {
    const result = this.getAvailablePorts();
    if (result.success && result.data.available.length > 0) {
      return {
        success: true,
        port: result.data.available[0]
      };
    }
    return {
      success: false,
      message: 'No available ports in the configured range'
    };
  },

  /**
   * Start all stopped instances
   */
  async startAll() {
    try {
      const instances = InstanceModel.findAll();
      const stoppedInstances = instances.filter(i => i.status !== 'running');

      const results = await Promise.all(
        stoppedInstances.map(instance =>
          DockerService.startContainer(instance)
        )
      );

      const successful = results.filter(r => r.success).length;

      return {
        success: true,
        message: `Started ${successful}/${stoppedInstances.length} instances`,
        results
      };
    } catch (error) {
      console.error('Error starting all instances:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Stop all running instances
   */
  async stopAll() {
    try {
      const instances = InstanceModel.findAll();
      const runningInstances = instances.filter(i => i.status === 'running');

      const results = await Promise.all(
        runningInstances.map(instance =>
          DockerService.stopContainer(instance)
        )
      );

      const successful = results.filter(r => r.success).length;

      return {
        success: true,
        message: `Stopped ${successful}/${runningInstances.length} instances`,
        results
      };
    } catch (error) {
      console.error('Error stopping all instances:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Get available Docker images for instances
   */
  async getAvailableImages() {
    return await DockerService.listAvailableImages();
  }
};

export default InstanceService;
