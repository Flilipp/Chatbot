import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('--- FORMULARZ WYSŁANY ---');
    setLoading(true);
    setMessage('');
    setIsError(false);

    const endpoint = isLogin ? 'http://127.0.0.1:8000/token' : 'http://127.0.0.1:8000/register';
    console.log('Wybrany endpoint:', endpoint);

    const body = new URLSearchParams();
    body.append('username', email);
    body.append('password', password);
    console.log('Przygotowane ciało zapytania (body):', { username: email, password: password });

    try {
      console.log('Wysyłanie zapytania fetch...');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
      });

      console.log('Otrzymano odpowiedź! Status:', response.status);
      const data = await response.json();
      console.log('Dane z odpowiedzi (JSON):', data);

      if (!response.ok) {
        console.error('Odpowiedź NIE jest OK. Rzucam błąd.');
        throw new Error(data.detail || 'Wystąpił nieznany błąd serwera');
      }

      console.log('Odpowiedź jest OK. Przetwarzanie...');

      if (isLogin) {
        console.log('Tryb logowania. Zapisywanie tokenu...');
        localStorage.setItem('auth-token', data.access_token);
        console.log('Token zapisany. Przekierowanie na /test...');
        window.location.href = '/test';
      } else {
        console.log('Tryb rejestracji. Przełączanie na logowanie...');
        setIsLogin(true);
        setMessage('Rejestracja pomyślna! Możesz się teraz zalogować.');
        setIsError(false);
      }

    } catch (error: any) {
      console.error('--- WYSTĄPIŁ BŁĄD W BLOKU CATCH ---');
      console.error('Szczegóły błędu:', error);
      setMessage(error.message);
      setIsError(true);
    } finally {
      console.log('--- BLOK FINALLY WYKONANY ---');
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
            {loading ? '...' : isLogin ? 'Zaloguj' : 'Zarejestruj'}
          </button>
        </form>
        <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }} className="text-blue-400 hover:text-blue-300 mt-6 text-center w-full">
          {isLogin ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
        </button>
      </div>
    </div>
  );
};

export default Auth;