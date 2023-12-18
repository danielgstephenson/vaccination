import { io } from './socketIo/socket.io.esm.min.js'

const socket = io()

socket.on('connected', () => {
  console.log('connected')
})
