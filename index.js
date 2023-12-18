import server from './server.js'

/*
function range (n) { return [...Array(n).keys()] }
function sum (a) { return a.reduce((x, y) => x + y, 0) }
function mean (a) {
  if (a.length === 0) return 0
  else return sum(a) / a.length
}
function unique (a) {
  return Array.from(new Set(a))
}
function shuffled (a) {
  const indices = range(a.length)
  const randoms = indices.map(i => Math.random())
  indices.sort((i, j) => randoms[i] - randoms[j])
  return indices.map(i => a[i])
}
*/

const dt = 0.1

const io = server.start(() => {
  setInterval(update, dt * 1000)
})

io.on('connection', socket => {
  console.log('connection:', socket.id)
  socket.emit('connected', {})
})

function update () {}
