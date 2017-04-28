let argLength = process.argv.length
if (argLength < 3 || argLength < parseInt(process.argv[2]) + 3) {
  console.error('node balancer_master.js <no. of nodes> <node-0 address> ... <node-(n-1) address>')
  process.exit(1)
}

nodes = process.argv.slice(3).map((val) => {
  return 'http://localhost:' + val
})

const express = require('express')
const request = require('request')
const statuses = require('./constants.js').statuses

const app = express()

app.get('/:number', (req, res) => {
  number = req.params.number
  for (let i = 0; i < nodes.length; i++) {
    request(nodes[i] + '/status', (err1, res1, body1) => {
      if (body1 == statuses.LEADER) {
        request(nodes[i] + `/${number}`, (err2, res2, body2) => {
          res.send(`Received result from port ${nodes[i]}: ${body2}`)
        })
      }
    })
  }
})

app.listen(8080)
