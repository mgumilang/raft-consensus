/**
Filename: nd.js
Description: Node's implementation in raft consensus
Creator:
- Garmastewira/13514068
- Ali Akbar/13514080
- Muhammad Gumilang/13514092
**/

let argLength = process.argv.length
if (argLength < 4 || argLength < parseInt(process.argv[3]) + 4) {
  console.error('node nd.js <my port> <no. of neighbors> <node-0 address> ... <node-(n-1) address>')
  process.exit(1)
}

// Load libraries
const Promise = require('bluebird')
const bodyParser = require('body-parser')
const express = require('express')
const request = require('request')

// Load constants
const statuses = require('./constants.js').statuses
const types = require('./constants.js').types
const resolveValues = require('./constants.js').resolveValues
const purposes = require('./constants.js').purposes

const app = express()
const port = process.argv[2] || 3000
console.log('Node started on port', port)

// Server statistics from daemon
let daemon = {}
let daemonPromises = {}
let daemonResolvers = {} // to check timout of each daemon, 10000ms

// Node's attributes
let status = statuses.FOLLOWER
let term = 0
let committedLogs = []
let uncommittedLogs = {}
let listNeighbors = process.argv.slice(4)
let resolver = null // resolver for run function

app.use(bodyParser.urlencoded({ extended: false }))

// Route to show logs
app.get('/log', (req, res) => {
  res.send(committedLogs)
})

// Route to send node's status (leader/follower/candidate)
app.get('/status', (req, res) => {
  res.send(status)
})

// Route to get number request
app.get('/:number', (req, res) => {
  n = req.params.number
  if (Object.keys(daemon).length != 0) {
    let target = getBestServer()
    request(('http://localhost:' + target + '/' + n), function(error, response, body) {
      console.log(`Node #${port} (L): Request prime number #${n}`)
      if (response) {
        console.log(`Node #${port} (L): Received result from port ${target} = ${body}`)
        res.send(`Received result from port ${target} = ${body}`)
      } else {
        console.log(`Node #${port} (L): Error receiving result from port ${target}`)
        res.send(`Error receiving result from port ${target}`)
      }
    })
  } else {
    console.log(`Node #${port} (L): No daemon found`)
    res.send('No daemon found')
  }
})

// Route to response message via POST method
app.post('/', (req, res) => {
  let type = req.body.type
  if (type == types.NODE) {
    // Request is from other node
    let get_port = req.body.port
    let get_data = req.body.data
    let get_purpose = req.body.purpose
    let get_term = parseInt(req.body.term)

    if (get_purpose == purposes.VOTE) {
      // Vote message handler
      if (term < get_term) {
        term = get_term
        console.log(`Node #${port}: Voted node #${get_port} for term #${term} leader`)
        res.send('OK')
        resolver()
      } else {
        console.log(`Node #${port}: Ignored node #${get_port} vote request for term #${term}`)
      }
    } else if (get_purpose == purposes.HEARTBEAT) {
      // Heartbeat message handler
      console.log(`Node #${port}: Got heartbeat from node #${get_port}`)
      term = get_term
      uncommittedLogs = JSON.parse(req.body.message)
      committedLogs = JSON.parse(get_data)
      daemon = JSON.parse(req.body.daemon_data)

      if (Object.keys(uncommittedLogs).length > 0) {
        // There is something to commit
        console.log(`Node #${port}: Ready to commit`)
        res.send('readyToCommit')
        resolver(resolveValues.HEARTBEAT_RESPONSE)
      } else {
        res.send('OK')
        console.log(committedLogs)
        resolver(resolveValues.HEARTBEAT_RESPONSE)
      }
    }
  } else if (type == types.DAEMON) {
    // Request is from a daemon
    if (status == statuses.LEADER) {
      serverID = req.body.id
      serverCPU = parseFloat(req.body.cpu)
      if (serverID in daemon) {
        daemonResolvers[serverID](resolveValues.DAEMON_RESPONSE)
        checkDaemonAvailability(serverID)
      }

      // Ask neighbors' availability to commit
      uncommittedLogs[serverID] = serverCPU
      console.log(`Node #${port}: Received from server #${serverID}, Usage = ${serverCPU}`)
      resolver(resolveValues.HEARTBEAT_CHECK)
    }
    res.send('OK')
  }
})

// Request vote to other nodes as a leader candidate
function requestVote() {
  let vote = 1
  let alreadyVoted = false
  status = statuses.CANDIDATE
  for (let i = 0; i < listNeighbors.length; i++) {
    request.post({url:('http://localhost:' + listNeighbors[i]), form: {
      type: types.NODE,
      purpose: purposes.VOTE,
      port: port,
      data: '',
      term: term
    }}, function(err, res, body) {
      if ((res) && (status == statuses.CANDIDATE) && !alreadyVoted) {
        vote += 1
        alreadyVoted = true
        console.log(`Term ${term}, vote for ${port} = ${vote}`)
        if (vote > Math.floor(listNeighbors.length / 2)) {
          status = statuses.LEADER
          resolver(resolveValues.HEARTBEAT_CHECK)
        }
      }
    })
  }
}

// Append log's entries to other nodes
function appendEntries() {
  let commit = 1
  let alreadyCommit = false
  for (let i = 0; i < listNeighbors.length; i++) {
    request.post({url:('http://localhost:' + listNeighbors[i]), form: {
      type: types.NODE,
      purpose: purposes.HEARTBEAT,
      port: port,
      term: term,
      data: JSON.stringify(committedLogs),
      message: JSON.stringify(uncommittedLogs),
      daemon_data: JSON.stringify(daemon)
    }}, function(err, res, body) {
      console.log(`Node #${port} (L): Received message from node #${listNeighbors[i]}: ${body}`)
      if ((body == 'readyToCommit') && (status == statuses.LEADER)) {
        commit += 1
        if (commit > Math.floor(listNeighbors.length / 2) && !alreadyCommit) {
          alreadyCommit = true
          commitLog()
          console.log(`Node #${port} (L): Successfully committed`)
          resolver(resolveValues.HEARTBEAT_CHECK)
          uncommittedLogs = {}
        }
      }
    })
  }
}

// Check daemon's availability for 10000ms
// If timeout, delete daemon from saved servers
function checkDaemonAvailability(serverID) {
  let listenTimeout = new Promise(function(resolve, reject) {
	   setTimeout(resolve, 10000, resolveValues.TIMEOUT)
	})
  Promise.race([daemonPromises[serverID], listenTimeout]).then((value) => {
    if (value == resolveValues.TIMEOUT) {
      delete daemon[serverID]
      delete daemonPromises[serverID]
      delete daemonResolvers[serverID]
      console.log(`Node #${port}: Deleted server #${serverID} due to timeout`)
    }
  })
}

// Node's main function
function run() {
  // Random timeout between 1500ms - 3000ms
	let listenTimeout = new Promise(function(resolve, reject) {
	    setTimeout(resolve, (Math.floor(Math.random() * 1500) + 1500), resolveValues.TIMEOUT)
	})

  if (status == statuses.LEADER) {
    // Keep sending heartbeats with the uncommittedLogs
    setTimeout(function() {
      appendEntries()
      run()
    }, 1000)
  } else {
    // Listen to response from other nodes for a time limit
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

// Get worker with the lowest CPU usage (as given from each daemon's server)
function getBestServer() {
  target = 10000
  min = 100
  for (let id in daemon) {
    if (min > daemon[id]) {
      target = parseInt(id) + 10000
      min = daemon[id]
    }
  }
  return target
}

// Set resolver to a new promise's resolve
function listen() {
	return new Promise((resolve, reject) => {
		resolver = resolve
	})
}

// Create logs
function makeLogString(serverID) {
  return `(Daemon #${serverID}, Usage = ${uncommittedLogs[serverID]})`
}

// Commit logs by saving it into string and into daemon statistics of the node
function commitLog() {
  for (let serverID in uncommittedLogs) {
    daemon[serverID] = serverCPU
    daemonPromises[serverID] = new Promise((resolve, reject) => {
      daemonResolvers[serverID] = resolve
    })
    checkDaemonAvailability(serverID)
    committedLogs.push(makeLogString(serverID))
  }
}

app.listen(port)
run()
