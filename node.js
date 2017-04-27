const bodyParser = require('body-parser')
const express = require('express')
const app = express()
const port = process.argv[2] || 3000
const Promise = require('bluebird')
console.log('Node started on port', port)

const FOLLOWER = 0
const CANDIDATE = 1
const LEADER = 2

let status = FOLLOWER
let resolver = null

// Other nodes' status
node_leader = null
node_candidate = []
node_follower = []

app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', (req, res) => {
  serverID = req.body.id
  serverCPU = req.body.cpu
  console.log(`Received from Server #${serverID}, Usage = ${serverCPU}`)
  res.send('kontol')
  resolver({ serverID: serverID, serverCPU: serverCPU })
})

function listen() {
	return new Promise((resolve, reject) => {
		resolver = resolve
	})
}

function run() {
	let listenTimeout = new Promise(function(resolve, reject) { 
	    setTimeout(resolve, 5000, 'one')
	})
	
	Promise.race([listen(), listenTimeout]).then(function(value) {
		console.log('ANJING')
		console.log(value)
		run()
	})
}

run()

app.listen(port)
