const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const statuses = ['Applied', 'Interview', 'Offered', 'Placed']

export function validateStudentFields(student) {
  const errors = {}

  if (!student.name.trim()) errors.name = 'Student name is required.'

  if (!student.email.trim()) {
    errors.email = 'Email address is required.'
  } else if (!emailPattern.test(student.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!student.course.trim()) errors.course = 'Course is required.'
  if (!student.status) {
    errors.status = 'Placement status is required.'
  } else if (!statuses.includes(student.status)) {
    errors.status = 'Choose a valid placement status.'
  }

  return errors
}

export function validateStudent(student) {
  return Object.values(validateStudentFields(student))[0] ?? ''
}