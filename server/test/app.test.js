import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/app.js'

test('API health and request errors use the JSON response convention', async () => {
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`

  try {
    const health = await fetch(`${baseUrl}/api/health`)
    assert.equal(health.status, 200)
    assert.equal((await health.json()).success, true)

    const invalidQuery = await fetch(`${baseUrl}/api/students?page=0`)
    assert.equal(invalidQuery.status, 400)
    assert.equal((await invalidQuery.json()).success, false)

    const invalidId = await fetch(`${baseUrl}/api/students/not-an-object-id`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    assert.equal(invalidId.status, 400)
    assert.equal((await invalidId.json()).message, 'Student ID is invalid')

    const invalidJson = await fetch(`${baseUrl}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })
    assert.equal(invalidJson.status, 400)
    assert.match((await invalidJson.json()).message, /invalid JSON/i)

    const missingRoute = await fetch(`${baseUrl}/api/missing`)
    assert.equal(missingRoute.status, 404)
    assert.equal((await missingRoute.json()).success, false)
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
