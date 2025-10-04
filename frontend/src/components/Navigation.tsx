import { useNavigate } from 'react-router-dom';

const Navigation = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('auth-session');
    navigate('/auth');
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-700 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            Czat
          </button>
          <button
            onClick={() => navigate('/image-generator')}
            className="px-4 py-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            Generator Obrazów
          </button>
          <button
            onClick={() => navigate('/voice-chat')}
            className="px-4 py-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            Czat Głosowy
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Wyloguj
        </button>
      </div>
    </nav>
  );
};

export default Navigation;