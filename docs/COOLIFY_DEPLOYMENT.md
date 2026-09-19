# Coolify Deployment Guide

This guide explains how to deploy the Home Power Planner application on Coolify.

## 📋 Prerequisites

- Coolify instance running (v4.0+)
- Git repository with your code
- Domain name (optional but recommended)

## 🚀 Deployment Steps

### Method 1: Docker Compose (Recommended)

1. **In Coolify Dashboard:**
   - Click "New Resource" → "Docker Compose"
   - Select your Git repository
   - Choose the branch (main/master)

2. **Configure Build:**
   - Build pack: `docker-compose`
   - Compose file location: `/docker-compose.yml`
   - Base domain: Your domain (e.g., `power-planner.yourdomain.com`)

3. **Environment Variables:**
   - No environment variables required (all state is in URL)
   - Optional: Add custom domain if needed

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)

### Method 2: Dockerfile Only

1. **In Coolify Dashboard:**
   - Click "New Resource" → "Docker Image"
   - Select your Git repository
   - Choose the branch

2. **Configure Build:**
   - Build pack: `dockerfile`
   - Dockerfile location: `/Dockerfile`
   - Exposed port: `80`

3. **Deploy:**
   - Click "Deploy"

## 🔧 Configuration

### Environment Variables (Optional)

The application doesn't require any environment variables as all state is stored in the URL. However, you can add:

```env
# Optional: Custom configuration
NODE_ENV=production
```

### Domain Configuration

1. Go to your resource in Coolify
2. Click "Settings" → "Domains"
3. Add your domain: `power-planner.yourdomain.com`
4. Enable SSL (Let's Encrypt)

### Health Check

The application includes a health check endpoint at `/health`:
- Returns: `200 OK` with text "healthy"
- Used by Coolify for monitoring
- Interval: 30 seconds

## 📊 Resource Usage

Typical resource usage:
- **Memory**: ~50-100 MB
- **CPU**: Minimal (static files)
- **Disk**: ~50 MB (Docker image)

## 🔍 Troubleshooting

### Build Fails

**Problem:** Build fails with "Cannot find module"
**Solution:** 
- Ensure `package.json` is in root directory
- Check that all dependencies are listed
- Clear Docker cache in Coolify settings

### 404 Errors on Routes

**Problem:** Direct navigation to routes like `/plan` returns 404
**Solution:**
- This is handled by nginx configuration
- Ensure `docker/nginx.conf` is included in repository
- Check that `try_files $uri $uri/ /index.html;` is present

### Slow Initial Load

**Problem:** First load is slow
**Solution:**
- This is normal for first load (downloading ~180KB)
- Subsequent loads will be cached
- Consider enabling CDN in Coolify for better performance

### SSL Certificate Issues

**Problem:** SSL certificate not generating
**Solution:**
- Wait 5-10 minutes for Let's Encrypt
- Check domain DNS is pointing to Coolify server
- Verify port 80 and 443 are open

## 🔄 Updates

### Automatic Updates

1. Enable "Auto Deploy" in Coolify resource settings
2. Push changes to your Git repository
3. Coolify will automatically rebuild and redeploy

### Manual Updates

1. Go to your resource in Coolify
2. Click "Deploy" button
3. Wait for build to complete

## 📝 Dockerfile Explanation

### Multi-stage Build

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
# Installs dependencies and builds the app

# Stage 2: Production
FROM nginx:alpine AS production
# Serves the built files with nginx
```

**Benefits:**
- Smaller final image (~50MB vs ~500MB)
- Faster deployments
- More secure (no build tools in production)

### Nginx Configuration

Key features:
- **SPA Routing**: All routes redirect to `index.html`
- **Gzip Compression**: Reduces bandwidth by ~70%
- **Security Headers**: XSS protection, frame options
- **Caching**: Static assets cached for 1 year
- **Health Check**: `/health` endpoint for monitoring

## 🎯 Coolify-Specific Tips

### Resource Limits

Set resource limits in Coolify:
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 256M
```

### Backup Strategy

1. **Code**: Stored in Git (automatic)
2. **Configuration**: No database to backup
3. **State**: All in URL (no server state)

### Monitoring

Coolify provides:
- Health check status
- Resource usage graphs
- Deployment logs
- Error notifications

## 🔐 Security

### Built-in Security

- ✅ No backend = No server-side vulnerabilities
- ✅ All calculations client-side
- ✅ No user data stored on server
- ✅ HTTPS enforced by Coolify
- ✅ Security headers in nginx config

### Additional Recommendations

1. Enable Cloudflare proxy (optional)
2. Set up Coolify alerts for downtime
3. Regular Coolify updates
4. Monitor resource usage

## 📞 Support

If you encounter issues:

1. Check Coolify deployment logs
2. Verify Dockerfile and nginx.conf are correct
3. Test locally with `docker-compose up`
4. Check Coolify documentation: https://coolify.io/docs

## 🎉 Success Checklist

- [ ] Application builds successfully
- [ ] Health check returns 200
- [ ] All routes work (/, /plan, /audit, etc.)
- [ ] SSL certificate is active
- [ ] Auto-deploy is configured (optional)
- [ ] Resource limits are set (optional)

---

**Need Help?** Check the Coolify documentation or community forums.
