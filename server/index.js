import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

// Load environment variables FIRST before importing services
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import routes
import authRoutes from './routes/auth.routes.js';
import instanceRoutes from './routes/instance.routes.js';
import systemRoutes from './routes/system.routes.js';

// Import middleware and services (after dotenv config)
import { initializeDefaultUser } from './middleware/auth.js';
import { DockerService } from './services/docker.service.js';
import { InstanceService } from './services/instance.service.js';

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: NODE_ENV === 'development' ? '*' : process.env.CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for development
}));

// CORS
app.use(cors({
  origin: NODE_ENV === 'development' ? '*' : process.env.CORS_ORIGIN
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/system', systemRoutes);

// Health check (public)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

// Serve frontend in production
if (NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Gift Instance Manager API',
      version: '1.0.0',
      documentation: '/api',
      frontend: 'Run `npm run dev:frontend` to start the frontend development server'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  // Subscribe to instance updates
  socket.on('subscribe:instances', async () => {
    const result = await InstanceService.getAllInstances();
    socket.emit('instances:update', result);
  });
});

// Background task: Sync instance statuses every 30 seconds
setInterval(async () => {
  try {
    const result = await DockerService.syncAllStatuses();
    if (result.updates && result.updates.length > 0) {
      console.log(`🔄 Synced ${result.updates.length} instance status changes`);

      // Broadcast updates to all connected clients
      const instances = await InstanceService.getAllInstances();
      io.emit('instances:update', instances);
    }
  } catch (error) {
    console.error('Error syncing statuses:', error);
  }
}, 30000);

// Startup sequence
async function startServer() {
  try {
    console.log('\n🚀 Starting Gift Instance Manager...\n');

    // Test Docker connection
    console.log('🐳 Testing Docker connection...');
    const dockerTest = await DockerService.testConnection();
    if (!dockerTest.success) {
      console.error('❌ Docker connection failed:', dockerTest.message);
      console.error('   Please ensure Docker is running and the socket is accessible.');
      process.exit(1);
    }
    console.log('✅ Docker connection successful\n');

    // Get Docker info
    const dockerInfo = await DockerService.getInfo();
    if (dockerInfo.success) {
      console.log('📊 Docker Information:');
      console.log(`   - Version: ${dockerInfo.data.serverVersion}`);
      console.log(`   - OS: ${dockerInfo.data.operatingSystem}`);
      console.log(`   - Containers: ${dockerInfo.data.containers} (${dockerInfo.data.containersRunning} running)`);
      console.log(`   - Images: ${dockerInfo.data.images}\n`);
    }

    // Initialize default admin user
    console.log('👤 Initializing user accounts...');
    await initializeDefaultUser();
    console.log();

    // Sync instance statuses on startup
    console.log('🔄 Syncing instance statuses...');
    const syncResult = await DockerService.syncAllStatuses();
    if (syncResult.success) {
      console.log(`✅ Synced ${syncResult.updates.length} instances\n`);
    }

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 Gift Instance Manager');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`🌐 Environment: ${NODE_ENV}`);
      console.log(`🔐 API Endpoints: http://localhost:${PORT}/api`);

      if (NODE_ENV === 'development') {
        console.log(`\n💡 Development Mode:`);
        console.log(`   - API: http://localhost:${PORT}`);
        console.log(`   - Frontend: Run 'npm run dev:frontend' in another terminal`);
      } else {
        console.log(`\n🌐 Production Mode:`);
        console.log(`   - Access dashboard at: http://localhost:${PORT}`);
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Ready to manage instances!\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

// Start the server
startServer();
