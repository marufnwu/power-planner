# Coolify Quick Deploy Card

## 🚀 3-Step Deployment

### Step 1: Push Code
```bash
git add .
git commit -m "Deploy to Coolify"
git push
```

### Step 2: Configure Coolify
1. New Resource → Docker Compose
2. Select repository
3. Build pack: `docker-compose`
4. File: `/docker-compose.yml`

### Step 3: Deploy
Click "Deploy" → Wait 2-3 minutes → Done! ✅

---

## 📋 Configuration

### Build Settings
- **Build Pack**: `docker-compose`
- **Compose File**: `/docker-compose.yml`
- **Base Domain**: `your-domain.com`
- **Port**: `80`

### Environment Variables
```env
# None required - all state in URL
```

### Health Check
- **Endpoint**: `/health`
- **Interval**: 30s
- **Expected**: `200 OK`

---

## 🔧 Useful Commands

### View Logs
```bash
# In Coolify dashboard → Logs tab
```

### Force Rebuild
```bash
# Coolify dashboard → Deploy button
```

### Rollback
```bash
# Coolify dashboard → Deployments → Select version → Deploy
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check logs, verify Dockerfile |
| 404 errors | Check nginx.conf included |
| SSL not working | Wait 5-10 min, check DNS |
| Slow load | Enable CDN, check resource limits |

---

## 📊 Resource Limits (Recommended)

```yaml
CPU: 0.5 cores
Memory: 256 MB
Disk: 50 MB
```

---

## 🔐 Security

- ✅ HTTPS enforced
- ✅ Security headers enabled
- ✅ No sensitive data exposed
- ✅ Client-side only (no backend vulnerabilities)

---

## 📞 Quick Links

- **Coolify Docs**: https://coolify.io/docs
- **Deployment Guide**: `/docs/COOLIFY_DEPLOYMENT.md`
- **Full Guide**: `/docs/DEPLOYMENT.md`

---

## ✅ Success Checklist

- [ ] App builds successfully
- [ ] Health check returns 200
- [ ] All routes work
- [ ] SSL active
- [ ] Auto-deploy configured

---

**Print this card for quick reference!** 🖨️
