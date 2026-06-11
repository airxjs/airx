import * as airx from 'airx'
import { Signal } from 'signal-polyfill'
import { onMounted } from 'airx'

interface User {
  id: number
  name: string
  email: string
}

// Simulated API
async function fetchUsers(): Promise<User[]> {
  await new Promise(resolve => setTimeout(resolve, 800))
  return [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
    { id: 3, name: 'Carol White', email: 'carol@example.com' },
  ]
}

function UserList() {
  const users = new Signal.State<User[]>([])
  const loading = new Signal.State(true)
  const error = new Signal.State<string | null>(null)

  onMounted(async () => {
    try {
      const data = await fetchUsers()
      users.set(data)
    } catch (e) {
      error.set(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      loading.set(false)
    }
  })

  return () => (
    <div>
      <h1>User List</h1>

      {loading.get() && <p className="loading">Loading users...</p>}
      {error.get() && <p className="error">Error: {error.get()}</p>}

      {!loading.get() && !error.get() && users.get().map(user => (
        <div key={user.id} className="user-card">
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
      ))}

      {!loading.get() && users.get().length === 0 && (
        <p className="loading">No users found.</p>
      )}
    </div>
  )
}

airx.createApp(<UserList />).mount(document.getElementById('app')!)