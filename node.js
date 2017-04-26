const bodyParser = require('body-parser')
const express = require('express')
const app = express()
const port = process.argv[2] || 3000
console.log('Node started on port', port)

const FOLLOWER = 0
const CANDIDATE = 1
const LEADER = 2

let status = FOLLOWER

app.use(bodyParser.urlencoded({ extended: false }))

app.post('/', (req, res) => {
  serverID = req.body.id
  serverCPU = req.body.cpu
  console.log(`Received from Server #${serverID}, Usage = ${serverCPU}`)
  // TODO: Save it into log
  // Also some timeout thing to determine if the server is dead
})

app.listen(port)
