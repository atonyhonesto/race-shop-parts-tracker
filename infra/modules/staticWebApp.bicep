// A Static Web App on the Free plan. Content is uploaded by the deploy workflow (no linked repo),
// using a deployment token it reads at deploy time; nothing is stored in GitHub.

@description('Static Web Apps region (Free is offered in a few regions only, e.g. eastus2, westeurope).')
param location string

@description('Resource name.')
param name string

resource site 'Microsoft.Web/staticSites@2024-04-01' = {
  name: name
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    stagingEnvironmentPolicy: 'Disabled' // no pull-request preview environments
    allowConfigFileUpdates: true
  }
}

output name string = site.name
output hostName string = site.properties.defaultHostname
