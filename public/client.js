import { io } from './socketIo/socket.io.esm.min.js'
import { getInstructions1 } from './instructions.js'
import { getPayoff } from './getPayoff.js'

function range (n) { return [...Array(n).keys()] }

const connectingDiv = document.getElementById('connectingDiv')
const joinDiv = document.getElementById('joinDiv')
const idInput = document.getElementById('idInput')
const joinButton = document.getElementById('joinButton')
const instructionsDiv = document.getElementById('instructionsDiv')
const waitDiv = document.getElementById('waitDiv')
const quizForm = document.getElementById('quizForm')
const interfaceDiv = document.getElementById('interfaceDiv')
const canvas = document.getElementById('canvas')
const context = canvas.getContext('2d')

const quizDiv = document.getElementById('quizDiv')
const quizDialog = document.getElementById('quizDialog')
const quizDialogParagraph = document.getElementById('quizDialogParagraph')
const quizDialogButton = document.getElementById('quizDialogButton')
const question1a = document.getElementById('question1a')
const question2 = document.getElementById('question2')
const question3 = document.getElementById('question3')
const question4 = document.getElementById('question4')
const question5 = document.getElementById('question5')

quizDialogButton.onclick = () => quizDialog.close()

quizForm.onsubmit = (event) => {
  const getRoundedPay = (type, v, totalOtherV) => {
    const payoff = getPayoff(v, totalOtherV, n, cv[type], cd[type], endowment, R0)
    return Number(payoff.toFixed(2))
  }
  event.preventDefault()
  if (question1a.checked) {
    quizDialogParagraph.innerHTML = 'Your answer to question 1 is wrong. Please correct it.'
    quizDialog.showModal()
  } else if (Number(question2.value) !== getRoundedPay(1, 0, 2)) {
    quizDialogParagraph.innerHTML = 'Your answer to question 2 is wrong. Please correct it.'
    quizDialog.showModal()
  } else if (Number(question3.value) !== getRoundedPay(1, 1, 4)) {
    quizDialogParagraph.innerHTML = 'Your answer to question 3 is wrong. Please correct it.'
    quizDialog.showModal()
  } else if (Number(question4.value) !== getRoundedPay(2, 0, 6)) {
    quizDialogParagraph.innerHTML = 'Your answer to question 4 is wrong. Please correct it.'
    quizDialog.showModal()
  } else if (Number(question5.value) !== getRoundedPay(2, 1, 8)) {
    quizDialogParagraph.innerHTML = 'Your answer to question 5 is wrong. Please correct it.'
    quizDialog.showModal()
  } else {
    socket.emit('quizComplete', { id })
  }
}

const socket = io()
const updateInterval = 0.1
const mouse = { x: 0, y: 0 }
const colors = {
  green: 'hsla(121, 100%, 23%, 1)',
  grey: 'hsla(0, 0%, 75%, 1)'
}
const graph = {
  bottom: -5,
  width: 35,
  top: -48
}

let msgRecord = {}
let id = 0
let connected = false
let joined = false
let active = false
let showInstructions = false
let quizComplete = false
let state = 'instructions'
let stage = 'choice'
let countdown = 0
let type = 1
let pay0 = 0
let pay1 = 0
let payoff = 0
let v = 0
let n = 10
let cv = 0
let cd = 0
let endowment = 10
let R0 = 1

socket.on('connected', () => {
  console.log('connected')
  connected = true
  update()
  idInput.focus()
  setInterval(update, updateInterval * 1000)
})
socket.on('joined', msg => {
  console.log('joined')
  joined = true
})
socket.on('serverUpdateClient', msg => {
  document.title = `${id}`
  msgRecord = msg
  state = msg.state
  countdown = msg.countdown
  stage = msg.stage
  showInstructions = msg.showInstructions
  quizComplete = msg.quizComplete
  type = msg.type
  active = msg.active
  pay0 = msg.pay0
  pay1 = msg.pay1
  payoff = msg.payoff
  n = msg.n
  cv = msg.cv
  cd = msg.cd
  endowment = msg.endowment
  R0 = msg.R0
  instructionsDiv.innerHTML = getInstructions1(n, cv, cd, endowment, R0)
})

window.onmousedown = event => {
  console.log(msgRecord)
}
window.onmousemove = event => {
  const vmin = Math.min(window.innerWidth, window.innerHeight)
  mouse.x = 100 * (event.clientX - 0.5 * window.innerWidth) / vmin
  mouse.y = 100 * (event.clientY - 0.5 * window.innerHeight) / vmin
}

joinButton.onclick = join
idInput.onkeydown = function (event) {
  if (event.key === 'Enter') join()
}
function join () {
  id = Math.round(Number(idInput.value))
  if (id > 0) {
    const msg = { id }
    socket.emit('join', msg)
  }
}

function update () {
  if (stage === 'choice') v = mouse.x > 0 ? 1 : 0
  display()
  if (joined) updateServer()
}

function display () {
  connectingDiv.style.display = 'none'
  joinDiv.style.display = 'none'
  waitDiv.style.display = 'none'
  instructionsDiv.style.display = 'none'
  quizDiv.style.display = 'none'
  interfaceDiv.style.display = 'none'
  if (!connected) {
    connectingDiv.style.display = 'block'
    return
  }
  if (!joined) {
    joinDiv.style.display = 'block'
    return
  }
  if (!active) {
    waitDiv.style.display = 'block'
    return
  }
  if (state === 'instructions') {
    if (showInstructions) {
      instructionsDiv.style.display = 'block'
      if (!quizComplete) quizDiv.style.display = 'block'
    } else waitDiv.style.display = 'block'
    return
  }
  if (state === 'interface') {
    interfaceDiv.style.display = 'block'
  }
}

function updateServer () {
  const msg = { id, v }
  socket.emit('clientUpdateServer', msg)
}

function setupCanvas () {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const vmin = Math.min(canvas.width, canvas.height)
  context.resetTransform()
  context.translate(0.5 * canvas.width, 0.5 * canvas.height)
  context.scale(0.01 * vmin, 0.01 * vmin)
}

function draw () {
  setupCanvas()
  drawLabels()
  if (stage === 'choice') {
    drawChoiceText()
  }
  if (stage === 'feedback') {
    drawGraph()
    drawFeedbackText()
  }
  window.requestAnimationFrame(draw)
}
draw()

function drawFeedbackText () {
  const textSize = 0.3
  context.fillStyle = 'black'
  context.font = `${textSize}vmin Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const action = v === 0 ? 'A' : 'B'
  const payoffNumber = payoff.toFixed(2)
  const completeText = 'This period is complete.'
  const actionText = `You selected action ${action}.`
  const payoffText = `Your payoff was $${payoffNumber}.`
  const countdownText = Math.ceil(countdown).toFixed(0)
  const unit = countdownText === '1' ? 'second' : 'seconds'
  const timeText = `The next period will begin in ${Math.ceil(countdown).toFixed(0)} ${unit}.`
  context.fillText(completeText, 0, 10)
  context.fillText(actionText, 0, 15)
  context.fillText(payoffText, 0, 20)
  context.fillText(timeText, 0, 35)
}

function drawChoiceText () {
  const textSize = 0.3
  context.fillStyle = 'black'
  context.font = `${textSize}vmin Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const action = v === 0 ? 'A' : 'B'
  const countdownNumber = Math.ceil(countdown).toFixed(0)
  const typeText = `Your type is ${type}.`
  const promptText = 'Please select an action.'
  const actionText = `You are currently selecting action ${action}.`
  const unit = countdownNumber === '1' ? 'second' : 'seconds'
  const countdownText = `This period will end in ${Math.ceil(countdown).toFixed(0)} ${unit}.`
  context.fillText(typeText, 0, -35)
  context.fillText(promptText, 0, -25)
  context.fillText(actionText, 0, -15)
  context.fillText(countdownText, 0, 15)
}

function drawGraph () {
  context.fillStyle = 'black'
  context.strokeStyle = 'black'
  context.lineWidth = 0.4
  context.lineCap = 'round'
  const halfWidth = 0.5 * graph.width
  context.beginPath()
  context.moveTo(-halfWidth, graph.top)
  context.lineTo(-halfWidth, graph.bottom)
  context.lineTo(+halfWidth, graph.bottom)
  context.lineTo(+halfWidth, graph.top)
  context.stroke()
  const ticklength = 1
  const nTicks = 5
  const textSize = 0.2
  context.font = `${textSize}vmin Arial`
  context.beginPath()
  range(nTicks + 1).forEach(i => {
    const fraction = i / nTicks
    const labelText = `$${(endowment * fraction).toFixed(2)}`
    const textX = halfWidth + ticklength + 1
    const graphHeight = graph.bottom - graph.top
    const y = graph.bottom - fraction * graphHeight
    context.moveTo(-halfWidth, y)
    context.lineTo(-halfWidth - ticklength, y)
    context.textAlign = 'right'
    context.fillText(labelText, -textX, y)
    context.moveTo(+halfWidth, y)
    context.lineTo(+halfWidth + ticklength, y)
    context.textAlign = 'left'
    context.fillText(labelText, +textX, y)
  })
  context.stroke()
}

function drawLabels () {
  const textSize = 1
  context.font = `${textSize}vmin Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineWidth = 0.4
  const width = 15
  const height = 10
  const spread = 16
  const top = graph.bottom
  const capHeightRatio = 0.72
  const y = top + 0.5 * height + capHeightRatio * textSize
  const x0 = -0.5 * spread
  const x1 = +0.5 * spread
  const left0 = x0 - 0.5 * width
  const left1 = x1 - 0.5 * width
  context.fillStyle = v === 0 ? colors.green : colors.grey
  context.strokeStyle = context.fillStyle
  context.beginPath()
  context.rect(left0, top, width, height)
  context.stroke()
  context.fillText('A', x0, y)
  context.fillStyle = v === 1 ? colors.green : colors.grey
  context.strokeStyle = context.fillStyle
  context.beginPath()
  context.rect(left1, top, width, height)
  context.stroke()
  context.fillText('B', x1, y)
  if (stage === 'feedback') {
    const graphHeight = graph.bottom - graph.top
    const fraction0 = pay0 / endowment
    const barHeight0 = graphHeight * fraction0
    const barTop0 = graph.bottom - barHeight0
    context.fillStyle = v === 0 ? colors.green : colors.grey
    context.fillRect(left0, barTop0, width, barHeight0)
    const fraction1 = pay1 / endowment
    const barHeight1 = graphHeight * fraction1
    const barTop1 = graph.bottom - barHeight1
    context.fillStyle = v === 1 ? colors.green : colors.grey
    context.fillRect(left1, barTop1, width, barHeight1)
  }
}
