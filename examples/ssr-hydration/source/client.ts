/**
 * SSR Hydration Example - Client Entry
 * 
 * This demonstrates the full SSR lifecycle:
 * 1. Server renders HTML with state snapshot embedded
 * 2. Client receives HTML and hydrates to make it interactive
 * 
 * To run the server part, use:
 *   npx tsx source/server.ts
 * Then open http://localhost:3000 in browser
 */

import { createSSRApp, hydrate } from 'airx/server'
import { Signal } from 'signal-polyfill'

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
  const filterText = new Signal.State('')
  
  const filteredPosts = new Signal.Computed(() => {
    const text = filterText.get().toLowerCase()
    if (!text) return posts
    return posts.filter(p => 
      p.title.toLowerCase().includes(text) || 
      p.content.toLowerCase().includes(text)
    )
  })

  return () => (
    <div className="card">
      <h1>Blog Posts</h1>
      <div className="info">
        <p>Server-rendered HTML has been hydrated. Try typing in the filter box — the list updates instantly without page reload!</p>
        <p>Open DevTools to see the page HTML includes an embedded state snapshot (look for <code>&lt;script type="airx-state"&gt;</code>).</p>
      </div>
      
      <input 
        type="text"
        placeholder="Filter posts..."
        onInput={(e) => filterText.set((e.target as HTMLInputElement).value)}
        style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 1rem; box-sizing: border-box;"
      />
      
      {filteredPosts.get().map(post => (
        <div key={post.id} className="post">
          <h3>{post.title}</h3>
          <p>{post.content}</p>
        </div>
      ))}
      
      {filteredPosts.get().length === 0 && (
        <p style="color: #888;">No posts match your filter.</p>
      )}
    </div>
  )
}

// Create SSR app
const app = createSSRApp(<BlogList />)

// Hydrate the existing SSR HTML
// (In a real app, the server would render the HTML first)
// For demo purposes, we render and hydrate in one step
const container = document.getElementById('app')!

// First, render the SSR HTML into the container
app.renderToString().then(html => {
  container.innerHTML = html
  
  // Then hydrate to make it interactive
  app.hydrate(container)
  
  // Log the SSR output for educational purposes
  console.log('SSR HTML output:', html)
})