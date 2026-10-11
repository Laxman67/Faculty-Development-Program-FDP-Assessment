const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api'

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Request failed with status ${response.status}`)
  }

  return payload.data
}

export async function fetchStudentPage({ query = '', status = '', page = 1, pageSize = 10, signal } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (query.trim()) params.set('q', query.trim())
  if (status && status !== 'All statuses') params.set('status', status)

  const response = await fetch(`${apiBaseUrl}/students?${params}`, {
    headers: { 'Content-Type': 'application/json' },
    signal,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Request failed with status ${response.status}`)
  }
  if (!Array.isArray(payload.data) || !payload.pagination) {
    throw new Error('The student API returned an invalid response.')
  }

  return { students: payload.data, pagination: payload.pagination }
}

export async function fetchStudents(options) {
  const { students } = await fetchStudentPage(options)
  return students
}

export async function createStudent(student, signal) {
  return request('/students', {
    method: 'POST',
    body: JSON.stringify(student),
    signal,
  })
}

export async function updateStudent(id, student, signal) {
  return request(`/students/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(student),
    signal,
  })
}