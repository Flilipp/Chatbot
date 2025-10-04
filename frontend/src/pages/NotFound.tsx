const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-800 text-white">
    <div className="text-center">
      <h1 className="mb-4 text-4xl font-bold">404</h1>
      <p className="mb-4 text-xl text-gray-400">Strona nie została znaleziona</p>
      <a href="/" className="text-blue-500 underline hover:opacity-80">
        Powrót do strony głównej
      </a>
    </div>
  </div>
);
export default NotFound;