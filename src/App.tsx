import './App.css'

function App() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Tailwind CSS 按鈕測試</h1>

      {/* 基本按鈕 */}
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4 mb-4">
        基本按鈕
      </button>

      {/* 外框按鈕 */}
      <button className="border-2 border-blue-500 hover:bg-blue-500 hover:text-white text-blue-500 font-bold py-2 px-4 rounded mr-4 mb-4">
        外框按鈕
      </button>

      {/* 漸變按鈕 */}
      <button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 px-4 rounded mr-4 mb-4">
        漸變按鈕
      </button>

      {/* 禁用按鈕 */}
      <button className="bg-gray-500 text-white font-bold py-2 px-4 rounded opacity-50 cursor-not-allowed">
        禁用按鈕
      </button>
    </div>
  )
}

export default App
