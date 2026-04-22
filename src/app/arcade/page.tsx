export default function ArcadePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold border-b-2 border-[var(--brand-accent)] pb-2 mb-6">
        Arcade
      </h1>

      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-5xl mb-4">🕹️</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Coming Soon
        </h2>
        <p className="text-gray-500 max-w-md mx-auto">
          The Arcade is under construction. Check back soon for games and
          interactive experiences for the community.
        </p>
      </div>
    </div>
  );
}
