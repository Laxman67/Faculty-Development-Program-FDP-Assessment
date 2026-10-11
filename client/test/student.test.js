import test from 'node:test'
import assert from 'node:assert/strict'
import { sampleStudents } from '../src/data/sampleStudents.js'
import { validateStudent, validateStudentFields } from '../src/utils/studentValidation.js'
import { filterStudents } from '../src/utils/studentFilters.js'
import { createStudent, fetchStudentPage, fetchStudents, updateStudent } from '../src/services/studentService.js'

test('sample preview contains the five fictional placement records', () => {
  assert.equal(sampleStudents.length, 5)
  assert.deepEqual(sampleStudents.map(({ name }) => name), [
    'Aditi Sharma', 'Rahul Verma', 'Neha Singh', 'Arjun Mehta', 'Priya Gupta',
  ])
})

test('form validation rejects missing required fields', () => {
  assert.match(validateStudent({ name: '', email: 'a@example.edu', course: 'BCA' }), /required/i)
  assert.match(validateStudent({ name: 'Aditi Sharma', email: 'a@example.edu', course: 'BCA' }), /status/i)
  assert.equal(validateStudent({ name: 'Aditi Sharma', email: 'a@example.edu', course: 'BCA', status: 'Applied' }), '')
  assert.deepEqual(validateStudentFields({
    name: '',
    email: 'invalid',
    course: '',
    status: '',
  }), {
    name: 'Student name is required.',
    email: 'Enter a valid email address.',
    course: 'Course is required.',
    status: 'Placement status is required.',
  })
})

test('student filtering supports case-insensitive search and combined status filters', () => {
  assert.deepEqual(filterStudents(sampleStudents, 'SHARMA', 'Applied'), [sampleStudents[0]])
  assert.deepEqual(filterStudents(sampleStudents, 'RAHUL.VERMA@EXAMPLE.EDU', 'All statuses'), [sampleStudents[1]])
  assert.deepEqual(filterStudents(sampleStudents, '', 'Placed'), [sampleStudents[3]])
  assert.deepEqual(filterStudents(sampleStudents, 'unknown', 'All statuses'), [])
  assert.deepEqual(filterStudents(sampleStudents, '', 'All statuses'), sampleStudents)
})

test('form validation rejects malformed email values', () => {
  assert.match(validateStudent({
    name: 'Aditi',
    email: 'not-an-email',
    course: 'BCA',
    status: 'Applied',
  }), /email/i)
})

test('student service reports failed responses instead of returning success data', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Database unavailable' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  })

  try {
    await assert.rejects(fetchStudents(), /Database unavailable/)
    await assert.rejects(createStudent({ name: 'Aditi' }), /Database unavailable/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('student service returns API records and pagination for the current filters', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url)
    return new Response(JSON.stringify({
      success: true,
      data: [sampleStudents[0]],
      pagination: { page: 2, pageSize: 10, total: 11, pages: 2 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const result = await fetchStudentPage({ query: 'Aditi Sharma', status: 'Applied', page: 2 })
    assert.deepEqual(result.students, [sampleStudents[0]])
    assert.equal(result.pagination.page, 2)
    assert.equal(requestedUrl.searchParams.get('q'), 'Aditi Sharma')
    assert.equal(requestedUrl.searchParams.get('status'), 'Applied')
    assert.equal(requestedUrl.searchParams.get('page'), '2')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('student service updates the selected student record with PUT', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl
  let requestedOptions
  globalThis.fetch = async (url, options) => {
    requestedUrl = new URL(url)
    requestedOptions = options
    return new Response(JSON.stringify({ success: true, data: { _id: 'student-id' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const student = { name: 'Aditi Sharma', email: 'aditi@example.edu' }
    const result = await updateStudent('student-id', student)
    assert.equal(result._id, 'student-id')
    assert.equal(requestedUrl.pathname, '/api/students/student-id')
    assert.equal(requestedOptions.method, 'PUT')
    assert.deepEqual(JSON.parse(requestedOptions.body), student)
  } finally {
    globalThis.fetch = originalFetch
  }
})