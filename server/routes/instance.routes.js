import express from 'express';
import { InstanceService } from '../services/instance.service.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/instances
 * Get all instances
 */
router.get('/', async (req, res) => {
  try {
    const result = await InstanceService.getAllInstances();
    res.json(result);
  } catch (error) {
    console.error('Error getting instances:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/instances/available-images
 * Get all available Docker images for gift-tracker
 * IMPORTANT: This must come BEFORE /:id route to avoid conflicts
 */
router.get('/available-images', async (req, res) => {
  try {
    const result = await InstanceService.getAvailableImages();
    res.json(result);
  } catch (error) {
    console.error('Error getting available images:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/instances/:id
 * Get instance by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await InstanceService.getInstance(parseInt(req.params.id));

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error getting instance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/instances
 * Create new instance
 */
router.post('/', async (req, res) => {
  try {
    const result = await InstanceService.createInstance(req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating instance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * PUT /api/instances/:id
 * Update instance
 */
router.put('/:id', async (req, res) => {
  try {
    const result = await InstanceService.updateInstance(
      parseInt(req.params.id),
      req.body
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating instance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/instances/:id
 * Delete instance
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await InstanceService.deleteInstance(parseInt(req.params.id));

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error deleting instance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/instances/:id/start
 * Start instance
 */
router.post('/:id/start', async (req, res) => {
  try {
    const result = await InstanceService.startInstance(parseInt(req.params.id));

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error starting instance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/instances/:id/stop
 * Stop instance
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const result = await InstanceService.stopInstance(parseInt(req.params.id));

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error stopping instance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/instances/:id/restart
 * Restart instance
 */
router.post('/:id/restart', async (req, res) => {
  try {
    const result = await InstanceService.restartInstance(parseInt(req.params.id));

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error restarting instance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/instances/:id/logs
 * Get instance logs
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const tail = parseInt(req.query.tail) || 100;
    const result = await InstanceService.getInstanceLogs(
      parseInt(req.params.id),
      tail
    );

    res.json(result);
  } catch (error) {
    console.error('Error getting instance logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/instances/:id/stats
 * Get instance statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const result = await InstanceService.getInstanceStats(parseInt(req.params.id));

    res.json(result);
  } catch (error) {
    console.error('Error getting instance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/instances/bulk/start
 * Start all instances
 */
router.post('/bulk/start', async (req, res) => {
  try {
    const result = await InstanceService.startAll();
    res.json(result);
  } catch (error) {
    console.error('Error starting all instances:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/instances/bulk/stop
 * Stop all instances
 */
router.post('/bulk/stop', async (req, res) => {
  try {
    const result = await InstanceService.stopAll();
    res.json(result);
  } catch (error) {
    console.error('Error stopping all instances:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
