let argLength = process.argv.length
if (argLength < 4 || argLength < parseInt(process.argv[3]) + 4) {
  console.error('node daemon.js <id> <no. of nodes> <node-0 address> ... <node-(n-1) address>')
  process.exit(1)
}

const request = require('request')
const os = require('os')
const id = process.argv[2]
const numNodes = parseInt(process.argv[3])
const nodes = process.argv.slice(4)

function sendID() {
  usage = getUsage()
  console.log(`Server #${id}: Usage = ${usage}`)
  for (let i = 0; i < numNodes; i++) {
    request.post(nodes[i]).form({
      id: id,
      cpu: usage
    })
    console.log(`Server #${id}: Sent to Node #${i} = ${nodes[i]}`)
  }
}

function getUsage() {
  let cpu = os.cpus()
  let free = 0

  for (let i = 0; i < cpu.length; i++) {
    total = parseFloat(cpu[i].times.idle)
            + parseFloat(cpu[i].times.sys)
            + parseFloat(cpu[i].times.user)
            + parseFloat(cpu[i].times.irq)
            + parseFloat(cpu[i].times.nice)
    free += 100 * (parseFloat(cpu[i].times.idle) / total)
  }
  return 100 - free / cpu.length
}

setInterval(sendID, 4000)
