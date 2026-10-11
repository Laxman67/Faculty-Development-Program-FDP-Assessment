export function filterStudents(students, search, status) {
  const normalizedSearch = search.trim().toLowerCase()

  return students.filter((student) => {
    const matchesSearch = !normalizedSearch
      || student.name.toLowerCase().includes(normalizedSearch)
      || student.email.toLowerCase().includes(normalizedSearch)
    const matchesStatus = status === 'All statuses' || student.status === status

    return matchesSearch && matchesStatus
  })
}