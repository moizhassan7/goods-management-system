// server.js
const { createServer } = require('http')
const next = require('next')

const port = process.env.PORT || 3000 // cPanel Node.js apps use a specific port from env

const app = next({ dev: process.env.NODE_ENV !== 'production' })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res)
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)
  })
})