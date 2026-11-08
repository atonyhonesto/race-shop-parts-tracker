// Values come from the deploy workflow's environment (GitHub "production" environment variables).
// None of them are secrets. See docs/deploy/azure-setup.md.
using './main.bicep'

param sqlAdminGroupName = readEnvironmentVariable('SQL_ADMIN_GROUP_NAME')
param sqlAdminGroupObjectId = readEnvironmentVariable('SQL_ADMIN_GROUP_OBJECT_ID')
param entraApiClientId = readEnvironmentVariable('ENTRA_API_CLIENT_ID')
param budgetEmail = readEnvironmentVariable('BUDGET_EMAIL')
param budgetStartDate = readEnvironmentVariable('BUDGET_START_DATE')
