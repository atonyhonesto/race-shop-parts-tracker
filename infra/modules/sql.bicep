// Azure SQL Database free offer: serverless, Entra ID authentication only (no SQL logins or
// passwords anywhere), firewall open only to the API's outbound addresses.

@description('Azure region. The free offer is not available in every region.')
param location string

@description('Logical server name (globally unique).')
param serverName string

@description('Database name.')
param databaseName string

@description('Display name of the Entra ID group that administers the server (deploy identity + people).')
param adminGroupName string

@description('Object ID of that group.')
param adminGroupObjectId string

@description('Outbound IP addresses of the API (App Service) that may connect.')
param allowedIpAddresses array

resource server 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: serverName
  location: location
  properties: {
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled' // F1 has no VNet integration; the firewall and Entra-only auth protect it
    administrators: {
      administratorType: 'ActiveDirectory'
      principalType: 'Group'
      login: adminGroupName
      sid: adminGroupObjectId
      tenantId: tenant().tenantId
      azureADOnlyAuthentication: true
    }
  }
}

resource database 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: server
  name: databaseName
  location: location
  sku: {
    name: 'GP_S_Gen5'
    tier: 'GeneralPurpose'
    family: 'Gen5'
    capacity: 2
  }
  properties: {
    // The free offer: 100,000 vCore-seconds and 32 GB per month. When the allowance runs out the
    // database pauses until next month instead of billing ("auto-pause until next month").
    useFreeLimit: true
    freeLimitExhaustionBehavior: 'AutoPause'
    autoPauseDelay: 60
    minCapacity: json('0.5')
    maxSizeBytes: 34359738368
    zoneRedundant: false
    requestedBackupStorageRedundancy: 'Local'
  }
}

// One rule per App Service outbound address (instead of "Allow Azure services", which would admit
// every Azure customer's traffic). The deploy workflow adds and removes its own runner's address.
resource apiFirewallRules 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = [
  for (ip, index) in allowedIpAddresses: {
    parent: server
    name: 'api-outbound-${index}'
    properties: {
      startIpAddress: ip
      endIpAddress: ip
    }
  }
]

output serverName string = server.name
output serverFqdn string = server.properties.fullyQualifiedDomainName
output databaseName string = database.name
