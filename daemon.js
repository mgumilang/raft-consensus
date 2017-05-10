/**
Filename: nd.js
Description: Daemon's implementation in raft consensus. Daemon's function is to retrieve the server's CPU usage, and send it to all nodes
Creator:
- Garmastewira/13514068
- Ali Akbar/13514080
- Muhammad Gumilang/13514092
**/

let argLength = process.argv.length
if (argLength < 4 || argLength < parseInt(process.argv[3]) + 4) {
  console.error('node daemon.js <id> <no. of nodes> <node-0 address> ... <node-(n-1) address>')
  process.exit(1)
}

const request = require('request')
const os = require('os')
const osUtils 	= require('os-utils');
const types = require('./constants').types
const id = process.argv[2]
const numNodes = parseInt(process.argv[3])
const nodes = process.argv.slice(4)

// Start related worker
// Worker's port = Daemon's id + 10000
let spawn = require("child_process").spawn;
let processX = spawn('python',[__dirname + "/worker.py", parseInt(id) + 10000]);

function sendID() {
  osUtils.cpuUsage(function(v) {
    usage = v
    console.log(`Server #${id}: Usage = ${usage}`)
    for (let i = 0; i < numNodes; i++) {
      request.post({
        url: nodes[i],
        form: {
          type: types.DAEMON,
          id: id,
          cpu: usage
        }
      }, function(err, res, body) {
        if (err) {
          console.log(`Server #${id}: Failed, node ${nodes[i]} is dead`)
        } else {
          console.log(`Server #${id}: Sent to ${nodes[i]}`)
        }
      })
    }
  });
}

setInterval(sendID, 4000)
