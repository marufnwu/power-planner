# Deployment Guide

Complete guide for deploying Home Power Planner to various platforms.

## 📊 Deployment Options

| Platform | Difficulty | Cost | Best For |
|----------|-----------|------|----------|
| **Coolify** | Easy | Free (self-hosted) | Full control, privacy |
| **Vercel** | Very Easy | Free tier | Quick deployment |
| **Netlify** | Very Easy | Free tier | Quick deployment |
| **Docker** | Medium | Varies | Any server |
| **Traditional** | Hard | Varies | Custom requirements |

---

## 🚀 Coolify Deployment (Recommended)

### Why Coolify?
- ✅ Self-hosted (your data, your control)
- ✅ Free and open-source
- ✅ Automatic SSL certificates
- ✅ Easy Git integration
- ✅ Auto-deploy on push
- ✅ Built-in monitoring

### Prerequisites
- Coolify instance (v4.0+)
- Git repository
- Domain name (optional)

### Step-by-Step Guide

#### 1. Prepare Repository
```bash
# Ensure these files are committed
git add Dockerfile docker-compose.yml docker/nginx.conf
git commit -m "Add Docker deployment files"
git push
```

#### 2. Configure in Coolify
1. Login to Coolify dashboard
2. Click "New Resource"
3. Select "Docker Compose"
4. Choose your Git repository
5. Select branch (main/master)

#### 3. Build Configuration
- **Build Pack**: `docker-compose`
- **Compose File**: `/docker-compose.yml`
- **Base Domain**: `power-planner.yourdomain.com`

#### 4. Deploy
- Click "Deploy"
- Wait 2-3 minutes for build
- Application will be live!

### Environment Variables
No environment variables required. All state is in URL.

### Health Check
Endpoint: `/health`
- Returns: `200 OK` with "healthy"
- Used by Coolify for monitoring

### Updates
Enable "Auto Deploy" for automatic updates on Git push.

### Troubleshooting

**Build fails?**
- Check Coolify logs
- Verify Dockerfile syntax
- Ensure all files are committed

**404 on routes?**
- Check nginx.conf is included
- Verify SPA routing configuration

**SSL issues?**
- Wait 5-10 minutes for Let's Encrypt
- Check DNS configuration

---

## ▲ Vercel Deployment

### Why Vercel?
- ✅ Zero configuration
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Free tier available
- ✅ Instant deployments

### Prerequisites
- Vercel account
- Git repository

### Step-by-Step Guide

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Deploy
```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Choose your account
# - Link to existing project? No
# - Project name? home-power-planner
# - Directory? ./  (current directory)
# - Override settings? No

# Deploy to production
vercel --prod
```

#### 3. Configure Domain (Optional)
1. Go to Vercel dashboard
2. Select your project
3. Settings → Domains
4. Add your domain
5. Configure DNS as instructed

### Environment Variables
Not required.

### Automatic Deployments
Connect your Git repository in Vercel dashboard for auto-deploy on push.

---

## 🌐 Netlify Deployment

### Why Netlify?
- ✅ Drag-and-drop deployment
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Free tier available
- ✅ Form handling (future features)

### Method 1: Netlify CLI

#### 1. Install CLI
```bash
npm install -g netlify-cli
```

#### 2. Deploy
```bash
# Build the project
npm run build

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

### Method 2: Drag and Drop

1. Build the project:
   ```bash
   npm run build
   ```

2. Go to [Netlify App](https://app.netlify.com)
3. Drag `dist` folder to deployment area
4. Done!

### Method 3: Git Integration

1. Push code to Git
2. In Netlify dashboard: "New site from Git"
3. Choose repository
4. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Deploy

### Configuration File

Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "20"
```

---

## 🐳 Docker Deployment

### Why Docker?
- ✅ Consistent environment
- ✅ Easy to scale
- ✅ Works anywhere
- ✅ Version control for infrastructure

### Prerequisites
- Docker installed
- Docker Compose (optional)

### Build Image
```bash
docker build -t home-power-planner .
```

### Run Container
```bash
docker run -d \
  --name power-planner \
  -p 80:80 \
  --restart unless-stopped \
  home-power-planner
```

### Docker Compose
```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build
```

### Access Application
Open: http://localhost

### Production with Reverse Proxy

Use with Nginx reverse proxy:
```nginx
server {
    listen 80;
    server_name power-planner.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🖥️ Traditional Server Deployment

### Prerequisites
- Linux server (Ubuntu 20.04+ recommended)
- Nginx installed
- Node.js 20+ (for building)

### Step-by-Step Guide

#### 1. Build on Server
```bash
# Clone repository
git clone https://github.com/yourusername/home-power-planner.git
cd home-power-planner

# Install dependencies
npm install

# Build
npm run build
```

#### 2. Configure Nginx
```bash
# Copy nginx config
sudo cp docker/nginx.conf /etc/nginx/sites-available/power-planner

# Enable site
sudo ln -s /etc/nginx/sites-available/power-planner /etc/nginx/sites-enabled/

# Copy built files
sudo cp -r dist/* /var/www/power-planner/

# Update nginx.conf root path
sudo nano /etc/nginx/sites-available/power-planner
# Change: root /usr/share/nginx/html;
# To: root /var/www/power-planner;

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

#### 3. Setup SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d power-planner.yourdomain.com

# Auto-renewal is configured automatically
```

#### 4. Set Permissions
```bash
sudo chown -R www-data:www-data /var/www/power-planner
sudo chmod -R 755 /var/www/power-planner
```

### Updates
```bash
cd /path/to/home-power-planner
git pull
npm install
npm run build
sudo cp -r dist/* /var/www/power-planner/
```

---

## 📱 Progressive Web App (PWA)

The application is PWA-ready. To enable:

1. **manifest.json** is already in `public/` folder
2. **Service Worker** (future enhancement)
3. **Install prompt** can be added

### Testing PWA
1. Deploy to HTTPS domain
2. Open in Chrome/Edge
3. Look for install icon in address bar
4. Click to install as app

---

## 🔒 Security Checklist

### Before Deployment

- [ ] All dependencies updated (`npm audit`)
- [ ] No sensitive data in code
- [ ] Environment variables secured
- [ ] HTTPS configured
- [ ] Security headers enabled (nginx.conf)
- [ ] CORS configured (if needed)

### After Deployment

- [ ] Test all routes work
- [ ] Verify SSL certificate
- [ ] Check health endpoint
- [ ] Monitor error logs
- [ ] Set up alerts

---

## 📊 Performance Optimization

### Build Optimization

Already implemented:
- ✅ Code splitting
- ✅ Tree shaking
- ✅ Minification
- ✅ Gzip compression

### Additional Optimizations

#### 1. CDN Setup
```nginx
# In nginx.conf
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### 2. Image Optimization
- Use WebP format
- Compress images before deployment
- Use lazy loading

#### 3. Preload Critical Resources
```html
<link rel="preload" href="/assets/main.js" as="script">
<link rel="preload" href="/assets/main.css" as="style">
```

---

## 🔄 CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Coolify
        run: |
          curl -X POST ${{ secrets.COOLIFY_WEBHOOK }}
```

### GitLab CI

Create `.gitlab-ci.yml`:
```yaml
stages:
  - build
  - deploy

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

deploy:
  stage: deploy
  script:
    - # Your deployment script
  only:
    - main
```

---

## 📞 Support & Resources

### Documentation
- [Coolify Docs](https://coolify.io/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [Docker Docs](https://docs.docker.com)

### Troubleshooting
- Check deployment logs
- Verify environment variables
- Test locally with Docker
- Check DNS configuration

### Community
- Coolify Discord
- Vercel Community
- Netlify Community
- Docker Forums

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Build successful locally
- [ ] No console errors
- [ ] All routes tested
- [ ] Mobile responsive
- [ ] Accessibility checked

### Deployment
- [ ] Repository pushed to Git
- [ ] Deployment successful
- [ ] Health check passing
- [ ] SSL certificate active
- [ ] Domain configured

### Post-Deployment
- [ ] All features working
- [ ] Performance acceptable
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Update procedure documented

---

**Need Help?** Check platform-specific documentation or open an issue.
