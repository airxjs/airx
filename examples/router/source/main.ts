import * as airx from 'airx'
import { Router, RouteComponentProps } from 'airx-router'

// Page components
function HomePage() {
  return () => (
    <div className="page">
      <h1>Home</h1>
      <p>Welcome to the Airx Router example!</p>
      <p>Use the navigation above to explore different routes.</p>
    </div>
  )
}

function AboutPage() {
  return () => (
    <div className="page">
      <h1>About</h1>
      <p>Airx Router provides client-side routing with nested routes and path parameters.</p>
    </div>
  )
}

function UserPage(props: RouteComponentProps) {
  const userId = props.data?.params?.['id'] ?? 'unknown'
  return () => (
    <div className="page">
      <h1>User Profile</h1>
      <div className="params">User ID: {userId}</div>
      <p>This page was rendered using dynamic route parameters.</p>
    </div>
  )
}

// Layout component (renders child routes)
function Layout(props: RouteComponentProps) {
  return () => <div>{props.children}</div>
}

// Route configuration
const routes = {
  path: '/',
  component: Layout,
  children: [
    { path: '/', component: HomePage },
    { path: 'about', component: AboutPage },
    { 
      path: 'users/:id', 
      component: UserPage 
    },
  ]
}

airx
  .createApp(<Router routes={[routes]} />)
  .mount(document.getElementById('app')!)