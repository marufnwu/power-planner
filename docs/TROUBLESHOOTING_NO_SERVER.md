# 🔧 Troubleshooting: "No Available Server" Error

## ❌ Problem

Your domain shows **"no available server"** after deployment. This means Coolify's proxy cannot reach your container.

---

## 🎯 Most Common Causes

### 1. Container Not Running
- Health check failing
- Nginx configuration error
- Build failed silently

### 2. DNS Not Configured
- Domain not pointing to server IP
- DNS propagation not complete
- Wrong DNS record type

### 3. SSL Certificate Failed
- Let's Encrypt couldn't verify domain
- Port 80/443 blocked by firewall
- DNS not pointing yet

### 4. Port Mismatch
- Coolify looking at wrong port
- Container not listening on expected port
- Proxy configuration issue

---

## ✅ Step-by-Step Fix

### Step 1: Check Container Status

**In Coolify Dashboard:**
1. Go to your resource
2. Click **"Logs"** tab
3. Look for errors in the logs

**Common errors:**
```
❌ nginx: [emerg] host not found in upstream
❌ bind() to 0.0.0.0:80 failed (98: Address already in use)
❌ health check failed
```

**If you see errors:**
- Check nginx.conf syntax
- Verify dist/ files were copied
- Check Dockerfile build stages

---

### Step 2: Verify DNS Configuration

**Check DNS records:**
```bash
# On your local machine
nslookup your-domain.com
# or
dig your-domain.com
```

**Expected result:**
```
Name: your-domain.com
Address: YOUR_SERVER_IP
```

**If DNS not pointing:**
1. Go to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.)
2. Add DNS record:
   ```
   Type: A
   Name: your-subdomain (or @ for root)
   Value: YOUR_SERVER_IP
   TTL: 300
   ```
3. Wait 5-30 minutes for propagation

**Check propagation:**
```bash
# Use online tool
https://dnschecker.org/

# Or command line
dig your-domain.com +short
```

---

### Step 3: Test Container Directly

**SSH into your server:**
```bash
ssh root@YOUR_SERVER_IP
```

**Check running containers:**
```bash
docker ps
```

**Look for your container:**
```
CONTAINER ID   IMAGE          STATUS         PORTS
abc123         your-app       Up 2 minutes   80/tcp
```

**If container not running:**
```bash
# Check logs
docker logs CONTAINER_ID

# Restart container
docker restart CONTAINER_ID
```

**Test nginx directly:**
```bash
# Find container IP
docker inspect CONTAINER_ID | grep IPAddress

# Test from server
curl http://CONTAINER_IP:80/
```

**Expected:** HTML content of your app

---

### Step 4: Check Coolify Proxy

**In Coolify Dashboard:**
1. Go to **Settings** → **Server**
2. Check proxy status (should be "Running")
3. Check proxy logs for errors

**Common proxy errors:**
```
❌ upstream sent no response
❌ connection refused
❌ no live upstreams
```

**If proxy not running:**
```bash
# SSH to server
ssh root@YOUR_SERVER_IP

# Restart Coolify proxy
docker restart coolify-proxy
```

---

### Step 5: Verify SSL Certificate

**In Coolify Dashboard:**
1. Go to your resource → **Settings** → **Domains**
2. Check SSL status
3. Look for certificate generation errors

**Common SSL errors:**
```
❌ Challenge failed for domain
❌ DNS problem: SERVLOOKUP
❌ Connection refused
```

**If SSL failed:**
1. Verify DNS is pointing correctly
2. Ensure port 80 and 443 are open
3. Wait for DNS propagation (up to 24 hours)
4. Click "Generate SSL" again

**Check firewall:**
```bash
# On your server
ufw status
# or
iptables -L -n

# Open ports if needed
ufw allow 80/tcp
ufw allow 443/tcp
```

---

### Step 6: Test Health Check

**Manual health check:**
```bash
# SSH to server
ssh root@YOUR_SERVER_IP

# Get container ID
docker ps | grep your-app

# Test health endpoint
docker exec CONTAINER_ID wget --spider http://localhost:80/
```

**Expected:**
```
HTTP request sent, awaiting response... 200 OK
```

**If health check fails:**
```bash
# Check nginx is running
docker exec CONTAINER_ID nginx -t

# Check nginx logs
docker exec CONTAINER_ID cat /var/log/nginx/error.log

# Restart nginx
docker exec CONTAINER_ID nginx -s reload
```

---

## 🔍 Debug Commands

### Check Container Logs
```bash
docker logs --tail 50 CONTAINER_ID
```

### Check Nginx Configuration
```bash
docker exec CONTAINER_ID nginx -t
```

### Check Nginx Error Logs
```bash
docker exec CONTAINER_ID cat /var/log/nginx/error.log
```

### Test Internal Connection
```bash
docker exec CONTAINER_ID wget -O- http://localhost:80/
```

### Check Container Network
```bash
docker network ls
docker network inspect coolify
```

### Restart Everything
```bash
# Restart container
docker restart CONTAINER_ID

# Restart Coolify proxy
docker restart coolify-proxy

# Redeploy from Coolify dashboard
```

---

## 📋 Checklist

Run through this checklist:

- [ ] Container is running (`docker ps`)
- [ ] Container logs show no errors
- [ ] Nginx configuration is valid (`nginx -t`)
- [ ] DNS points to server IP
- [ ] DNS propagation complete
- [ ] Port 80 and 443 are open
- [ ] SSL certificate generated
- [ ] Health check passes
- [ ] Coolify proxy is running
- [ ] Domain configured correctly in Coolify

---

## 🎯 Quick Fixes by Symptom

### "Container not starting"
```bash
# Check build logs in Coolify
# Verify Dockerfile syntax
# Check if dist/ folder exists
docker exec CONTAINER_ID ls -la /usr/share/nginx/html/
```

### "DNS not resolving"
```bash
# Wait 5-30 minutes
# Check DNS propagation: https://dnschecker.org/
# Verify A record points to correct IP
```

### "SSL certificate failed"
```bash
# Ensure DNS is pointing
# Open ports 80 and 443
# Try HTTP first, then switch to HTTPS
# Check Let's Encrypt logs in Coolify
```

### "502 Bad Gateway"
```bash
# Container not ready
# Wait 30 seconds
# Check health check
# Restart container
```

### "404 Not Found"
```bash
# Check nginx.conf
# Verify dist/ files copied
# Check root path in nginx config
```

---

## 🚀 Nuclear Option: Clean Redeploy

If nothing works, start fresh:

### 1. Delete Resource in Coolify
- Go to resource → Settings → Delete
- Confirm deletion

### 2. Clean Up Docker
```bash
# SSH to server
ssh root@YOUR_SERVER_IP

# Remove old containers
docker ps -a | grep your-app
docker rm -f CONTAINER_ID

# Remove old images
docker images | grep your-app
docker rmi IMAGE_ID

# Clean up networks
docker network prune
```

### 3. Redeploy
- Create new resource in Coolify
- Configure domain again
- Deploy

---

## 📞 Still Not Working?

### Check Coolify Documentation
- https://coolify.io/docs
- https://coolify.io/docs/knowledge-base

### Check Community
- Coolify Discord: https://discord.gg/coolify
- GitHub Issues: https://github.com/coollabsio/coolify/issues

### Collect Debug Info
```bash
# Container logs
docker logs CONTAINER_ID > container-logs.txt

# Nginx logs
docker exec CONTAINER_ID cat /var/log/nginx/error.log > nginx-error.log

# Network info
docker network inspect coolify > network-info.txt

# DNS check
dig your-domain.com > dns-check.txt
```

Send these files for help.

---

## ✅ Expected Timeline

| Step | Time |
|------|------|
| DNS propagation | 5-30 minutes |
| SSL certificate | 2-5 minutes |
| Container startup | 1-2 minutes |
| Health check pass | 30 seconds |
| **Total** | **10-40 minutes** |

---

## 🎉 Success Indicators

You'll know it's working when:

- ✅ Container status: "Running"
- ✅ Health check: "Healthy"
- ✅ SSL status: "Active"
- ✅ Domain accessible via browser
- ✅ No warnings in Coolify dashboard

---

**Status**: Troubleshooting guide ready  
**Last Updated**: September 19, 2026  
**Version**: 1.0
