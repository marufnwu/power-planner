# 🚨 Quick Fix: "No Available Server"

## ⚡ Fastest Solution (5 minutes)

### 1. Check DNS (Most Common Issue)
```bash
# Test if DNS is pointing
nslookup your-domain.com
```

**If not pointing:**
- Go to domain registrar
- Add A record: `your-domain.com → YOUR_SERVER_IP`
- Wait 5-30 minutes

### 2. Check Container
```bash
# SSH to server
ssh root@YOUR_SERVER_IP

# Check if container is running
docker ps | grep your-app
```

**If not running:**
```bash
# Check logs
docker logs CONTAINER_ID

# Restart
docker restart CONTAINER_ID
```

### 3. Test Directly
```bash
# Test from server
curl http://localhost:80/
```

**If works:** Issue is with Coolify proxy  
**If fails:** Issue is with container/nginx

### 4. Restart Coolify Proxy
```bash
docker restart coolify-proxy
```

### 5. Check SSL
- Go to Coolify → Settings → Domains
- Check SSL status
- If failed, click "Generate SSL" again

---

## 🎯 Most Likely Causes (In Order)

| # | Issue | Fix | Time |
|---|-------|-----|------|
| 1 | DNS not pointing | Add A record | 5-30 min |
| 2 | Container not running | Restart container | 1 min |
| 3 | SSL failed | Regenerate SSL | 2-5 min |
| 4 | Proxy not running | Restart proxy | 1 min |
| 5 | Port blocked | Open firewall | 1 min |

---

## 🔍 Quick Diagnostic

Run these commands on your server:

```bash
# 1. Is container running?
docker ps | grep your-app

# 2. Is nginx responding?
docker exec CONTAINER_ID wget --spider http://localhost:80/

# 3. Is DNS pointing?
dig your-domain.com +short

# 4. Are ports open?
ufw status | grep -E '80|443'

# 5. Is proxy running?
docker ps | grep coolify-proxy
```

**All should show positive results. If any fail, that's your issue.**

---

## 🚀 Nuclear Option (If Nothing Works)

```bash
# SSH to server
ssh root@YOUR_SERVER_IP

# Stop everything
docker stop $(docker ps -aq)

# Clean up
docker system prune -af

# Restart Coolify
systemctl restart coolify

# Redeploy from Coolify dashboard
```

---

## 📞 Need More Help?

- **Full guide:** [TROUBLESHOOTING_NO_SERVER.md](./TROUBLESHOOTING_NO_SERVER.md)
- **Coolify docs:** https://coolify.io/docs
- **Community:** https://discord.gg/coolify

---

**Status:** Quick reference ready  
**Time to fix:** 5-30 minutes (usually DNS)
