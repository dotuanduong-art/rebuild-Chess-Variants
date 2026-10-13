import { PROTOCOL_VERSION } from '@variant-chess/shared-types';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-8 py-16">
      <p className="text-sm tracking-widest text-stone-400">PHASE 01A</p>
      <h1 className="text-4xl font-semibold tracking-tight">Variant Chess</h1>
      <p className="max-w-xl text-lg leading-relaxed text-stone-300">
        Nền tảng monorepo đã sẵn sàng. Gameplay sẽ được xây dựng ở phase được phê duyệt tiếp theo.
      </p>
      <p className="text-sm text-stone-400">Draft protocol: {PROTOCOL_VERSION}</p>
    </main>
  );
}
