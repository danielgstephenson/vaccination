import server from './server.js'
import fs from 'fs-extra'
import { setTreatment, getPayoff, n, cv, getCD, getR0, payScale, endowment } from './public/getPayoff.js'

function range (a, b) {
  return [...Array(b - a + 1).keys()].map(i => a + i)
}
function choose (array) {
  return array[Math.floor(Math.random() * array.length)]
}
function shuffled (a) {
  const indices = range(0, a.length - 1)
  const randoms = indices.map(i => Math.random())
  indices.sort((i, j) => randoms[i] - randoms[j])
  return indices.map(i => a[i])
}
function sum (a) { return a.reduce((x, y) => x + y, 0) }

const subjects = {}
const updateInterval = 0.1
const practiceChoiceLength = 10
const practiceFeedbackLength = 10
const dateString = getDateString()
const choiceLength = 5
const feedbackLength = 5
const nPracticePeriods = 5
const nPaidPeriods = 30 // 60

let state = 'instructions'
let period = 0
let stage = 'wait'
let practiceComplete = false
let practice = true
let countdown = 0
let showInstructions = false
let treatment = '?'
let dataStream

createDataFile()

const io = server.start(() => {
  setInterval(update, updateInterval * 1000)
})
io.on('connection', socket => {
  console.log('connection:', socket.id)
  socket.emit('connected', {})
  socket.on('managerUpdateServer', msg => {
    treatment = msg.treatment
    setTreatment(treatment)
    const typesAssigned = Object.values(subjects).every(s => s.type !== '?')
    const reply = {
      subjects,
      typesAssigned,
      practice,
      practiceComplete,
      showInstructions,
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
  socket.on('showInstructions', () => {
    showInstructions = true
  })
  socket.on('hideInstructions', () => {
    showInstructions = false
  })
  socket.on('beginPractice', () => {
    const typesAssigned = Object.values(subjects).every(s => s.type !== '?')
    if (state === 'instructions' && typesAssigned) {
      beginPracticePeriods()
    }
  })
  socket.on('beginPaidPeriods', () => {
    console.log('beginPaidPeriods')
    if (state === 'instructions' && practiceComplete) {
      beginPaidPeriods()
    }
  })
  socket.on('quizComplete', msg => {
    subjects[msg.id].quizComplete = true
  })
  socket.on('join', msg => {
    if (isValidId(msg.id)) {
      if (!subjects[msg.id]) createSubject(msg, socket)
      socket.emit('joined', {})
    }
  })
  socket.on('clientUpdateServer', msg => {
    if (isValidId(msg.id)) {
      if (!subjects[msg.id]) createSubject(msg, socket)
      const subject = subjects[msg.id]
      subject.v = msg.v
      const reply = {
        state,
        countdown,
        stage,
        treatment,
        showInstructions,
        practiceComplete,
        type: subject.type,
        pay0: subject.pay0,
        pay1: subject.pay1,
        payoff: subject.payoff,
        quizComplete: subject.quizComplete
      }
      socket.emit('serverUpdateClient', reply)
    }
  })
})

function createSubject (msg) {
  const subject = {
    id: msg.id,
    quizComplete: false,
    type: '?',
    v: 0,
    cv: 0,
    cd: 0,
    totalOtherV: 0,
    pay0: 0,
    pay1: 0,
    payoff: 0,
    hist: {},
    earnings: 0
  }
  subjects[msg.id] = subject
  console.log(`subject ${msg.id} joined`)
}

function assignTypes () {
  const shuffledSubjects = shuffled(Object.values(subjects))
  shuffledSubjects.forEach((subject, i) => {
    subject.type = i + 1 <= 5 ? 1 : 2
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
  Object.values(subjects).forEach(subject => {
    const otherSubjects = Object.values(subjects).filter(s => s.id !== subject.id)
    subject.totalOtherV = sum(otherSubjects.map(s => s.v))
    subject.cv = cv[subject.type]
    subject.cd = getCD()[subject.type]
    subject.pay0 = getPayoff(subject.type, 0, subject.totalOtherV)
    subject.pay1 = getPayoff(subject.type, 1, subject.totalOtherV)
    subject.payoff = getPayoff(subject.type, subject.v, subject.totalOtherV)
    if (!practice) {
      subject.hist[period] = {
        pay0: subject.pay0,
        pay1: subject.pay1,
        payoff: subject.payoff,
        v: subject.v
      }
    }
  })
}

function endStage () {
  if (stage === 'choice') {
    stage = 'feedback'
    countdown = practice ? practiceFeedbackLength : feedbackLength
    return
  }
  if (stage === 'feedback') {
    stage = 'choice'
    if (!practice) updateDataFile()
    if (practice && period >= nPracticePeriods) {
      endPracticePeriods()
      return
    }
    if (!practice && period >= nPaidPeriods) {
      endPaidPeriods()
      return
    }
    countdown = practice ? practiceChoiceLength : choiceLength
    period += 1
  }
}

function beginPracticePeriods () {
  state = 'interface'
  practice = true
  stage = 'choice'
  period = 1
  countdown = practiceChoiceLength
}

function endPracticePeriods () {
  state = 'instructions'
  stage = 'wait'
  practiceComplete = true
  period = 0
}

function beginPaidPeriods () {
  if (practiceComplete) {
    state = 'interface'
    practice = false
    stage = 'choice'
    period = 1
    countdown = choiceLength
  }
}

function endPaidPeriods () {
  state = 'complete'
  stage = 'wait'
  period = 0
  writePaymentFile()
}

function isValidId (id) {
  if (id < 1) return false
  if (id > n) return false
  if (id !== Math.round(id)) return false
  return true
}

function createDataFile () {
  dataStream = fs.createWriteStream(`data/${dateString}-data.csv`)
  let csvString = 'session,treatment,period,id,type,v,payoff,pay0,pay1,cv,cd,totalOtherV,R0,endowment,payScale'
  csvString += '\n'
  dataStream.write(csvString)
}

function updateDataFile (subject) {
  Object.values(subjects).forEach(subject => {
    let csvString = ''
    csvString += `${dateString},` // session
    csvString += `${treatment},`
    csvString += `${period},`
    csvString += `${subject.id},`
    csvString += `${subject.type},`
    csvString += `${subject.v},`
    csvString += `${subject.payoff},`
    csvString += `${subject.pay0},`
    csvString += `${subject.pay1},`
    csvString += `${subject.cv},`
    csvString += `${subject.cd},`
    csvString += `${subject.totalOtherV},`
    csvString += `${getR0()},`
    csvString += `${endowment},`
    csvString += `${payScale}`
    csvString += '\n'
    dataStream.write(csvString)
  })
}

function writePaymentFile () {
  let csvString = 'id,payment\n'
  const randomPeriod = choose(range(1, nPaidPeriods))
  console.log(`randomPeriod = ${randomPeriod}`)
  Object.values(subjects).forEach(subject => {
    csvString += `${subject.id},${subject.hist[randomPeriod].payoff.toFixed(2)}\n`
  })
  const logErr = (err) => { if (err) { console.log(err) } }
  fs.writeFile('data/' + dateString + '-payment.csv', csvString, logErr)
}

function formatTwo (x) {
  let y = x.toFixed(0)
  if (y < 10) y = '0' + y
  return y
}
function getDateString () {
  const d = new Date()
  const year = d.getFullYear()
  const month = formatTwo(d.getMonth() + 1)
  const day = formatTwo(d.getDate())
  const hours = formatTwo(d.getHours())
  const minutes = formatTwo(d.getMinutes())
  const seconds = formatTwo(d.getSeconds())
  const dateString = year + '-' + month + '-' + day + '-' + hours + minutes + seconds
  return dateString
}
