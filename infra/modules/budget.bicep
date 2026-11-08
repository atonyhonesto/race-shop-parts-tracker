// Cost tripwire: everything here is on a free tier, so any spend at all means something changed.
// Budgets are free and only send email.

@description('Email that receives the alert.')
param contactEmail string

@description('First day of the month the budget starts (cannot change after creation), e.g. 2026-11-01.')
param startDate string

resource budget 'Microsoft.Consumption/budgets@2023-11-01' = {
  name: 'raceshop-zero-cost'
  properties: {
    category: 'Cost'
    amount: 1
    timeGrain: 'Monthly'
    timePeriod: { startDate: startDate }
    notifications: {
      anySpend: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 1 // percent of $1, i.e. the first cent
        thresholdType: 'Actual'
        contactEmails: [contactEmail]
      }
      forecastOverBudget: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        thresholdType: 'Forecasted'
        contactEmails: [contactEmail]
      }
    }
  }
}
