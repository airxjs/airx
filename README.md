# airx 

[![npm](https://img.shields.io/npm/v/airx.svg)](https://www.npmjs.com/package/airx) [![build status](https://github.com/airxjs/airx/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/airxjs/airx/actions/workflows/check.yml)

☁️ Airx is a lightweight JSX web application framework.

Airx is a front-end framework based on JSX, designed to provide a simple and straightforward solution for building web applications. While it does not include hooks like React, it offers a range of features to manage state and handle user interactions efficiently.

## Features

- Create reaction values for managing dynamic data
- Define components using JSX syntax
- Lightweight and easy to learn

## Getting Started

To get started with Airx, follow these steps:

1. Install Airx using npm or yarn:

 ```shell
 npm install airx
 ```

2. Import the necessary functions and components in your project:

```javascript
import * as airx from 'airx'

// create a reaction value
const outsideCount = airx.createSignal(1)

// define a component
function App() {
  // create a reaction value
  const innerCount = airx.createSignal(1)

  const handleClick = () => {
    innerCount.value += 1
    outsideCount.value +=1
  }

  // return a render function
  return () => (
    <button onClick={handleClick}>
      {innerCount.value}
      {outsideCount.value}
    </button>
  )
}

const app = airx.createApp(<App />);
app.mount(document.getElementById('app'));
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.

## Acknowledgments

We would like to thank all the contributors and supporters of the Airx project.

---

For more information, check out the [official documentation](https://github.com/airxjs/airx).
