'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Lead {
  leadId: number
  customerName: string
  phone: string
  city: string
  service: string
  description: string
  assignedAt: string
}

interface Provider {
  id: number
  name: string
  monthlyQuota: number
  leadsCount: number
  leads: Lead[]
}

export default function DashboardPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [connected, setConnected] = useState(false)
  const [newLeadFlash, setNewLeadFlash] = useState(false)
  const [expandedProvider, setExpandedProvider] = useState<number | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      const data = await res.json()
      setProviders(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()

    // Subscribe to SSE for real-time updates
    const connectSSE = () => {
      const es = new EventSource('/api/events')
      eventSourceRef.current = es

      es.onopen = () => setConnected(true)

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'lead-update') {
            // Flash effect then refetch
            setNewLeadFlash(true)
            setTimeout(() => setNewLeadFlash(false), 2000)
            fetchDashboard()
          }
        } catch {}
      }

      es.onerror = () => {
        setConnected(false)
        es.close()
        // Reconnect after 3 seconds
        setTimeout(connectSSE, 3000)
      }
    }

    connectSSE()

    return () => {
      eventSourceRef.current?.close()
    }
  }, [fetchDashboard])

  const getQuotaColor = (quota: number) => {
    if (quota >= 7) return 'var(--success)'
    if (quota >= 4) return 'var(--warning)'
    return 'var(--danger)'
  }

  const getQuotaBarWidth = (quota: number) => `${(quota / 10) * 100}%`

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--gray-400)' }}>
        <div className="spinner" style={{ width: 32, height: 32, borderColor: 'var(--gray-200)', borderTopColor: 'var(--primary)', margin: '0 auto 16px' }} />
        <p>Loading dashboard...</p>
      </div>
    )
  }

  const totalLeads = providers.reduce((s, p) => s + p.leadsCount, 0)
  const fullProviders = providers.filter((p) => p.monthlyQuota === 0).length

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Provider Dashboard</h1>
          <p className="page-subtitle">
            Real-time view of all provider assignments and quotas
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {connected ? (
            <span className="live-badge">
              <span className="live-dot" />
              Live
            </span>
          ) : (
            <span className="badge badge-warning">⚡ Reconnecting...</span>
          )}
          {lastUpdated && (
            <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button id="refresh-dashboard-btn" onClick={fetchDashboard} className="btn btn-outline btn-sm">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Providers', value: providers.length, icon: '👥' },
          { label: 'Total Leads', value: totalLeads, icon: '📋' },
          { label: 'Quota Full', value: fullProviders, icon: '🔴' },
          { label: 'Active Providers', value: providers.length - fullProviders, icon: '🟢' },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-900)' }}>{stat.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {newLeadFlash && (
        <div className="alert alert-success" style={{ marginBottom: 20 }}>
          <span>🔔</span>
          <strong>New lead assigned! Dashboard updated.</strong>
        </div>
      )}

      {/* Provider Cards */}
      <div className="provider-grid">
        {providers.map((provider) => {
          const isExpanded = expandedProvider === provider.id
          const leadsToShow = isExpanded ? provider.leads : provider.leads.slice(0, 3)

          return (
            <div key={provider.id} className="provider-card" id={`provider-card-${provider.id}`}>
              <div className="provider-card-header">
                <span className="provider-name">{provider.name}</span>
                <span className={`badge ${provider.monthlyQuota === 0 ? 'badge-danger' : provider.monthlyQuota <= 3 ? 'badge-warning' : 'badge-success'}`}>
                  {provider.monthlyQuota === 0 ? '🔴 Full' : `${provider.monthlyQuota} left`}
                </span>
              </div>

              <div className="provider-stats">
                <div className="stat">
                  <span className="stat-value">{provider.leadsCount}</span>
                  <span className="stat-label">Leads Received</span>
                </div>
                <div className="stat" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="stat-label">Quota Remaining</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: getQuotaColor(provider.monthlyQuota) }}>
                      {provider.monthlyQuota}/10
                    </span>
                  </div>
                  <div className="quota-bar-bg">
                    <div
                      className="quota-bar-fill"
                      style={{
                        width: getQuotaBarWidth(provider.monthlyQuota),
                        background: getQuotaColor(provider.monthlyQuota),
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="provider-leads">
                {provider.leads.length === 0 ? (
                  <div className="no-leads">No leads assigned yet</div>
                ) : (
                  <>
                    {leadsToShow.map((lead) => (
                      <div key={lead.leadId} className="lead-item">
                        <div className="lead-item-name">
                          {lead.customerName}
                          <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: '0.7rem' }}>
                            {lead.service}
                          </span>
                        </div>
                        <div className="lead-item-meta">
                          📞 {lead.phone} · 📍 {lead.city}
                        </div>
                        <div className="lead-item-meta" style={{ marginTop: 2, fontStyle: 'italic' }}>
                          {lead.description.length > 60
                            ? lead.description.slice(0, 60) + '...'
                            : lead.description}
                        </div>
                      </div>
                    ))}

                    {provider.leads.length > 3 && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: 8, width: '100%' }}
                        onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                      >
                        {isExpanded
                          ? '▲ Show less'
                          : `▼ Show ${provider.leads.length - 3} more`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
