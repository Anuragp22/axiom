# 🚀 Azure Deployment Setup Guide

## Required GitHub Secrets

Before the deployment workflows can run, you need to set up the following secrets in your GitHub repository:

### 🔐 Go to: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

## Backend Deployment Secrets

### 1. `AZUREAPPSERVICE_PUBLISHPROFILE`
```bash
# Get from Azure Portal:
# 1. Go to your App Service: axiom-fya9ajasbwafg6ax
# 2. Click "Get publish profile" 
# 3. Copy the entire XML content
# 4. Paste as secret value
```

### 2. `AZUREAPPSERVICE_PUBLISHPROFILE_STAGING` (Optional)
```bash
# Same as above but for staging slot
# Create staging slot first in Azure Portal
```

### 3. `REDIS_URL` (Optional)
```bash
# If using Redis for caching
# Format: redis://username:password@host:port
# Example: redis://default:abc123@my-redis.redis.cache.windows.net:6380
```

## Frontend Deployment Secrets (If using Static Web Apps)

### 4. `AZURE_STATIC_WEB_APPS_API_TOKEN`
```bash
# Get from Azure Portal:
# 1. Create Azure Static Web App
# 2. Go to Static Web App → Manage deployment token
# 3. Copy the token
# 4. Paste as secret value
```

## 📋 Azure App Service Configuration

### Required App Settings in Azure Portal:
```json
{
  "NODE_ENV": "production",
  "WEBSITE_NODE_DEFAULT_VERSION": "18.17.0",
  "SCM_DO_BUILD_DURING_DEPLOYMENT": "false",
  "WEBSITE_RUN_FROM_PACKAGE": "1",
  "PORT": "8080",
  "API_BASE_URL": "https://axiom-fya9ajasbwafg6ax.centralindia-01.azurewebsites.net",
  "REDIS_URL": "your-redis-connection-string",
  "LOG_LEVEL": "info"
}
```

## 🔧 Azure Setup Steps

### 1. Create Azure App Service
```bash
# Using Azure CLI
az webapp create \
  --resource-group your-resource-group \
  --plan your-app-service-plan \
  --name axiom-fya9ajasbwafg6ax \
  --runtime "NODE|18-lts"
```

### 2. Configure App Service
```bash
# Set Node.js version
az webapp config appsettings set \
  --resource-group your-resource-group \
  --name axiom-fya9ajasbwafg6ax \
  --settings WEBSITE_NODE_DEFAULT_VERSION=18.17.0

# Enable WebSocket support
az webapp config set \
  --resource-group your-resource-group \
  --name axiom-fya9ajasbwafg6ax \
  --web-sockets-enabled true
```

### 3. Create Staging Slot (Optional)
```bash
az webapp deployment slot create \
  --resource-group your-resource-group \
  --name axiom-fya9ajasbwafg6ax \
  --slot staging
```

## 🌐 Domain Configuration

### Current Domain:
- **Production**: `https://axiom-fya9ajasbwafg6ax.centralindia-01.azurewebsites.net`
- **Staging**: `https://axiom-fya9ajasbwafg6ax-staging.centralindia-01.azurewebsites.net`

### Custom Domain (Optional):
```bash
# Add custom domain
az webapp config hostname add \
  --resource-group your-resource-group \
  --webapp-name axiom-fya9ajasbwafg6ax \
  --hostname your-custom-domain.com
```

## 🔍 Deployment Verification

After setting up secrets and running the workflow:

1. **Check Build Logs**: Go to Actions tab in GitHub
2. **Verify Health Check**: Visit `/api/v1/health` endpoint
3. **Test WebSocket**: Check browser console for connections
4. **Monitor Performance**: Azure Portal → App Service → Metrics

## 🚨 Troubleshooting

### Common Issues:

1. **Build Fails**: Check Node.js version compatibility
2. **App Won't Start**: Verify PORT environment variable
3. **WebSocket Issues**: Ensure WebSocket support is enabled
4. **API Errors**: Check Redis connection and external API limits

### Debug Commands:
```bash
# Check app logs
az webapp log tail --resource-group your-rg --name axiom-fya9ajasbwafg6ax

# Restart app
az webapp restart --resource-group your-rg --name axiom-fya9ajasbwafg6ax
```

## 📊 Monitoring Setup

### Enable Application Insights:
```bash
az extension add --name application-insights
az monitor app-insights component create \
  --app axiom-insights \
  --location centralindia \
  --resource-group your-resource-group
```

### Alerts (Optional):
- Response time > 5 seconds
- HTTP 5xx errors > 10/minute
- CPU usage > 80%
- Memory usage > 90%

## 🔄 Workflow Triggers

- **Automatic**: Push to `main` branch
- **Manual**: Use "Run workflow" button in Actions tab
- **Staging**: Push to `develop` branch
- **Frontend Only**: Changes in `axiom-frontend/` folder

## 🎯 Next Steps

1. Set up all required secrets
2. Verify Azure App Service is running
3. Test deployment with a small change
4. Monitor first deployment carefully
5. Set up custom domain (if needed)
6. Configure monitoring and alerts 