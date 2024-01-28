import server from './server.js'
import { getPayoff } from './public/getPayoff.js'

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
const endowment = 6
const R0 = 1.5 // 1.5 or 4
const cv = {
  1: 1,
  2: 1
}
const cd = {
  1: 5,
  2: 7
}
const n = 10

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
  socket.on('quizComplete', msg => {
    subjects[msg.id].quizComplete = true
  })
  socket.on('clientUpdateServer', msg => {
    if (!subjects[msg.id]) createSubject(msg, socket)
    const subject = subjects[msg.id]
    subject.v = msg.v
    const reply = {
      state,
      countdown,
      stage,
      showInstructions,
      type: subject.type,
      active: subject.active,
      pay0: subject.pay0,
      pay1: subject.pay1,
      payoff: subject.payoff,
      quizComplete: subject.quizComplete,
      n,
      cv,
      cd,
      endowment,
      R0
    }
    socket.emit('serverUpdateClient', reply)
  })
})

function createSubject (msg) {
  const subject = {
    id: msg.id,
    quizComplete: false,
    type: 1,
    v: 0,
    cv: 1,
    cf: 1,
    pay0: 0,
    pay1: 0,
    payoff: 0,
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
    subject.type = subject.id <= 5 ? 1 : 2
    subject.cv = cv[subject.type]
    subject.cf = cd[subject.type]
  })
  typesAssigned = true
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
  activeSubjects.forEach(subject => {
    const otherSubjects = activeSubjects.filter(s => s.id !== subject.id)
    const totalOtherV = sum(otherSubjects.map(s => s.v))
    subject.pay0 = getPayoff(0, totalOtherV, n, cv[subject.type], cd[subject.type])
    subject.pay1 = getPayoff(1, totalOtherV, n, cv[subject.type], cd[subject.type])
    subject.payoff = getPayoff(subject.v, totalOtherV, n, cv[subject.type], cd[subject.type], endowment, R0)
    if (!practice) {
      subject.hist[period] = {
        payoff: subject.payoff,
        v: subject.v
      }
    }
  })
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
