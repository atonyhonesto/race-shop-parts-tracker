// The API on App Service F1 (Linux, free): HTTPS only, no FTP or basic-auth publishing, a managed
// identity for Azure SQL, and settings for Entra ID, CORS and Application Insights.

@description('Azure region.')
param location string

@description('Base name, e.g. raceshop-abc123.')
param baseName string

@description('Fully qualified name of the Azure SQL server, e.g. x.database.windows.net.')
param sqlServerFqdn string

@description('Database name.')
param databaseName string

@description('Origin of the web app allowed to call the API (CORS), e.g. https://x.azurestaticapps.net.')
param webAppOrigin string

@description('Entra ID tenant of the API app registration.')
param entraTenantId string

@description('Client (application) ID of the API app registration.')
param entraApiClientId string

@description('Name of the Application Insights component in this resource group.')
param appInsightsName string

resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

// User-assigned, so its client ID is known here and the deploy pipeline can create the matching
// database user (CREATE USER ... WITH SID) without directory-read permissions.
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${baseName}-api-id'
  location: location
}

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${baseName}-plan'
  location: location
  kind: 'linux'
  sku: {
    name: 'F1'
    tier: 'Free'
  }
  properties: {
    reserved: true // Linux
  }
}

resource api 'Microsoft.Web/sites@2024-04-01' = {
  name: '${baseName}-api'
  location: location
  kind: 'app,linux'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|10.0'
      alwaysOn: false // not available on F1: the app sleeps when idle (docs/runbook.md)
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
        { name: 'Authentication__Mode', value: 'Entra' }
        { name: 'AzureAd__Instance', value: environment().authentication.loginEndpoint }
        { name: 'AzureAd__TenantId', value: entraTenantId }
        { name: 'AzureAd__ClientId', value: entraApiClientId }
        {
          name: 'ConnectionStrings__RaceShop'
          // No password: the API signs in to SQL with its managed identity. Connect Timeout covers
          // the resume from auto-pause.
          value: 'Server=tcp:${sqlServerFqdn},1433;Database=${databaseName};Authentication=Active Directory Managed Identity;User Id=${identity.properties.clientId};Encrypt=True;Connect Timeout=60;'
        }
        { name: 'Cors__AllowedOrigins__0', value: webAppOrigin }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'Telemetry__SamplingRatio', value: '0.25' }
      ]
    }
  }
}

// Deployments authenticate with Entra ID (OIDC from GitHub), never with publishing passwords.
resource scmBasicAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-04-01' = {
  parent: api
  name: 'scm'
  properties: { allow: false }
}

resource ftpBasicAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-04-01' = {
  parent: api
  name: 'ftp'
  properties: { allow: false }
}

output apiName string = api.name
output apiHostName string = api.properties.defaultHostName
output outboundIpAddresses array = split(api.properties.possibleOutboundIpAddresses, ',')
output identityName string = identity.name
output identityClientId string = identity.properties.clientId
