console.error('node node.js <my port> <no. of neighbors> <node-0 address> ... <node-(n-1) address>')
// process.exit(1)

const bodyParser = require('body-parser')
const express = require('express')
const request = require('request')
const app = express()
const port = process.argv[2] || 3000
const Promise = require('bluebird')
console.log('Node started on port', port)

const FOLLOWER = 0
const CANDIDATE = 1
const LEADER = 2

let status = FOLLOWER
let resolver = null

// Who's the leader?
node_leader = null
list_neighbors = process.argv.slice(4)
term = 0
vote = 0
vote_for = 0

app.use(bodyParser.urlencoded({ extended: false }))

app.post('/', (req, res) => {
  console.log(`${port} received...`)
  type = req.body.type
  if (type == 'node') {
    get_port = req.body.port
    get_data = req.body.data
    if (get_data == 'vote me') {
      get_term = parseInt(req.body.term)
      //update term
      if (term < get_term) {
        term = get_term
        res.send('bitch I vote for '+get_port+' for term '+term)
      }
    }
  } else if (type == 'daemon') {
    serverID = req.body.id
    serverCPU = req.body.cpu
    console.log(`Received from Server #${serverID}, Usage = ${serverCPU}`)
    resolver({ serverID: serverID, serverCPU: serverCPU })
  }
})

function beCandidate() {
  status = CANDIDATE
  let i = 0
  for (i = 0; i < list_neighbors.length; i++) {
    request.post({url:('http://localhost:' + list_neighbors[i]), form: {
      type: 'node',
      port: port,
      data: 'vote me',
      term: term
    }}, function(err, res, body) {
      console.log('callback?')
      if (res) {
        //console.log(res)
        vote += 1
        console.log(`term ${term}, vote for ${port} = ${vote}`)
      }
    })
  }
}

function listen() {
	return new Promise((resolve, reject) => {
		resolver = resolve
	})
}

function run() {
  console.log("RUN")
	let listenTimeout = new Promise(function(resolve, reject) {
	    setTimeout(resolve, (Math.floor(Math.random() * 1500) + 1500), 'timeout')
	})

	Promise.race([listen(), listenTimeout]).then(function(value) {
		if (value == 'timeout') {
      if (status == FOLLOWER) {
        console.log(`AING PORT ${port} SEBAGAI FOLLOWER BErUBAH..... JADI CANDIDATEEEEE`)
        term += 1
        beCandidate()
      }
    }
		run()
	})
}

run()

app.listen(port)
