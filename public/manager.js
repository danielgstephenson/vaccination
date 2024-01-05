import { io } from './socketIo/socket.io.esm.min.js'

const connectingDiv = document.getElementById('connectingDiv')
const interfaceDiv = document.getElementById('interfaceDiv')
const subjectsGrid = document.getElementById('subjectsGrid')
const infoDiv = document.getElementById('infoDiv')
const maxActiveInput = document.getElementById('maxActiveInput')
const instructionsCheckbox = document.getElementById('instructionsCheckbox')
const assignTypesButton = document.getElementById('assignTypesButton')
const beginPracticeButton = document.getElementById('beginPracticeButton')

const socket = io()

const updateInterval = 0.1

let subjects = {}

let practice = true
let typesAssigned = false
let state = 'instructions'
let period = 0
let stage = 'choice'
let countdown = 0

socket.on('connected', () => {
  console.log('connected')
  connectingDiv.style.display = 'none'
  interfaceDiv.style.display = 'flex'
  setInterval(update, updateInterval * 1000)
})
socket.on('serverUpdateManager', msg => {
  subjects = msg.subjects
  typesAssigned = msg.typesAssigned
  practice = msg.practice
  state = msg.state
  period = msg.period
  stage = msg.stage
  countdown = msg.countdown
  updateSubjectsGrid()
  updateInfoDiv()
})

assignTypesButton.onclick = event => {
  socket.emit('assignTypes')
}
beginPracticeButton.onclick = event => {
  if (!typesAssigned) {
    window.alert('Assign types first.')
    return
  }
  socket.emit('beginPractice')
}

function update () {
  const msg = {
    maxActive: Math.round(Number(maxActiveInput.value)),
    showInstructions: instructionsCheckbox.checked
  }
  socket.emit('managerUpdateServer', msg)
}

function updateSubjectsGrid () {
  subjectsGrid.innerHTML = ''
  makeIdColumn()
  makeTypeColumn()
  makeVaccinateColumn()
  makePay0Column()
  makePay1Column()
}

function makeIdColumn () {
  const div = document.createElement('div')
  div.innerHTML = 'id'
  div.style.gridRow = 1
  div.style.gridColumn = 1
  subjectsGrid.appendChild(div)
  Object.values(subjects).forEach(subject => {
    const div = document.createElement('div')
    div.innerHTML = subject.id
    div.style.gridRow = subject.id + 1
    div.style.gridColumn = 1
    div.style.opacity = subject.active ? 1 : 0.2
    subjectsGrid.appendChild(div)
  })
}

function makeTypeColumn () {
  const div = document.createElement('div')
  div.innerHTML = 't'
  div.style.gridRow = 1
  div.style.gridColumn = 2
  subjectsGrid.appendChild(div)
  Object.values(subjects).forEach(subject => {
    const div = document.createElement('div')
    div.innerHTML = subject.type
    div.style.gridRow = subject.id + 1
    div.style.gridColumn = 2
    div.style.opacity = subject.active ? 1 : 0.2
    subjectsGrid.appendChild(div)
  })
}

function makeVaccinateColumn () {
  const div = document.createElement('div')
  div.innerHTML = 'v'
  div.style.gridRow = 1
  div.style.gridColumn = 3
  subjectsGrid.appendChild(div)
  Object.values(subjects).forEach(subject => {
    const div = document.createElement('div')
    div.innerHTML = subject.v
    div.style.gridRow = subject.id + 1
    div.style.gridColumn = 3
    div.style.opacity = subject.active ? 1 : 0.2
    subjectsGrid.appendChild(div)
  })
}

function makePay0Column () {
  const div = document.createElement('div')
  div.innerHTML = 'p0'
  div.style.gridRow = 1
  div.style.gridColumn = 4
  subjectsGrid.appendChild(div)
  Object.values(subjects).forEach(subject => {
    const div = document.createElement('div')
    div.innerHTML = subject.pay0.toFixed(2)
    div.style.gridRow = subject.id + 1
    div.style.gridColumn = 4
    div.style.opacity = subject.active ? 1 : 0.2
    subjectsGrid.appendChild(div)
  })
}

function makePay1Column () {
  const div = document.createElement('div')
  div.innerHTML = 'p1'
  div.style.gridRow = 1
  div.style.gridColumn = 5
  subjectsGrid.appendChild(div)
  Object.values(subjects).forEach(subject => {
    const div = document.createElement('div')
    div.innerHTML = subject.pay1.toFixed(2)
    div.style.gridRow = subject.id + 1
    div.style.gridColumn = 5
    div.style.opacity = subject.active ? 1 : 0.2
    subjectsGrid.appendChild(div)
  })
}

function updateInfoDiv () {
  const numActive = Object.values(subjects).filter(s => s.active).length
  let innerHtml = ''
  innerHtml += `numActive: ${numActive} <br>`
  innerHtml += `typesAssigned: ${typesAssigned}<br>`
  innerHtml += `practice: ${practice}<br>`
  innerHtml += `state: ${state}<br>`
  innerHtml += `period: ${period}<br>`
  innerHtml += `stage: ${stage}<br>`
  innerHtml += `countdown: ${countdown.toFixed(1)}<br>`
  infoDiv.innerHTML = innerHtml
}
