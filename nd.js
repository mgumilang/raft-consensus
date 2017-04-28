let argLength = process.argv.length
if (argLength < 4 || argLength < parseInt(process.argv[3]) + 4) {
  console.error('node nd.js <my port> <no. of neighbors> <node-0 address> ... <node-(n-1) address>')
  process.exit(1)
}

const Promise = require('bluebird')
const bodyParser = require('body-parser')
const express = require('express')
const request = require('request')
const statuses = require('./constants.js').statuses
const types = require('./constants.js').types
const resolveValues = require('./constants.js').resolveValues
const app = express()
const port = process.argv[2] || 3000
console.log('Node started on port', port)

let daemon = {}
let daemonResolvers = {} // to check timout of each daemon, 10000ms
let node_log = []
let status = statuses.FOLLOWER
let resolver = null

let node_leader = null
let list_neighbors = process.argv.slice(4)
let term = 0
let vote_for = 0
let current_message = ''

app.use(bodyParser.urlencoded({ extended: false }))

app.post('/', (req, res) => {
  let type = req.body.type
  if (type == types.NODE) {
    current_message = ''
    let get_port = req.body.port
    let get_data = req.body.data
    let get_purpose = req.body.purpose
    let get_term = parseInt(req.body.term)

    if (get_purpose == 'vote') {
      if (term < get_term) {
        term = get_term
        console.log(`Node #${port}: Voted node #${get_port} for term #${term} leader`)
        res.send('OK')
        resolver()
      } else {
        console.log(`Node #${port}: Ignored node #${get_port} vote request for term #${term}`)
      }
    } else if (get_purpose == 'leader') {
      term = get_term
      console.log(`Node #${port}: Got heartbeat from node #${get_port}`)
      let get_daemon_data = JSON.parse(req.body.daemon_data)
      current_message = req.body.message
      node_log = JSON.parse(get_data)
      daemon = get_daemon_data

      if (current_message != '') {
        console.log(`Node #${port}: Ready to commit`)
        current_message = ''
        res.send('readyToCommit')
        resolver(resolveValues.HEARTBEAT_RESPONSE)
      } else {
        res.send('OK')
        console.log(node_log)
        resolver(resolveValues.HEARTBEAT_RESPONSE)
      }
    }
  } else if (type == types.DAEMON) {
    if (status == statuses.LEADER) {
      serverID = req.body.id
      serverCPU = parseInt(req.body.cpu)

      // Ask neighbors
      current_message = `(Daemon #${serverID}, Usage = ${serverCPU})`
      console.log(`Node #${port}: Received from server #${serverID}, Usage = ${serverCPU}`)
      resolver(resolveValues.HEARTBEAT_CHECK)
    }
  }
})

function requestVote() {
  let vote = 1
  let alreadyVoted = false
  status = statuses.CANDIDATE
  for (let i = 0; i < list_neighbors.length; i++) {
    request.post({url:('http://localhost:' + list_neighbors[i]), form: {
      type: types.NODE,
      purpose: 'vote',
      port: port,
      data: 'vote me',
      term: term
    }}, function(err, res, body) {
      if ((res) && (status == statuses.CANDIDATE)) {
        vote += 1
        console.log(`Term ${term}, vote for ${port} = ${vote}`)
        if (vote > Math.floor(list_neighbors.length / 2)) {
          status = statuses.LEADER
          resolver(resolveValues.HEARTBEAT_CHECK)
        }
      }
    })
  }
}

function appendEntries() {
  let commit = 1
  let alreadyCommit = false
  for (let i = 0; i < list_neighbors.length; i++) {
    request.post({url:('http://localhost:' + list_neighbors[i]), form: {
      type: types.NODE,
      purpose: 'leader',
      port: port,
      term: term,
      data: JSON.stringify(node_log),
      message: current_message,
      daemon_data: JSON.stringify(daemon)
    }}, function(err, res, body) {
      console.log(`Node #${port} (L): Received message from node #${list_neighbors[i]}: ${body}`)
      if ((body == 'readyToCommit') && (status == statuses.LEADER)) {
        commit += 1
        if (commit > Math.floor(list_neighbors.length / 2) && !alreadyCommit) {
          alreadyCommit = true
          node_log.push(current_message)
          daemon[serverID] = serverCPU
          console.log(`Node #${port} (L): Successfully committed`)
          resolver(resolveValues.HEARTBEAT_CHECK)
          current_message = ''
        }
      } else {
        current_message = ''
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
  // Random timeout between 1500ms - 3000ms
	let listenTimeout = new Promise(function(resolve, reject) {
	    setTimeout(resolve, (Math.floor(Math.random() * 1500) + 1500), resolveValues.TIMEOUT)
	})

  if (status == statuses.LEADER) {
    setTimeout(function() {
      appendEntries()
      run()
    }, 1000)
  } else {
  	Promise.race([listen(), listenTimeout]).then(function(value) {
      if (value == resolveValues.HEARTBEAT_CHECK) {
        appendEntries()
      } else if (value == resolveValues.HEARTBEAT_RESPONSE) {
        // nothing to do
      } else if (value == resolveValues.TIMEOUT) {
        term += 1
        console.log(`Node #${port}: Becoming candidate for term #${term}`)
        requestVote()
      }
      run()
  	})
  }
}

app.listen(port)
run()
