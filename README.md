# Konsensus Raft
Raft merupakan alogirtma konsensus yang didesain agar mudah dipahami. Konsensus Raft sama halnya dengan Paxos dalam *fault-tolerance* dan *performance*. Bedanya adalah, konsensus Raft didekomposisi ke dalam sub masalah yang relatif independen, dan hal ini meng-*address* seluruh bagian informasi yang diperlukan untuk sistem.

## Instalasi
```sh
$ npm install
```
Untuk dijalankan di satu pc, bukalah beberapa terminal/cmd untuk menjalankan node, daemon, dan master balancer secara bersamaan dengan commands dibawah ini.

## Commands
### Node
```sh
$ node nd.js <my port> <no. of neighbors> <node-0 port> ... <node-(n-1) port>
```
### Daemon
```sh
$ node daemon.js <id> <no. of nodes> <node-0 port> ... <node-(n-1) port>
```
### Balancer Node
```sh
$ node balancer_master.js <no. of nodes> <node-0 port> ... <node-(n-1) port>
```

## Deskripsi File
1. **balancer_master.js**: Act as the interface of the user to the load balancer. Balance master will only contact the leader of the load balancer
2. **constants.js**: Constants used in node and daemon
3. **daemon.js**: Daemon's implementation in raft consensus. Daemon's function is to retrieve the server's CPU usage, and send it to all nodes
4. **nd.js**: Node's implementation in raft consensus
5. **worker.py**: Worker to receive *n* and send *n*th prime number

## Referensi
- http://thesecretlivesofdata.com/raft/
- https://raft.github.io/
