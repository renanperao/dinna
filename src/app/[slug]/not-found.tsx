export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-neutral-900">Restaurante não encontrado</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Verifique o link ou o QR code. Se o problema persistir, entre em contato com o
          estabelecimento.
        </p>
      </div>
    </main>
  );
}
