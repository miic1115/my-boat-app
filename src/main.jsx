import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// 這是啟動開關，我們移除了所有可能出錯的 CSS 引用
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
