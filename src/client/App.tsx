import { Routes, Route, Link } from 'react-router';
import HomePage from './components/HomePage';
import ListPage from './components/ListPage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Link to="/" className="text-xl font-bold text-gray-800 hover:text-gray-600">
            Packing List
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lists/:id" element={<ListPage />} />
        </Routes>
      </main>
    </div>
  );
}
