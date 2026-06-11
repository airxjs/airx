/**
 * SSR Server Example
 * 
 * Run with: npx tsx source/server.ts
 * Then open http://localhost:3000
 */

import http from 'http'
import { createSSRApp } from 'airx/server'

interface Post {
  id: number
  title: string
  content: string
}

const posts: Post[] = [
  { id: 1, title: 'Getting Started with Airx', content: 'Airx is a lightweight Signal-driven JSX framework...' },
  { id: 2, title: 'Server-Side Rendering', content: 'Learn how to render Airx apps on the server...' },
  { id: 3, title: 'Hydration Deep Dive', content: 'Understanding how client-side hydration works...' },
]

function BlogList() {
  return () => (
    <div className="card">
      <h1>Blog Posts (SSR)</h1>
      {posts.map(post => (
        <div key={post.id} className="post">
          <h3>{post.title}</h3>
          <p>{post.content}</p>
        </div>
      ))}
    </div>
  )
}

const PORT = 3000

const server = http.createServer(async (req, res) => {
  if (req.url !== '/') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const app = createSSRApp(<BlogList />)
  const html = await app.renderToString()

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Airx SSR Server</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; background: #f5f5f5; margin: 0; }
    #app { max-width: 600px; margin: 0 auto; }
    .card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-top: 0; }
    .post { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; }
    .post h3 { margin: 0 0 0.5rem 0; }
    .post p { margin: 0; color: #666; }
  </style>
</head>
<body>
  <div id="app">${html}</div>
  <script type="module" src="/client.js"></script>
</body>
</html>`

  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(fullHtml)
})

server.listen(PORT, () => {
  console.log(`SSR server running at http://localhost:${PORT}`)
})