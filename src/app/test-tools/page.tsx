'use client'

import { useState } from 'react'

type ResultData = Record<string, unknown> | null

export default function TestToolsPage() {
  const [resetResult, setResetResult] = useState<ResultData>(null)
  const [idemResult, setIdemResult] = useState<string[]>([])
  const [genResult, setGenResult] = useState<ResultData>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [idemLoading, setIdemLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)

  // ── 1. Reset All Quotas via Webhook ──────────────────────────────────────────
  const handleResetQuota = async () => {
    setResetLoading(true)
    setResetResult(null)

    // New idempotency key per day — simulates a fresh payment event each day
    const idempotencyKey = `reset-quota-${new Date().toISOString().slice(0, 10)}-v${Date.now()}`

    try {
      const res = await fetch('/api/webhook/reset-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey }),
      })
      const data = await res.json()
      setResetResult({ ...data, idempotencyKey })
    } catch (err) {
      setResetResult({ error: String(err) })
    } finally {
      setResetLoading(false)
    }
  }

  // ── 2. Call Webhook Multiple Times with SAME Key (Idempotency Test) ──────────
  const handleIdempotencyTest = async () => {
    setIdemLoading(true)
    setIdemResult([])

    // Fixed key — calling with the same key multiple times should be a no-op after first
    const idempotencyKey = `idempotency-test-${new Date().toISOString().slice(0, 13)}`
    const results: string[] = []

    for (let i = 1; i <= 5; i++) {
      try {
        const res = await fetch('/api/webhook/reset-quota', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idempotencyKey }),
        })
        const data = await res.json()
        results.push(
          `Call ${i}: ${data.idempotent ? '✅ Idempotent (no change)' : '🔄 Processed'} — ${data.message}`
        )
        setIdemResult([...results])
      } catch (err) {
        results.push(`Call ${i}: ❌ Error — ${err}`)
        setIdemResult([...results])
      }
      // Small delay between calls to show order clearly
      await new Promise((r) => setTimeout(r, 200))
    }

    setIdemLoading(false)
  }

  // ── 3. Generate 10 Leads Simultaneously (Concurrency Test) ───────────────────
  const handleGenerateLeads = async () => {
    setGenLoading(true)
    setGenResult(null)

    try {
      const res = await fetch('/api/test/generate-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 10 }),
      })
      const data = await res.json()
      setGenResult(data)
    } catch (err) {
      setGenResult({ error: String(err) })
    } finally {
      setGenLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🛠️ Test Tools</h1>
        <p className="page-subtitle">
          Internal testing panel — simulate payment webhooks, test idempotency, and stress-test concurrency.
        </p>
      </div>

      <div className="alert alert-info" style={{ maxWidth: 700 }}>
        <span>ℹ️</span>
        <span>
          These tools are <strong>only for testing purposes</strong>. Quota reset is only possible
          via webhook — it cannot be triggered from the customer-facing UI.
        </span>
      </div>

      <div className="test-section">

        {/* Card 1: Reset Quota */}
        <div className="test-card">
          <div className="test-card-title">💳 Reset Provider Quotas</div>
          <div className="test-card-desc">
            Simulates a successful payment gateway webhook that resets all providers' monthly quota
            back to 10. Each click generates a unique idempotency key.
          </div>
          <button
            id="btn-reset-quota"
            className="btn btn-success btn-full"
            onClick={handleResetQuota}
            disabled={resetLoading}
          >
            {resetLoading ? <><span className="spinner" /> Resetting...</> : '🔄 Reset All Quotas to 10'}
          </button>

          {resetResult && (
            <div className="result-box">
              {JSON.stringify(resetResult, null, 2)}
            </div>
          )}
        </div>

        {/* Card 2: Idempotency Test */}
        <div className="test-card">
          <div className="test-card-title">🔁 Idempotency Test</div>
          <div className="test-card-desc">
            Calls the reset-quota webhook <strong>5 times</strong> with the <strong>same
            idempotency key</strong>. Only the first call should process; the rest should be no-ops.
          </div>
          <button
            id="btn-idempotency-test"
            className="btn btn-danger btn-full"
            onClick={handleIdempotencyTest}
            disabled={idemLoading}
          >
            {idemLoading ? <><span className="spinner" /> Testing...</> : '🧪 Call Webhook 5× (Same Key)'}
          </button>

          {idemResult.length > 0 && (
            <div className="result-box">
              {idemResult.join('\n')}
            </div>
          )}
        </div>

        {/* Card 3: Generate 10 leads */}
        <div className="test-card">
          <div className="test-card-title">⚡ Concurrency Stress Test</div>
          <div className="test-card-desc">
            Fires <strong>10 lead creation requests simultaneously</strong> using Promise.all.
            Tests that allocation is correct and consistent under concurrent load.
          </div>
          <button
            id="btn-generate-leads"
            className="btn btn-primary btn-full"
            onClick={handleGenerateLeads}
            disabled={genLoading}
          >
            {genLoading ? <><span className="spinner" /> Generating...</> : '🚀 Generate 10 Leads Instantly'}
          </button>

          {genResult && (
            <div className="result-box">
              {typeof genResult === 'object'
                ? `Succeeded: ${(genResult as any).succeeded}/${(genResult as any).total}\nFailed: ${(genResult as any).failed}/${(genResult as any).total}\n\n` +
                  ((genResult as any).results ?? [])
                    .map((r: any, i: number) =>
                      `Lead ${i + 1}: ${r.success ? `✅ #${r.leadId} → Providers [${r.providers?.join(', ')}]` : `❌ ${r.error}`}`
                    )
                    .join('\n')
                : String(genResult)}
            </div>
          )}
        </div>

      </div>

      {/* Info Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📖 Allocation Rules Reference</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Mandatory Providers</th>
                <th>Fair Pool</th>
                <th>Total Assigned</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="badge badge-blue">Service 1</span></td>
                <td>Provider 1 (always)</td>
                <td>Providers 2, 3, 4 (round-robin)</td>
                <td>3</td>
              </tr>
              <tr>
                <td><span className="badge badge-purple">Service 2</span></td>
                <td>Provider 5 (always)</td>
                <td>Providers 6, 7, 8 (round-robin)</td>
                <td>3</td>
              </tr>
              <tr>
                <td><span className="badge badge-warning">Service 3</span></td>
                <td>Provider 1 + Provider 4 (always)</td>
                <td>Providers 2, 3, 5, 6, 7, 8 (round-robin)</td>
                <td>3</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
