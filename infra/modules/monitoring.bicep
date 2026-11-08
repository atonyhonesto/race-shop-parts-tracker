// Application Insights (workspace-based, the only kind Azure still creates) with hard daily caps.
// 0.1 GB/day stays inside Log Analytics' 5 GB/month free ingestion, so telemetry costs nothing.

@description('Azure region.')
param location string

@description('Base name, e.g. raceshop-abc123.')
param baseName string

@description('Daily ingestion cap in GB, for both the workspace and Application Insights.')
param dailyCapGb string = '0.1'

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${baseName}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30 // included at no cost
    workspaceCapping: { dailyQuotaGb: json(dailyCapGb) }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${baseName}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
    IngestionMode: 'LogAnalytics'
    RetentionInDays: 30
  }
}

// Application Insights' own daily cap (a second guard in front of the workspace cap).
resource appInsightsCap 'Microsoft.Insights/components/pricingPlans@2017-10-01' = {
  parent: appInsights
  name: 'current'
  properties: {
    planType: 'Basic'
    cap: json(dailyCapGb)
    warningThreshold: 90
    stopSendNotificationWhenHitCap: false
  }
}

@description('Name of Application Insights; the app module reads its connection string directly, so it is never passed around as an output.')
output appInsightsName string = appInsights.name
