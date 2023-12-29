import server from './server.js'

function range (n) { return [...Array(n).keys()] }
function shuffled (a) {
  const indices = range(a.length)
  const randoms = indices.map(i => Math.random())
  indices.sort((i, j) => randoms[i] - randoms[j])
  return indices.map(i => a[i])
}
function sum (a) { return a.reduce((x, y) => x + y, 0) }

const subjects = {}
const updateInterval = 0.1
const choiceLength = 10
const feedbackLength = 10
const nPracticePeriods = 100
const nPaidPeriods = 100
const endowment = 15
const R0 = 4
const cv = {
  1: 5,
  2: 5
}
const cf = {
  1: 12,
  2: 15
}

let state = 'instructions'
let period = 0
let stage = 'wait'
let practice = true
let maxActive = 12
let countdown = 0
let showInstructions = false
let typesAssigned = false

const io = server.start(() => {
  setInterval(update, updateInterval * 1000)
})
io.on('connection', socket => {
  console.log('connection:', socket.id)
  socket.emit('connected', {})
  socket.on('join', msg => {
    if (!subjects[msg.id]) createSubject(msg, socket)
    socket.emit('joined', {})
  })
  socket.on('managerUpdateServer', msg => {
    maxActive = msg.maxActive
    showInstructions = msg.showInstructions
    Object.values(subjects).forEach(subject => {
      subject.active = subject.id <= maxActive
    })
    const reply = {
      subjects,
      typesAssigned,
      practice,
      state,
      period,
      stage,
      countdown
    }
    socket.emit('serverUpdateManager', reply)
  })
  socket.on('assignTypes', () => {
    assignTypes()
  })
  socket.on('beginPractice', () => {
    if (state === 'instructions' && typesAssigned) {
      beginPracticePeriods()
    }
  })
  socket.on('clientUpdateServer', msg => {
    if (!subjects[msg.id]) createSubject(msg, socket)
    const subject = subjects[msg.id]
    subject.v = msg.v
    const activeSubjects = Object.values(subjects).filter(s => s.active)
    const nActive = activeSubjects.length
    const otherSubjects = activeSubjects.filter(s => s.id !== msg.id)
    const totalOtherV = sum(otherSubjects.map(s => s.v))
    const reply = {
      state,
      countdown,
      stage,
      nActive,
      totalOtherV,
      showInstructions,
      endowment,
      R0,
      type: subject.type,
      cv: subject.cv,
      cf: subject.cf,
      active: subject.active
    }
    socket.emit('serverUpdateClient', reply)
  })
})

function createSubject (msg) {
  const subject = {
    id: msg.id,
    type: 1,
    v: 0,
    cv: 1,
    cf: 1,
    hist: {},
    earnings: 0,
    active: msg.id <= maxActive
  }
  subjects[msg.id] = subject
  console.log(`subject ${msg.id} joined`)
}

function assignTypes () {
  const activeSubjects = Object.values(subjects).filter(s => s.active)
  const shuffledSubjects = shuffled(activeSubjects)
  shuffledSubjects.forEach((subject, i) => {
    subject.type = 1 + (i % 2)
    subject.cv = cv[subject.type]
    subject.cf = cf[subject.type]
  })
  typesAssigned = true
  console.log('types:')
  activeSubjects.forEach(subject => {
    console.log(`${subject.id} ${subject.type}`)
  })
}

function update () {
  calculatePayoffs()
  countdown = Math.max(0, countdown - updateInterval)
  if (state === 'interface') {
    if (countdown === 0) endStage()
  }
}

function calculatePayoffs () {
  const activeSubjects = Object.values(subjects).filter(s => s.active)
  const nActive = activeSubjects.length
  if (nActive > 0) {
    const totalV = sum(activeSubjects.map(s => s.v))
    const meanV = totalV / nActive
    activeSubjects.forEach(subject => {
      const risk = subject.v === 1 || meanV === 1 ? 0 : Math.max(0, 1 - 1 / ((1 - meanV) * R0))
      subject.payoff = endowment - subject.cv * subject.v - subject.cf * risk
      if (!practice) {
        subject.hist[period] = {
          payoff: subject.payoff,
          action: subject.action
        }
      }
    })
  }
}

function beginPracticePeriods () {
  state = 'interface'
  practice = true
  stage = 'choice'
  period = 1
  countdown = choiceLength
}

function endStage () {
  if (stage === 'choice') {
    stage = 'feedback'
    countdown = feedbackLength
    return
  }
  if (stage === 'feedback') {
    stage = 'choice'
    if (practice && period >= nPracticePeriods) {
      endPracticePeriods()
      return
    }
    if (!practice && period >= nPaidPeriods) {
      endPaidPeriods()
      return
    }
    countdown = choiceLength
    period += 1
  }
}

function endPracticePeriods () {
  state = 'instructions'
  stage = 'wait'
  period = 0
}

function endPaidPeriods () {
  state = 'complete'
  stage = 'wait'
  period = 0
}
