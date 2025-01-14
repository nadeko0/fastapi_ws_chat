# Deployment Guide

This guide provides detailed instructions for deploying the FastAPI WebSocket Chat application in a production environment.

## Prerequisites

- A server with Ubuntu/Debian
- Domain name pointing to your server
- Node.js and Python installed
- Nginx installed
- SSL certificate (Let's Encrypt recommended)

## Server Setup

1. Clone and set up the project:
   ```bash
   git clone https://github.com/yourusername/fastapi-ws-chat.git
   cd fastapi-ws-chat
   ```

2. Set up SSL certificates:
   ```bash
   sudo certbot certonly --nginx -d your-domain.com
   ```

3. Configure Nginx:
   - Copy the nginx configuration template:
     ```bash
     sudo cp nginx-config.txt /etc/nginx/sites-available/fastapi-ws-chat
     ```
   - Update the configuration:
     - Replace all instances of `your-domain.com` with your actual domain
     - Update SSL certificate paths
     - Adjust root directory path
   - Enable the site:
     ```bash
     sudo ln -s /etc/nginx/sites-available/fastapi-ws-chat /etc/nginx/sites-enabled/
     sudo nginx -t
     sudo systemctl restart nginx
     ```

4. Set up the backend:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

5. Set up the frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

6. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your production values:
   # - Set ENVIRONMENT=production
   # - Set strong SECRET_KEY
   # - Configure ALLOWED_ORIGINS
   # - Set proper VITE_* variables
   ```

7. Set up process management (PM2 recommended):
   ```bash
   npm install -g pm2
   pm2 start "cd backend && uvicorn main:app --host 0.0.0.0 --port 8000" --name "chat-backend"
   pm2 save
   pm2 startup
   ```

## Security Configuration

### Firewall Setup

1. Configure UFW:
   ```bash
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw allow 8000
   ```

2. SSL/TLS Settings:
   - The nginx configuration includes secure SSL settings
   - Regular certificate renewal is handled by certbot
   - Configure automatic renewal:
     ```bash
     sudo certbot renew --dry-run
     ```

### Environment Security

1. Production Environment Variables:
   - Use strong SECRET_KEY (at least 32 characters)
   - Set ENVIRONMENT=production
   - Configure proper ALLOWED_ORIGINS
   - Use HTTPS/WSS protocols

2. File Permissions:
   ```bash
   chmod 600 .env
   chmod 600 backend/messenger.db
   ```

## Maintenance Procedures

### Regular Updates

1. Update Application:
   ```bash
   # Pull latest changes
   git pull origin main

   # Update backend
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt

   # Update frontend
   cd frontend
   npm install
   npm run build

   # Restart services
   pm2 restart all
   ```

### Monitoring

1. Application Logs:
   ```bash
   # Backend logs
   pm2 logs chat-backend

   # Nginx logs
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

2. System Monitoring:
   ```bash
   # Check system resources
   htop
   
   # Check disk usage
   df -h
   ```

### Backup Procedures

1. Database Backup:
   ```bash
   # Create backup directory
   mkdir -p /backups/messenger

   # Backup database
   cp backend/messenger.db /backups/messenger/messenger_$(date +%Y%m%d).db
   ```

2. Configuration Backup:
   ```bash
   # Backup nginx config
   sudo cp /etc/nginx/sites-available/fastapi-ws-chat /backups/nginx/
   
   # Backup environment variables
   cp .env /backups/env/env_$(date +%Y%m%d)
   ```

## Troubleshooting

### Common Issues

1. WebSocket Connection Issues:
   - Check nginx proxy settings
   - Verify SSL certificate configuration
   - Ensure proper CORS settings

2. Database Issues:
   - Check file permissions
   - Verify database file location
   - Monitor disk space

3. Performance Issues:
   - Monitor server resources
   - Check nginx worker settings
   - Review PM2 configuration

### Recovery Procedures

1. Service Recovery:
   ```bash
   # Restart backend
   pm2 restart chat-backend

   # Restart nginx
   sudo systemctl restart nginx
   ```

2. Database Recovery:
   ```bash
   # Restore from backup
   cp /backups/messenger/messenger_YYYYMMDD.db backend/messenger.db
   ```

## Performance Optimization

1. Nginx Optimization:
   - Enable gzip compression
   - Configure worker processes
   - Set proper buffer sizes

2. Application Optimization:
   - Enable frontend caching
   - Optimize static assets
   - Configure proper WebSocket timeouts

## Scaling Considerations

1. Horizontal Scaling:
   - Load balancer configuration
   - Session management
   - WebSocket connection distribution

2. Database Scaling:
   - Consider migration to PostgreSQL
   - Implement connection pooling
   - Set up replication if needed