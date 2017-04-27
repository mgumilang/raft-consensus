console.error('node node.js <my port> <no. of neighbors> <node-0 address> ... <node-(n-1) address>')
// process.exit(1)


const bodyParser = require('body-parser')
const express = require('express')
const request = require('request')
const app = express()
const port = process.argv[2] || 3000
const Promise = require('bluebird')
console.log('Node started on port', port)

var daemon = {}
const FOLLOWER = 0
const CANDIDATE = 1
const LEADER = 2

var node_log = []
let status = FOLLOWER
let resolver = null

// Who's the leader?
node_leader = null
list_neighbors = process.argv.slice(4)
term = 0
vote = 0
vote_for = 0
let current_message = ''
commit = 0

app.use(bodyParser.urlencoded({ extended: false }))

app.post('/', (req, res) => {
  console.log(`${port} received...`)
  type = req.body.type
  if (type == 'node') {
    current_message=''
    get_port = req.body.port
    get_data = req.body.data
    get_purpose = req.body.purpose
    if (get_purpose == 'vote') {
      get_term = parseInt(req.body.term)
      //update term
      if (term < get_term) {
        term = get_term
        res.send('bitch I vote for '+get_port+' for term '+term)
      }
      resolver()
    } else if (get_purpose == 'leader') {
      node_leader = get_port
      console.log(port+' got instruction from leader '+node_leader)
      current_message = req.body.message
      if (current_message != ''){
        console.log(port+' got instruction from leader '+node_leader+' write some fucking notes')
        node_log.push(current_message)
        res.send('commit')
        resolver('me_is_the_bitch')
        current_message=''
      }
      else{
        res.send('ok')
        resolver('me_is_the_bitch')
      }
    }
  } else if (type == 'daemon') {
    if (status == LEADER){
      serverID = req.body.id
      serverCPU = parseInt(req.body.cpu)
      current_message = `Received from daemon #${serverID}, Usage = ${serverCPU}`
      node_log.push(current_message)
      daemon[serverID] = serverCPU
      console.log(`Received from Server #${serverID}, Usage = ${serverCPU}`)
      resolver('I_am_the_leader')
    }
  }
})

function beCandidate() {
  vote = 1
  status = CANDIDATE
  let i = 0
  for (i = 0; i < list_neighbors.length; i++) {
    request.post({url:('http://localhost:' + list_neighbors[i]), form: {
      type: 'node',
      purpose: 'vote',
      port: port,
      data: 'vote me',
      term: term
    }}, function(err, res, body) {
      if ((res) && (status == CANDIDATE)) {
        //console.log(res)
        vote += 1
        console.log(`term ${term}, vote for ${port} = ${vote}`)
        if (vote > Math.floor(list_neighbors.length / 2)) {
          status = LEADER
          resolver('boss_ass_bitch')
        }
      }
    })
  }
}


function leaderSend() {
  let data = 'leader me'
  for (i = 0; i < list_neighbors.length; i++) {
    request.post({url:('http://localhost:' + list_neighbors[i]), form: {
      type: 'node',
      purpose: 'leader',
      port: port,
      data: data,
      message: current_message,
    }}, function(err, res, body) {
      console.log('kontol:', body)
      if ((body == 'commit') && (status == LEADER)) {
        //console.log(res)
        console.log(`affirmed`)
        commit =+ 1
        if (vote > Math.floor(list_neighbors.length / 2)) {
          console.log('lets write, go commit something')
          resolver('lets_write')
        }
      }
      else{
        console.log(`affirmed nothing to commit`)
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

  if (status == LEADER) {
    setTimeout(function() {
      leaderSend()
      run()
    }, 1000)
  } else {
  	Promise.race([listen(), listenTimeout]).then(function(value) {
      if (value == 'boss_ass_bitch') {
        leaderSend()
      } else if (value == 'me_is_the_bitch') {
        // ee
      } else if (value == 'timeout') {
        console.log(`AING PORT ${port} SEBAGAI FOLLOWER BErUBAH..... JADI CANDIDATEEEEE`)
        term += 1
        beCandidate()
      } else if (value == 'I_am_the_leader'){
        leaderSend()
      }
  		run()
  	})
  }
}

run()

app.listen(port)
