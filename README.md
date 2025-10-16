# Gift Instance Manager

A centralized management platform for deploying and managing multiple TikTok Gift Tracker instances.

## Features

- **Multi-Instance Management**: Create, start, stop, and delete multiple gift tracker instances
- **Dynamic Configuration**: Set unique environment variables for each instance
- **Real-time Monitoring**: Live status updates and health monitoring
- **Port Management**: Automatic port allocation for instances
- **Docker Integration**: Seamless Docker container management
- **Web Dashboard**: User-friendly interface for managing all instances
- **Authentication**: Secure JWT-based authentication
- **API Access**: RESTful API for programmatic access

## Architecture

```
gift-instance-manager/
├── server/              # Backend API server
│   ├── index.js         # Main server entry point
│   ├── db/              # Database models and migrations
│   ├── routes/          # API route handlers
│   ├── middleware/      # Express middleware
│   └── services/        # Business logic (Docker, Instance management)
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API client
│   │   └── App.jsx      # Main app component
│   └── package.json
├── data/                # SQLite database storage
├── docker-compose.yml   # Docker Compose configuration
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Access to Docker socket (`/var/run/docker.sock`)

### Installation

1. Clone and install dependencies:
```bash
cd gift-instance-manager
npm install
cd frontend && npm install && cd ..
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build the gift tracker Docker image:
```bash
cd ../gift-tracker-instance
docker build -t gift-tracker:latest .
```

4. Start the manager:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

5. Start the frontend:
```bash
npm run dev:frontend
```

6. Access the dashboard:
```
http://localhost:4000
```

## Usage

### Creating an Instance

1. Navigate to the dashboard
2. Click "Create New Instance"
3. Fill in the configuration:
   - **Instance Name**: Friendly name for identification
   - **API Key**: Unique API key for the instance
   - **Account ID**: Backend account identifier
   - **TikTok Username**: Target TikTok user to track
   - **Port**: Auto-assigned or manual selection
4. Click "Create Instance"

### Managing Instances

- **Start**: Click the play button to start a stopped instance
- **Stop**: Click the stop button to stop a running instance
- **Delete**: Click the trash icon to remove an instance
- **View Logs**: Click "Logs" to see container logs
- **Edit Config**: Click "Edit" to modify instance configuration

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token

### Instances
- `GET /api/instances` - List all instances
- `POST /api/instances` - Create new instance
- `GET /api/instances/:id` - Get instance details
- `PUT /api/instances/:id` - Update instance configuration
- `DELETE /api/instances/:id` - Delete instance
- `POST /api/instances/:id/start` - Start instance
- `POST /api/instances/:id/stop` - Stop instance
- `GET /api/instances/:id/logs` - Get instance logs
- `GET /api/instances/:id/stats` - Get instance statistics

### System
- `GET /api/health` - Health check
- `GET /api/system/ports` - Available ports
- `GET /api/system/docker` - Docker info

## Deployment

### Using Docker Compose

```bash
docker-compose up -d
```

### Manual Deployment

1. Build frontend:
```bash
cd frontend
npm run build
```

2. Start backend:
```bash
npm start
```

3. Configure Nginx reverse proxy (see `docs/nginx.conf`)

4. Setup SSL certificates:
```bash
certbot --nginx -d app.o3-ttgifts.com
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `JWT_SECRET`: Secret key for JWT signing
- `ADMIN_USERNAME`: Admin login username
- `ADMIN_PASSWORD`: Admin login password
- `DOCKER_SOCKET_PATH`: Path to Docker socket
- `GIFT_TRACKER_IMAGE`: Docker image name for instances
- `INSTANCE_PORT_START`: Starting port for instance assignment
- `INSTANCE_PORT_END`: Ending port for instance assignment

## Security

- JWT-based authentication
- Rate limiting on API endpoints
- Helmet.js for security headers
- Docker socket access control
- Environment variable validation
- SQL injection prevention (parameterized queries)

## Troubleshooting

### Docker Connection Issues
- Ensure Docker daemon is running: `docker ps`
- Check socket permissions: `ls -la /var/run/docker.sock`
- Add user to docker group: `sudo usermod -aG docker $USER`

### Port Conflicts
- Check available ports: `netstat -tulpn | grep LISTEN`
- Adjust `INSTANCE_PORT_START` and `INSTANCE_PORT_END` in `.env`

### Instance Not Starting
- Check Docker logs: `docker logs <container-id>`
- Verify environment variables are set correctly
- Ensure gift-tracker image is built: `docker images | grep gift-tracker`

## Development

### Backend Development
```bash
npm run dev
```

### Frontend Development
```bash
npm run dev:frontend
```

### Database Schema
SQLite database schema is automatically created on first run.

## License

UNLICENSED - O3 Consultancy LLC

## Support

For issues and questions, contact O3 Consultancy LLC.
