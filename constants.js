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

module.exports = {
  statuses: statuses,
  types: types,
  resolveValues: resolveValues
}
