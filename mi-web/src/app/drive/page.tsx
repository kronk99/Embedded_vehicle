// app/drive/page.tsx
export default function DrivePage() {
  return (
    <main className="relative min-h-[70vh] bg-white rounded-2xl shadow p-6">
      <div className="absolute top-4 left-4">
        <span className="text-xl font-extrabold tracking-wide">LETS DRIVE</span>
      </div>

      <div className="pt-16">
        <h2 className="text-2xl font-semibold">Panel de conducción (demo)</h2>
        <p className="text-gray-600 mt-2">
          Aquí podrías colocar controles, video, indicadores, etc.
        </p>
      </div>
    </main>
  );
}
