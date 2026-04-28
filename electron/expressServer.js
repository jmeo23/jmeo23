const express = require('express')
const { WebSocketServer } = require('ws')
const http = require('http')
const path = require('path')

function createExpressServer({ distPath, onMessage }) {
  const expressApp = express()
  expressApp.use(express.static(distPath))
  expressApp.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')))

  const server     = http.createServer(expressApp)
  const wss        = new WebSocketServer({ server })
  const clients    = new Set()

  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('close', () => clients.delete(ws))
    ws.on('message', (msg) => {
      try { onMessage(JSON.parse(msg.toString())) } catch {}
    })
  })

  function broadcast(data) {
    const payload = JSON.stringify(data)
    for (const ws of clients) {
      if (ws.readyState === 1) ws.send(payload)
    }
  }

  function listen(port = 3000) {
    return new Promise((resolve) => server.listen(port, () => resolve(port)))
  }

  return { broadcast, listen }
}

module.exports = { createExpressServer }
