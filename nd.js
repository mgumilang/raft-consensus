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
let node_leader = null
let term = 0
let vote_for = 0
let node_log = []
let list_neighbors = process.argv.slice(4)

let resolver = null // resolver for run function
let current_message = {} // uncommitted logs

app.use(bodyParser.urlencoded({ extended: false }))

// Route to show logs
app.get('/log', (req, res) => {
  res.send(node_log)
})

// Route to send status
app.get('/status', (req, res) => {
  res.send(status)
})

// Request to get number
app.get('/:number', (req, res) => {
  n = req.params.number
  if (Object.keys(daemon).length != 0) {
    target = 10000
    min = 100
    for (let id in daemon) {
      if (min >= daemon[id]) {
        target = parseInt(id) + 10000
        min = daemon[id]
      }
    }
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
    current_message = {}
    let get_port = req.body.port
    let get_data = req.body.data
    let get_purpose = req.body.purpose
    let get_term = parseInt(req.body.term)

    if (get_purpose == purposes.VOTE) {
      // Vote handler
      if (term < get_term) {
        term = get_term
        console.log(`Node #${port}: Voted node #${get_port} for term #${term} leader`)
        res.send('OK')
        resolver()
      } else {
        console.log(`Node #${port}: Ignored node #${get_port} vote request for term #${term}`)
      }
    } else if (get_purpose == purposes.HEARTBEAT) {
      // Heartbeat handler
      term = get_term
      console.log(`Node #${port}: Got heartbeat from node #${get_port}`)
      let get_daemon_data = JSON.parse(req.body.daemon_data)
      current_message = JSON.parse(req.body.message)
      node_log = JSON.parse(get_data)
      daemon = get_daemon_data

      if (Object.keys(current_message).length > 0) {
        // There is something to commit
        console.log(`Node #${port}: Ready to commit`)
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
      serverCPU = parseFloat(req.body.cpu)
      if (serverID in daemon) {
        daemonResolvers[serverID](resolveValues.DAEMON_RESPONSE)
      }
      daemon[serverID] = serverCPU
      daemonPromises[serverID] = new Promise((resolve, reject) => {
        daemonResolvers[serverID] = resolve
      })
      checkDaemon(serverID)

      // Ask neighbors
      current_message[serverID] = `(Daemon #${serverID}, Usage = ${serverCPU})`
      console.log(`Node #${port}: Received from server #${serverID}, Usage = ${serverCPU}`)
      resolver(resolveValues.HEARTBEAT_CHECK)
    }
    res.send('OK')
  }
})

function requestVote() {
  let vote = 1
  let alreadyVoted = false
  status = statuses.CANDIDATE
  for (let i = 0; i < list_neighbors.length; i++) {
    request.post({url:('http://localhost:' + list_neighbors[i]), form: {
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
        if (vote > Math.floor(list_neighbors.length / 2)) {
          status = statuses.LEADER
          resolver(resolveValues.HEARTBEAT_CHECK)
        }
      }
    })
  }
}

function checkDaemon(serverID) {
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

function appendEntries() {
  let commit = 1
  let alreadyCommit = false
  for (let i = 0; i < list_neighbors.length; i++) {
    request.post({url:('http://localhost:' + list_neighbors[i]), form: {
      type: types.NODE,
      purpose: purposes.HEARTBEAT,
      port: port,
      term: term,
      data: JSON.stringify(node_log),
      message: JSON.stringify(current_message),
      daemon_data: JSON.stringify(daemon)
    }}, function(err, res, body) {
      console.log(`Node #${port} (L): Received message from node #${list_neighbors[i]}: ${body}`)
      if ((body == 'readyToCommit') && (status == statuses.LEADER)) {
        commit += 1
        if (commit > Math.floor(list_neighbors.length / 2) && !alreadyCommit) {
          alreadyCommit = true
          for (let id in current_message) {
            node_log.push(current_message[id])
          }
          console.log(`Node #${port} (L): Successfully committed`)
          resolver(resolveValues.HEARTBEAT_CHECK)
          current_message = {}
        }
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
