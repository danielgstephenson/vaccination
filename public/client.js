import { io } from './socketIo/socket.io.esm.min.js'
import { getInstructions } from './instructions.js'
import { getPayoff, setTreatment, n, getTreatment } from './getPayoff.js'

function range (n) { return [...Array(n).keys()] }

const connectingDiv = document.getElementById('connectingDiv')
const waitDiv = document.getElementById('waitDiv')
const joinDiv = document.getElementById('joinDiv')
const idInput = document.getElementById('idInput')
const joinButton = document.getElementById('joinButton')
const instructionsDiv = document.getElementById('instructionsDiv')
const practiceInfoDiv = document.getElementById('practiceInfoDiv')
const paidInfoDiv = document.getElementById('paidInfoDiv')
const interfaceDiv = document.getElementById('interfaceDiv')
const completeDiv = document.getElementById('completeDiv')
const canvas = document.getElementById('canvas')
const context = canvas.getContext('2d')
const quizForm = document.getElementById('quizForm')
const quizDiv = document.getElementById('quizDiv')
const quizDialog = document.getElementById('quizDialog')
const quizDialogParagraph = document.getElementById('quizDialogParagraph')
const quizDialogButton = document.getElementById('quizDialogButton')
const question1a = document.getElementById('question1a')
const question2 = document.getElementById('question2')
const question3 = document.getElementById('question3')
const question4 = document.getElementById('question4')
const question5 = document.getElementById('question5')

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
const maxPay = 18

let msgRecord = {}
let id = 0
let connected = false
let joined = false
let showInstructions = false
let quizComplete = false
let practiceComplete = false
let randomPeriod = 0
let randomPeriodPayoff = 0
let showUpBonus = 0
let earnings = 0
let state = 'instructions'
let stage = 'choice'
let countdown = 0
let type = 1
let pay0 = 0
let pay1 = 0
let payoff = 0
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
  document.title = `${id}`
  msgRecord = msg
  state = msg.state
  countdown = msg.countdown
  stage = msg.stage
  showInstructions = msg.showInstructions
  quizComplete = msg.quizComplete
  practiceComplete = msg.practiceComplete
  type = msg.type
  pay0 = msg.pay0
  pay1 = msg.pay1
  payoff = msg.payoff
  randomPeriod = msg.randomPeriod
  randomPeriodPayoff = msg.randomPeriodPayoff
  showUpBonus = msg.showUpBonus
  earnings = msg.earnings
  if (msg.treatment !== getTreatment()) {
    setTreatment(msg.treatment)
    instructionsDiv.innerHTML = getInstructions()
  }
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
  id = Number(idInput.value)
  if (isValidId(id)) {
    const msg = { id }
    socket.emit('join', msg)
  } else {
    window.alert(`ID must be a whole number from 1 to ${n}`)
  }
}

quizDialogButton.onclick = () => quizDialog.close()

quizForm.onsubmit = (event) => {
  event.preventDefault()
  if (question1a.checked) {
    quizDialogParagraph.innerHTML = 'Your answer to question 1 is incorrect. Please try again.'
    quizDialog.showModal()
  } else if (Number(question2.value) !== Number(getPayoff(1, 0, 2))) {
    quizDialogParagraph.innerHTML = 'Your answer to question 2 is incorrect. Please try again.'
    quizDialog.showModal()
  } else if (Number(question3.value) !== Number(getPayoff(1, 1, 4))) {
    quizDialogParagraph.innerHTML = 'Your answer to question 3 is incorrect. Please try again.'
    quizDialog.showModal()
  } else if (Number(question4.value) !== Number(getPayoff(2, 0, 6))) {
    quizDialogParagraph.innerHTML = 'Your answer to question 4 is incorrect. Please try again.'
    quizDialog.showModal()
  } else if (Number(question5.value) !== Number(getPayoff(2, 1, 8))) {
    quizDialogParagraph.innerHTML = 'Your answer to question 5 is incorrect. Please try again.'
    quizDialog.showModal()
  } else {
    socket.emit('quizComplete', { id })
  }
}

function isValidId (id) {
  if (id < 1) return false
  if (id > n) return false
  if (id !== Math.round(id)) return false
  return true
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
  practiceInfoDiv.style.display = 'none'
  paidInfoDiv.style.display = 'none'
  interfaceDiv.style.display = 'none'
  completeDiv.style.display = 'none'
  if (!connected) {
    connectingDiv.style.display = 'block'
    return
  }
  if (!joined) {
    joinDiv.style.display = 'block'
    return
  }
  if (state === 'instructions') {
    if (showInstructions) {
      instructionsDiv.style.display = 'block'
      if (!quizComplete) quizDiv.style.display = 'block'
      else if (!practiceComplete) practiceInfoDiv.style.display = 'block'
      else paidInfoDiv.style.display = 'block'
    } else waitDiv.style.display = 'block'
    return
  }
  if (state === 'interface') {
    interfaceDiv.style.display = 'block'
  }
  if (state === 'complete') {
    setupCompleteDev()
    completeDiv.style.display = 'block'
  }
}

function setupCompleteDev () {
  completeDiv.innerHTML = `
      The experiment is now complete.<br><br>
      Period ${randomPeriod} was randomly selected.<br>
      Your payoff in period ${randomPeriod} was $${randomPeriodPayoff.toFixed(2)}.<br>
      The show-up bonus is $${showUpBonus.toFixed(2)}.<br>
      You will receive a total of $${earnings.toFixed(2)}.<br><br>
      Please wait while your payment is prepared.`
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

function drawChoiceText () {
  const textSize = 0.4
  context.fillStyle = 'black'
  context.font = `${textSize}vmin Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const option = v === 0 ? 'A' : 'B'
  const countdownNumber = Math.ceil(countdown).toFixed(0)
  const typeText = `You were assigned type ${type}.`
  const promptText = 'Please select an option.'
  const optionText = `You selected option ${option}.`
  const unit = countdownNumber === '1' ? 'second' : 'seconds'
  const countdownText = `This period will end in ${Math.ceil(countdown).toFixed(0)} ${unit}.`
  context.fillText(typeText, 0, -25)
  context.fillText(promptText, 0, -15)
  context.fillText(optionText, 0, 15)
  context.fillText(countdownText, 0, 25)
}

function drawFeedbackText () {
  const textSize = 0.4
  context.fillStyle = 'black'
  context.font = `${textSize}vmin Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const option = v === 0 ? 'A' : 'B'
  const payoffNumber = payoff.toFixed(2)
  const completeText = 'This period is complete.'
  const optionText = `You selected option ${option}.`
  const payoffText = `Your payoff was $${payoffNumber}.`
  const countdownText = Math.ceil(countdown).toFixed(0)
  const unit = countdownText === '1' ? 'second' : 'seconds'
  const timeText = `The next period will begin in ${Math.ceil(countdown).toFixed(0)} ${unit}.`
  context.fillText(completeText, 0, 10)
  context.fillText(optionText, 0, 15)
  context.fillText(payoffText, 0, 20)
  context.fillText(timeText, 0, 25)
}

function drawGraph () {
  context.fillStyle = 'black'
  context.strokeStyle = 'black'
  context.lineWidth = 0.4
  context.lineCap = 'round'
  context.textBaseline = 'middle'
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
    const labelText = `$${(maxPay * fraction).toFixed(2)}`
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
    const fraction0 = pay0 / maxPay
    const barHeight0 = graphHeight * fraction0
    const barTop0 = graph.bottom - barHeight0
    context.fillStyle = v === 0 ? colors.green : colors.grey
    context.fillRect(left0, barTop0, width, barHeight0)
    const fraction1 = pay1 / maxPay
    const barHeight1 = graphHeight * fraction1
    const barTop1 = graph.bottom - barHeight1
    context.fillStyle = v === 1 ? colors.green : colors.grey
    context.fillRect(left1, barTop1, width, barHeight1)
    context.fillStyle = 'black'
    context.font = '0.3vmin Arial'
    context.textAlign = 'center'
    context.textBaseline = 'bottom'
    context.fillText(`$${pay0.toFixed(2)}`, x0, barTop0)
    context.fillText(`$${pay1.toFixed(2)}`, x1, barTop1)
  }
}
