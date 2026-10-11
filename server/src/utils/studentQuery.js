const statuses = ['Applied', 'Interview', 'Offered', 'Placed']
const allowedParameters = new Set(['q', 'search', 'status', 'page', 'pageSize', 'limit'])
const maximumPageSize = 100
const maximumSearchLength = 200

export class StudentQueryError extends TypeError {}

function singleString(query, key) {
  const value = query[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    throw new StudentQueryError(`Query parameter "${key}" must be a single string`)
  }
  return value
}

function positiveInteger(value, parameter, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return fallback
  if (!/^[1-9]\d*$/.test(value)) {
    throw new StudentQueryError(`Query parameter "${parameter}" must be a positive integer`)
  }

  const number = Number(value)
  if (!Number.isSafeInteger(number) || number > maximum) {
    throw new StudentQueryError(`Query parameter "${parameter}" must be no greater than ${maximum}`)
  }
  return number
}

export function buildStudentQuery(query) {
  for (const parameter of Object.keys(query)) {
    if (!allowedParameters.has(parameter)) {
      throw new StudentQueryError(`Unsupported query parameter "${parameter}"`)
    }
  }

  if (query.q !== undefined && query.search !== undefined) {
    throw new StudentQueryError('Use only one of the "q" or "search" query parameters')
  }

  const search = (singleString(query, 'q') ?? singleString(query, 'search') ?? '').trim()
  if (search.length > maximumSearchLength) {
    throw new StudentQueryError(`Search text must be no more than ${maximumSearchLength} characters`)
  }
  const status = singleString(query, 'status')
  if (status && status !== 'All statuses' && !statuses.includes(status)) {
    throw new StudentQueryError('Query parameter "status" must be a valid placement status')
  }

  if (query.pageSize !== undefined && query.limit !== undefined) {
    throw new StudentQueryError('Use only one of the "pageSize" or "limit" query parameters')
  }

  const page = positiveInteger(singleString(query, 'page'), 'page', 1)
  const pageSize = positiveInteger(
    singleString(query, query.pageSize === undefined ? 'limit' : 'pageSize'),
    query.pageSize === undefined ? 'limit' : 'pageSize',
    10,
    maximumPageSize,
  )
  if (!Number.isSafeInteger((page - 1) * pageSize)) {
    throw new StudentQueryError('The requested page offset is too large')
  }
  const filter = {}
  if (status && status !== 'All statuses') filter.status = status
  if (search) filter.search = search

  return { filter, page, pageSize }
}