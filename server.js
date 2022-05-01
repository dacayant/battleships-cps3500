// Imports
const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 3000
const socketio = require('socket.io')
const { Console } = require('console')


const app = express()
const server = http.createServer(app)
const io = socketio(server)

//Static folder: folder the server is going to serve to the client, where all the game files are
app.use(express.static(path.join(__dirname, "public")))

// Start Server
// if we run on the dev server, any changes to the server while it is running will be automatically changed
// due to Nodemon
server.listen(PORT, () => console.log(`Server running on Port ${PORT}`))


// monitor the connections to the server
const connections = [null, null]

// Handling socket connection from web client
// io - socket.io server, socket - client connecting
io.on('connection', socket =>{
    // console.log('New WS connection')

    // Find available player number
    let player_index = -1
    for (const i in connections) {
        if(connections[i] === null) {
            player_index = i
            break
        }
    }

    // tell the connecting client what player number they are
    // .emit(title, msg)
    socket.emit('player-number', player_index)

    console.log(`Player ${player_index} has connected`)

    // ignore player 3
    if(player_index === -1) return

    connections[player_index] = false

    // Tell everyone what playerr number just connected
    socket.broadcast.emit('player-connection', player_index)

    // Handle Disconnects
    socket.on('disconnect', () => {
        console.log(`Player ${player_index} disconnected`)
        connections[player_index] = null

        // Tell everyone what player number just disconnected
        socket.broadcast.emit('player-connection', player_index)
    })

    // On ready
    socket.on('player-ready', () => {
        socket.broadcast.emit('enemy-ready', player_index)
        connections[player_index] = true
    })

    // Check player status
    socket.on('check-players', () => {
        const players = []
        for(const i in connections){
            connections[i] === null ? players.push({connected: false, ready: false}) : players.push({connected: true, ready: connections[i]})
        }
        socket.emit('check-players', players)
    })

    // On fire received
    socket.on('fire', id => {
        console.log(`Shot fired from ${player_index}`, id)

        // emit the move to the other player
        socket.broadcast.emit('fire', id)
    })

    // On fire reply
    socket.on('fire-reply', square => {
        console.log(square)

        // Forward reply to other player
        socket.broadcast.emit('fire-reply', square)
    })

    // Time out connection
    setTimeout(() => {
        connections[player_index] = null
        socket.emit('timeout')
        socket.disconnect()
    }, 600000); // Close after 10 minutes
})

