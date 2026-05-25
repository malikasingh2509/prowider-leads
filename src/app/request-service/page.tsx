'use client'

import { useState, useEffect } from 'react'

interface Service {
  id: number
  name: string
}

interface SubmitResult {
  success?: boolean
  leadId?: number
  assignedProviders?: number[]
  error?: string
}

export default function RequestServicePage() {
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    city: '',
    serviceId: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then(setServices)
      .catch(() => setServices([
        { id: 1, name: 'Service 1' },
        { id: 2, name: 'Service 2' },
        { id: 3, name: 'Service 3' },
      ]))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setResult({ error: data.error || 'Something went wrong' })
      } else {
        setResult(data)
        // Reset form on success
        setForm({ customerName: '', phone: '', city: '', serviceId: '', description: '' })
      }
    } catch {
      setResult({ error: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Submit a Service Request</h1>
        <p className="page-subtitle">
          Fill in your details and we'll connect you with the right service providers instantly.
        </p>
      </div>

      <div style={{ maxWidth: 640 }}>
        {result?.error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{result.error}</span>
          </div>
        )}

        {result?.success && (
          <div className="alert alert-success">
            <span>✅</span>
            <div>
              <strong>Lead submitted successfully!</strong>
              <br />
              <span style={{ fontSize: '0.85rem' }}>
                Lead #{result.leadId} assigned to{' '}
                {result.assignedProviders?.map((id) => `Provider ${id}`).join(', ')}
              </span>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Service Enquiry Form</span>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="customerName">
                    Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="customerName"
                    name="customerName"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={form.customerName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phone">
                    Phone Number <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    className="form-input"
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="city">
                    City <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={form.city}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="serviceId">
                    Service Type <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    id="serviceId"
                    name="serviceId"
                    className="form-select"
                    value={form.serviceId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">— Select a service —</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label className="form-label" htmlFor="description">
                    Description <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    className="form-textarea"
                    placeholder="Describe your service requirement..."
                    value={form.description}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <button
                  id="submit-lead-btn"
                  type="submit"
                  className="btn btn-primary btn-lg btn-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Submitting...
                    </>
                  ) : (
                    '🚀 Submit Service Request'
                  )}
                </button>
              </div>

              <p style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--gray-400)', textAlign: 'center' }}>
                Same phone number cannot submit the same service type twice.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
