const firstNames = ['Aarav', 'Amaya', 'Anika', 'Arjun', 'Diya', 'Ethan', 'Ishani', 'Kabir', 'Maya', 'Noah', 'Riya', 'Zayn']
const lastNames = ['Fernando', 'Perera', 'Silva', 'Jayasinghe', 'Wickramasinghe', 'Senanayake', 'De Alwis', 'Wijesinghe']
const classes = ['Grade 6A', 'Grade 6B', 'Grade 7A', 'Grade 7B', 'Grade 8A', 'Grade 8B', 'Grade 9A', 'Grade 9B', 'Grade 10A', 'Grade 11A']
const subjects = ['Mathematics', 'English', 'Science', 'History', 'ICT']

export const students = Array.from({ length: 2000 }, (_, index) => {
  const first = firstNames[index % firstNames.length]
  const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length]
  return {
    id: `CC-${String(index + 1).padStart(4, '0')}`,
    name: `${first} ${last}`,
    className: classes[index % classes.length],
    email: `${first.toLowerCase()}.${index + 1}@student.centralcollege.edu`,
    attendance: index % 17 === 0 ? 'Absent' : 'Present',
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(`${first} ${last}`)}&backgroundColor=e7edf7`,
  }
})

export const staff = Array.from({ length: 100 }, (_, index) => ({
  id: `ST-${String(index + 1).padStart(3, '0')}`,
  name: `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`,
  role: index < 90 ? 'Teacher' : 'Office Staff',
  department: ['Mathematics', 'English', 'Science', 'Administration'][index % 4],
  status: 'Active',
}))

export const initialLeaves = [
  { id: 'LV-2401', name: 'Amaya Perera', date: 'Today, Nov 6', slot: '10:30 AM – 11:30 AM', reason: 'Medical appointment', status: 'Pending' },
  { id: 'LV-2398', name: 'Ethan Silva', date: 'Today, Nov 6', slot: '1:00 PM – 2:00 PM', reason: 'Family matter', status: 'Pending' },
  { id: 'LV-2391', name: 'Ishani Fernando', date: 'Nov 5, 2026', slot: '9:00 AM – 10:00 AM', reason: 'Bank appointment', status: 'Approved' },
]

export const initialVisitors = [
  { id: 'VS-1024', name: 'Nimal Jayasuriya', purpose: 'Parent meeting', person: 'Ms. Perera', time: '9:12 AM', vehicle: 'CAA-2481', status: 'On premises' },
  { id: 'VS-1023', name: 'Farah Nazeer', purpose: 'Admissions inquiry', person: 'Office', time: '8:48 AM', vehicle: '—', status: 'On premises' },
]

export const initialGrades = {
  'CC-0001': { Mathematics: 88, English: 92, Science: 84, History: 79, ICT: 95 },
  'CC-0002': { Mathematics: 76, English: 85, Science: 81, History: 88, ICT: 90 },
  'CC-0003': { Mathematics: 94, English: 89, Science: 93, History: 86, ICT: 91 },
  'CC-0004': { Mathematics: 68, English: 74, Science: 72, History: 80, ICT: 85 },
  'CC-0005': { Mathematics: 82, English: 91, Science: 87, History: 84, ICT: 89 },
}

export { classes, subjects }
