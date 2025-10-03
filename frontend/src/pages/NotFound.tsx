const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <h1 className="mb-4 text-4xl font-bold">404</h1>
      <p className="mb-4 text-xl text-muted-foreground">Strona nie została znaleziona</p>
      <a href="/" className="text-primary underline hover:opacity-80">
        Powrót do strony głównej
      </a>
    </div>
  </div>
);

export default NotFound;
