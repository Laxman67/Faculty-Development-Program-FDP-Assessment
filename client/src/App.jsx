import { useEffect, useState } from 'react'
import StudentForm from './components/StudentForm.jsx'
import StudentTable from './components/StudentTable.jsx'
import { sampleStudents } from './data/sampleStudents.js'
import { createStudent, fetchStudentPage, updateStudent } from './services/studentService.js'
import { filterStudents } from './utils/studentFilters.js'
import './App.css'

function App() {
  const [apiStudents, setApiStudents] = useState([])
  const [previewStudents, setPreviewStudents] = useState(sampleStudents)
  const [pagination, setPagination] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [page, setPage] = useState(1)
  const [source, setSource] = useState('api')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)

  useEffect(() => {
    if (source !== 'api') return

    const controller = new AbortController()
    let currentRequest = true

    fetchStudentPage({ query, status: statusFilter, page, signal: controller.signal })
      .then(({ students: records, pagination: pageInfo }) => {
        if (!currentRequest) return
        setApiStudents(records)
        setPagination(pageInfo)
      })
      .catch((requestError) => {
        if (currentRequest && requestError.name !== 'AbortError') {
          setError(requestError.message)
        }
      })
      .finally(() => {
        if (currentRequest) setLoading(false)
      })

    return () => {
      currentRequest = false
      controller.abort()
    }
  }, [source, query, statusFilter, page, refreshKey])

  const students = source === 'preview' ? previewStudents : apiStudents
  const visibleStudents = filterStudents(students, query, statusFilter)
  const placedCount = visibleStudents.filter((student) => student.status === 'Placed').length
  const offeredCount = visibleStudents.filter((student) => student.status === 'Offered').length
  const totalCount = source === 'api' ? pagination?.total ?? 0 : visibleStudents.length

  function openCreateForm() {
    setEditingStudent(null)
    setFormOpen(true)
    setNotice('')
  }

  function openEditForm(student) {
    setEditingStudent(student)
    setFormOpen(true)
    setNotice('')
  }

  function selectSource(nextSource) {
    if (nextSource === source) return
    setSource(nextSource)
    setError('')
    setLoading(nextSource === 'api')
    setPage(1)
  }

  function retryLoading() {
    setError('')
    setLoading(true)
    setRefreshKey((key) => key + 1)
  }

  async function handleSave(values) {
    if (source === 'preview') {
      if (editingStudent) {
        setPreviewStudents((current) => current.map((record) => (
          record._id === editingStudent._id ? { ...record, ...values } : record
        )))
      } else {
        setPreviewStudents((current) => [{ ...values, _id: crypto.randomUUID() }, ...current])
      }
    } else {
      if (editingStudent) {
        await updateStudent(editingStudent._id, values)
      } else {
        await createStudent(values)
      }
      setLoading(true)
      setError('')
      setRefreshKey((key) => key + 1)
    }

    setFormOpen(false)
    setEditingStudent(null)
    setNotice(editingStudent ? 'Student updated.' : 'Student added.')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="Campus records home">
          <span className="brand-mark" aria-hidden="true">CR</span>
          <span>Campus records</span>
        </a>
        <div className="topbar-meta">
          <span className="term-label">PLACEMENT CELL <i /></span>
          <span className="term-name">2025–26</span>
        </div>
      </header>

      <section className="page-content" id="main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">STUDENT OUTCOMES / OVERVIEW</p>
            <h1>Campus placement records</h1>
            <p className="heading-copy">A clear view of every student's next step.</p>
          </div>
          <button className="primary-button" type="button" onClick={openCreateForm}>
            <span aria-hidden="true">+</span> Add student
          </button>
        </div>

        <section className="summary-grid" aria-label="Placement summary">
          <article className="summary-item summary-total">
            <span className="summary-label">TOTAL STUDENTS</span>
            <strong>{totalCount}</strong>
            <span className="summary-foot">{source === 'api' ? 'Matching records' : 'In the current view'}</span>
          </article>
          <article className="summary-item">
            <span className="summary-label">PLACED</span>
            <strong>{placedCount}</strong>
            <span className="summary-foot">{source === 'api' ? 'On this page' : 'Offer accepted'}</span>
          </article>
          <article className="summary-item">
            <span className="summary-label">OFFERS</span>
            <strong>{offeredCount}</strong>
            <span className="summary-foot">{source === 'api' ? 'On this page' : 'Awaiting decision'}</span>
          </article>
          <article className="summary-aside">
            <span className="aside-symbol" aria-hidden="true">↗</span>
            <span>Spring placement<br />cycle</span>
            <small>RECORDS UPDATED AS THEY PROGRESS</small>
          </article>
        </section>

        <section className="records-section" aria-labelledby="records-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DIRECTORY</p>
              <h2 id="records-title">Student records <span>{totalCount}</span></h2>
            </div>
            <div className="source-switch" aria-label="Records source">
              <button
                type="button"
                className={source === 'api' ? 'selected' : ''}
                aria-pressed={source === 'api'}
                onClick={() => selectSource('api')}
              >API data</button>
              <button
                type="button"
                className={source === 'preview' ? 'selected' : ''}
                aria-pressed={source === 'preview'}
                onClick={() => selectSource('preview')}
              >Sample preview</button>
            </div>
          </div>

          {notice && <p className="notice-message" role="status">{notice}</p>}

          <div className="table-toolbar">
            <label className="search-field">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <span className="sr-only">Search students by name or email</span>
              <input
                type="search"
                value={query}
                placeholder="Search name or email"
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                  setLoading(source === 'api')
                  setError('')
                }}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery('')
                    setPage(1)
                    setLoading(source === 'api')
                    setError('')
                  }}
                >×</button>
              )}
            </label>
            <label className="filter-field">
              <span className="sr-only">Filter by placement status</span>
              <select value={statusFilter} onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
                setLoading(source === 'api')
                setError('')
              }}>
                <option>All statuses</option>
                <option>Applied</option>
                <option>Interview</option>
                <option>Offered</option>
                <option>Placed</option>
              </select>
            </label>
            {(query || statusFilter !== 'All statuses') && (
              <button
                className="text-button clear-filters"
                type="button"
                onClick={() => {
                  setQuery('')
                  setStatusFilter('All statuses')
                  setPage(1)
                  setLoading(source === 'api')
                  setError('')
                }}
              >Clear filters</button>
            )}
            <span className="record-count">{visibleStudents.length} RECORDS</span>
          </div>

          {error && (
            <div className="state-panel error-panel" role="alert">
              <strong>Records could not be loaded</strong>
              <p>{error}</p>
              <button className="secondary-button" type="button" onClick={retryLoading}>Try again</button>
            </div>
          )}
          {!error && loading && <div className="state-panel" role="status">Loading student records…</div>}
          {!error && !loading && (
            <StudentTable
              students={source === 'preview' ? visibleStudents : apiStudents}
              hasFilters={Boolean(query || statusFilter !== 'All statuses')}
              onEdit={openEditForm}
            />
          )}
          {source === 'api' && !error && !loading && pagination && pagination.pages > 1 && (
            <nav className="pagination-controls" aria-label="Student record pages">
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setPage((current) => Math.max(1, current - 1))
                  setLoading(true)
                  setError('')
                }}
                disabled={page <= 1}
              >Previous</button>
              <span>Page {pagination.page} of {pagination.pages}</span>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setPage((current) => Math.min(pagination.pages, current + 1))
                  setLoading(true)
                  setError('')
                }}
                disabled={page >= pagination.pages}
              >Next</button>
            </nav>
          )}
          <div className="table-footer">
            <span>PLACEMENT OFFICE <i /></span>
            <span>{source === 'preview' ? 'SAMPLE DATA' : 'LIVE RECORDS'}</span>
          </div>
        </section>
      </section>

      <footer className="page-footer">
        <span>Campus placement office</span>
        <span>INTERNAL RECORDS · {new Date().getFullYear()}</span>
      </footer>

      {formOpen && (
        <StudentForm
          student={editingStudent}
          onClose={() => { setFormOpen(false); setEditingStudent(null) }}
          onSubmit={handleSave}
        />
      )}
    </main>
  )
}

export default App
