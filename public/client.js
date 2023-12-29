import { io } from './socketIo/socket.io.esm.min.js'

function range (n) { return [...Array(n).keys()] }

const connectingDiv = document.getElementById('connectingDiv')
const joinDiv = document.getElementById('joinDiv')
const idInput = document.getElementById('idInput')
const joinButton = document.getElementById('joinButton')
const instructionsDiv = document.getElementById('instructionsDiv')
const waitDiv = document.getElementById('waitDiv')
const interfaceDiv = document.getElementById('interfaceDiv')
const canvas = document.getElementById('canvas')
const context = canvas.getContext('2d')

const socket = io()
const updateInterval = 0.1
const mouse = { x: 0, y: 0 }
const colors = {
  green: 'hsla(121, 100%, 23%, 1)',
  grey: 'hsla(0, 0%, 60%, 1)'
}
const graph = {
  bottom: -5,
  width: 50,
  top: -48
}

let msgRecord = {}
let id = 0
let connected = false
let joined = false
let active = false
let showInstructions = false
let state = 'instructions'
let stage = 'choice'
let countdown = 0
let endowment = 20
let R0 = 1
let type = 1
let cv = 1
let cf = 1
let nActive = 1
let totalOtherV = 0
let v = 0

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
  document.title = `C${id}`
  msgRecord = msg
  state = msg.state
  countdown = msg.countdown
  stage = msg.stage
  nActive = msg.nActive
  totalOtherV = msg.totalOtherV
  showInstructions = msg.showInstructions
  endowment = msg.endowment
  R0 = msg.R0
  type = msg.type
  cv = msg.cv
  cf = msg.cf
  active = msg.active
})

window.onmousedown = event => {
  console.log(msgRecord)
  const meanV = (v + totalOtherV) / nActive
  const risk = v === 1 || meanV === 1 ? 0 : Math.max(0, 1 - 1 / ((1 - meanV) * R0))
  console.log('totalOtherV', totalOtherV)
  console.log('meanV', meanV)
  console.log('risk', risk)
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

function getPayoff (v) {
  if (nActive === 0) return 0
  const meanV = (v + totalOtherV) / nActive
  const risk = v === 1 || meanV === 1 ? 0 : Math.max(0, 1 - 1 / ((1 - meanV) * R0))
  const payoff = endowment - cv * v - cf * risk
  return payoff
}

function display () {
  connectingDiv.style.display = 'none'
  joinDiv.style.display = 'none'
  waitDiv.style.display = 'none'
  instructionsDiv.style.display = 'none'
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
    if (showInstructions) instructionsDiv.style.display = 'block'
    else waitDiv.style.display = 'block'
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
  const textSize = 0.4
  context.fillStyle = 'black'
  context.font = `${textSize}vmin Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const action = v === 0 ? 'A' : 'B'
  const payoffNumber = getPayoff(v).toFixed(2)
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
  const textSize = 0.5
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
  const textSize = 0.25
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
  const spread = 0.4 * graph.width
  const top = graph.bottom
  const capHeightRatio = 0.72
  const y = top + 0.5 * height + 0.5 * capHeightRatio * textSize
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
    const fraction0 = getPayoff(0) / endowment
    const barHeight0 = graphHeight * fraction0
    const barTop0 = graph.bottom - barHeight0
    context.fillStyle = v === 0 ? colors.green : colors.grey
    context.fillRect(left0, barTop0, width, barHeight0)
    const fraction1 = getPayoff(1) / endowment
    const barHeight1 = graphHeight * fraction1
    const barTop1 = graph.bottom - barHeight1
    context.fillStyle = v === 1 ? colors.green : colors.grey
    context.fillRect(left1, barTop1, width, barHeight1)
  }
}
