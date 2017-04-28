/**
Filename: constants.js
Description: Constants used in node and daemon
Creator:
- Garmastewira/13514068
- Ali Akbar/13514080
- Muhammad Gumilang/13514092
**/

const statuses = {
  FOLLOWER: 'FOLLOWER',
  CANDIDATE: 'CANDIDATE',
  LEADER: 'LEADER'
}

const types = {
  NODE: 'NODE',
  DAEMON: 'DAEMON'
}

const resolveValues = {
  HEARTBEAT_CHECK: 'HEARTBEAT_CHECK',
  HEARTBEAT_RESPONSE: 'HEARTBEAT_RESPONSE',
  TIMEOUT: 'TIMEOUT',
  DAEMON_RESPONSE: 'DAEMON_RESPONSE'
}

const purposes = {
  HEARTBEAT: 'HEARTBEAT',
  VOTE: 'VOTE'
}

module.exports = {
  statuses: statuses,
  types: types,
  resolveValues: resolveValues,
  purposes: purposess
}
