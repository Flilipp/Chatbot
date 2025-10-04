import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(''); // Zamiast error, ogólna wiadomość
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    const endpoint = isLogin ? 'http://127.0.0.1:8000/token' : 'http://127.0.0.1:8000/register';

    const body = new URLSearchParams();
    body.append('username', email); // FastAPI's OAuth2 expects 'username'
    body.append('password', password);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Wystąpił nieznany błąd');
      }

      if (isLogin) {
        localStorage.setItem('auth-token', data.access_token);
        navigate('/');
      } else {
        setIsLogin(true);
        setMessage('Rejestracja pomyślna! Możesz się teraz zalogować.');
        setIsError(false);
      }

    } catch (error: any) {
      setMessage(error.message);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          {isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="twoj@email.com" />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">Hasło</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="••••••••" />
          </div>

          {message && (
            <div className={`p-3 border rounded-lg text-sm ${isError ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-green-900/50 border-green-500 text-green-200'}`}>
              {message}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Ładowanie...' : isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }} className="text-blue-400 hover:text-blue-300">
            {isLogin ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;