import express from 'express';
import { DockerService } from '../services/docker.service.js';
import { InstanceService } from '../services/instance.service.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/system/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/system/docker
 * Get Docker system information
 */
router.get('/docker', async (req, res) => {
  try {
    const result = await DockerService.getInfo();
    res.json(result);
  } catch (error) {
    console.error('Error getting Docker info:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/system/docker/test
 * Test Docker connection
 */
router.get('/docker/test', async (req, res) => {
  try {
    const result = await DockerService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('Error testing Docker connection:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/system/ports
 * Get available ports
 */
router.get('/ports', (req, res) => {
  try {
    const result = InstanceService.getAvailablePorts();
    res.json(result);
  } catch (error) {
    console.error('Error getting available ports:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/system/ports/next
 * Get next available port
 */
router.get('/ports/next', (req, res) => {
  try {
    const result = InstanceService.getNextAvailablePort();
    res.json(result);
  } catch (error) {
    console.error('Error getting next available port:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/system/sync
 * Sync all instance statuses with Docker
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await DockerService.syncAllStatuses();
    res.json(result);
  } catch (error) {
    console.error('Error syncing statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
