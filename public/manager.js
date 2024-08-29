/* global Audio */
import { io } from './socketIo/socket.io.esm.min.js'

const connectingDiv = document.getElementById('connectingDiv')
const interfaceDiv = document.getElementById('interfaceDiv')
const subjectsGrid = document.getElementById('subjectsGrid')
const infoDiv = document.getElementById('infoDiv')
const treatmentSelect = document.getElementById('treatmentSelect')
const showInstructionsButton = document.getElementById('showInstructionsButton')
const hideInstructionsButton = document.getElementById('hideInstructionsButton')
const assignTypesButton = document.getElementById('assignTypesButton')
const beginPracticeButton = document.getElementById('beginPracticeButton')
const beginPaidPeriodsButton = document.getElementById('beginPaidPeriodsButton')

const playInstructionsAudioButton = document.getElementById('playInstructionsAudioButton')
const stopInstructionsAudioButton = document.getElementById('stopInstructionsAudioButton')
const playPracticeAudioButton = document.getElementById('playPracticeAudioButton')
const stopPracticeAudioButton = document.getElementById('stopPracticeAudioButton')
const playPaidAudioButton = document.getElementById('playPaidAudioButton')
const stopPaidAudioButton = document.getElementById('stopPaidAudioButton')
const instructionsAudio = new Audio('instructions.mp3')
const practiceAudio = new Audio('practice.mp3')
const paidAudio = new Audio('paid.mp3')

const socket = io()
const updateInterval = 0.1

let subjects = {}
let typesAssigned = false
let showInstructions = false
let practiceComplete = false
let state = 'instructions'
let period = 0
let stage = 'choice'
let countdown = 0
let msgRecord = {}

socket.on('connected', () => {
  console.log('connected')
  connectingDiv.style.display = 'none'
  interfaceDiv.style.display = 'flex'
  setInterval(update, updateInterval * 1000)
})
socket.on('serverUpdateManager', msg => {
  msgRecord = msg
  subjects = msg.subjects
  typesAssigned = msg.typesAssigned
  showInstructions = msg.showInstructions
  state = msg.state
  period = msg.period
  stage = msg.stage
  countdown = msg.countdown
  practiceComplete = msg.practiceComplete
  updateSubjectsGrid()
  updateInfoDiv()
})

window.onmousedown = event => {
  console.log(msgRecord)
}

assignTypesButton.onclick = event => {
  socket.emit('assignTypes')
}
showInstructionsButton.onclick = event => {
  if (treatmentSelect.value === '?') {
    window.alert('Select the treatment first.')
    return
  }
  if (!typesAssigned) {
    window.alert('Assign types first.')
    return
  }
  socket.emit('showInstructions')
}
playInstructionsAudioButton.onclick = event => {
  instructionsAudio.load()
  instructionsAudio.play()
}
stopInstructionsAudioButton.onclick = event => {
  instructionsAudio.pause()
}
hideInstructionsButton.onclick = event => {
  socket.emit('hideInstructions')
}
playPracticeAudioButton.onclick = event => {
  practiceAudio.load()
  practiceAudio.play()
}
stopPracticeAudioButton.onclick = event => {
  practiceAudio.pause()
}
beginPracticeButton.onclick = event => {
  const allQuizComplete = Object.values(subjects).every(s => s.quizComplete)
  if (treatmentSelect.value === '?') {
    window.alert('Select the treatment first.')
    return
  }
  if (!typesAssigned) {
    window.alert('Assign types first.')
    return
  }
  if (!showInstructions) {
    window.alert('Show the instructions first.')
    return
  }
  if (!allQuizComplete) {
    window.alert('All subjects must complete the quiz first.')
    return
  }
  socket.emit('beginPractice')
}
playPaidAudioButton.onclick = event => {
  paidAudio.load()
  paidAudio.play()
}
stopPaidAudioButton.onclick = event => {
  paidAudio.pause()
}
beginPaidPeriodsButton.onclick = event => {
  const allQuizComplete = Object.values(subjects).every(s => s.quizComplete)
  if (treatmentSelect.value === '?') {
    window.alert('Select the treatment first.')
    return
  }
  if (!typesAssigned) {
    window.alert('Assign types first.')
    return
  }
  if (!showInstructions) {
    window.alert('Show the instructions first.')
    return
  }
  if (!allQuizComplete) {
    window.alert('All subjects must complete the quiz first.')
    return
  }
  if (!practiceComplete) {
    window.alert('Complete the practice periods first.')
    return
  }
  socket.emit('beginPaidPeriods')
}

function update () {
  const msg = {
    showInstructions,
    treatment: treatmentSelect.value
  }
  socket.emit('managerUpdateServer', msg)
}

function updateSubjectsGrid () {
  subjectsGrid.innerHTML = ''
  makeColumn(1, 'id', subject => subject.id)
  makeColumn(2, 'quiz', subject => subject.quizComplete)
  makeColumn(3, 'type', subject => subject.type)
  makeColumn(4, 'v', subject => subject.v)
  makeColumn(5, 'pay0', subject => subject.pay0.toFixed(1))
  makeColumn(6, 'pay1', subject => subject.pay1.toFixed(1))
}

function makeColumn (columnNumber, title, contentFunction) {
  const div = document.createElement('div')
  div.innerHTML = title
  div.style.gridRow = 1
  div.style.gridColumn = columnNumber
  subjectsGrid.appendChild(div)
  Object.values(subjects).forEach(subject => {
    const div = document.createElement('div')
    div.innerHTML = contentFunction(subject)
    div.style.gridRow = subject.id + 1
    div.style.gridColumn = columnNumber
    div.style.textAlign = 'right'
    subjectsGrid.appendChild(div)
  })
}

function updateInfoDiv () {
  let innerHtml = ''
  innerHtml += `subjectCount: ${Object.values(subjects).length} <br>`
  innerHtml += `typesAssigned: ${typesAssigned}<br>`
  innerHtml += `showInstructions: ${showInstructions}<br>`
  innerHtml += `practiceComplete: ${practiceComplete}<br>`
  innerHtml += `state: ${state}<br>`
  innerHtml += `period: ${period}<br>`
  innerHtml += `stage: ${stage}<br>`
  innerHtml += `countdown: ${countdown.toFixed(1)}<br>`
  infoDiv.innerHTML = innerHtml
}
