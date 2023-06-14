# airx

Arix is a front-end framework based on JSX, but it doesn't have hooks like React.

## Use

```tsx
import * as airx from 'airx'

const outsideCount = airx.createRef(1)

function App() {
  const innerCount = airx.createRef(1)

  const handleClick = () => {
    innerCount.value += 1
    outsideCount.value +=1
  }

  return () => (
    <button onClick={handleClick}>
      {innerCount.value}
      {outsideCount.value}
    </button>
  )
}

airx.createApp(<App />).mount(document.getElementById('app'))
```
