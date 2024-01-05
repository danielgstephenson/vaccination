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
  makeColumn(1, 'id', subject => subject.id)
  makeColumn(2, 'type', subject => subject.type)
  makeColumn(3, 'v', subject => subject.v)
  makeColumn(4, 'pay0', subject => subject.pay0.toFixed(2))
  makeColumn(5, 'pay1', subject => subject.pay1.toFixed(2))
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
    div.style.opacity = subject.active ? 1 : 0.2
    div.style.textAlign = 'right'
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
