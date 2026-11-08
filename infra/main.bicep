// Race Shop Parts Tracker on Azure free tiers (ADR 0010). Deployed to an existing resource group
// by .github/workflows/deploy.yml; one-time setup in docs/deploy/azure-setup.md.
//
//   App Service F1 (API) ── managed identity ──► Azure SQL free offer (Entra-only auth)
//   Static Web Apps Free ×2 (web app, Storybook)
//   Application Insights + Log Analytics, 0.1 GB/day caps
//   $1 budget alert

targetScope = 'resourceGroup'

@description('Region for the API, database and monitoring.')
param location string = resourceGroup().location

@description('Region for the Static Web Apps (Free is offered in a few regions only).')
@allowed(['eastus2', 'centralus', 'westus2', 'westeurope', 'eastasia'])
param staticWebAppLocation string = 'eastus2'

@description('Short prefix for resource names.')
@maxLength(12)
param namePrefix string = 'raceshop'

@description('Entra ID group that administers Azure SQL: the deploy identity and the people who support it.')
param sqlAdminGroupName string

@description('Object ID of the SQL admin group.')
param sqlAdminGroupObjectId string

@description('Client ID of the API app registration (docs/auth/entra-setup.md).')
param entraApiClientId string

@description('Entra ID tenant of the app registrations.')
param entraTenantId string = tenant().tenantId

@description('Email for the cost alert.')
param budgetEmail string

@description('First day of the month the budget starts.')
param budgetStartDate string

// Names are deterministic per resource group, so redeploys update in place.
var baseName = '${namePrefix}-${take(uniqueString(resourceGroup().id), 6)}'
var sqlServerName = '${baseName}-sql'
var databaseName = 'raceshop'

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    baseName: baseName
  }
}

module web 'modules/staticWebApp.bicep' = {
  name: 'web'
  params: {
    location: staticWebAppLocation
    name: '${baseName}-web'
  }
}

module storybook 'modules/staticWebApp.bicep' = {
  name: 'storybook'
  params: {
    location: staticWebAppLocation
    name: '${baseName}-storybook'
  }
}

module api 'modules/appService.bicep' = {
  name: 'api'
  params: {
    location: location
    baseName: baseName
    sqlServerFqdn: '${sqlServerName}${environment().suffixes.sqlServerHostname}'
    databaseName: databaseName
    webAppOrigin: 'https://${web.outputs.hostName}'
    entraTenantId: entraTenantId
    entraApiClientId: entraApiClientId
    appInsightsName: monitoring.outputs.appInsightsName
  }
}

module sql 'modules/sql.bicep' = {
  name: 'sql'
  params: {
    location: location
    serverName: sqlServerName
    databaseName: databaseName
    adminGroupName: sqlAdminGroupName
    adminGroupObjectId: sqlAdminGroupObjectId
    allowedIpAddresses: api.outputs.outboundIpAddresses
  }
}

module budget 'modules/budget.bicep' = {
  name: 'budget'
  params: {
    contactEmail: budgetEmail
    startDate: budgetStartDate
  }
}

// Read by the deploy workflow. None of these are secrets.
output apiName string = api.outputs.apiName
output apiUrl string = 'https://${api.outputs.apiHostName}'
output apiIdentityName string = api.outputs.identityName
output apiIdentityClientId string = api.outputs.identityClientId
output sqlServerName string = sql.outputs.serverName
output sqlServerFqdn string = sql.outputs.serverFqdn
output databaseName string = sql.outputs.databaseName
output webName string = web.outputs.name
output webUrl string = 'https://${web.outputs.hostName}'
output storybookName string = storybook.outputs.name
output storybookUrl string = 'https://${storybook.outputs.hostName}'
