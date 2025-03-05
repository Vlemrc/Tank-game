import Link from 'next/link';

const HomePage = () => {
  return (
    <div className="flex items-center justify-center h-screen flex-col gap-4">
      <h1 className="text-4xl">TANKS ARENA</h1>
      <Link href="/game" className="p-2 px-4 rounded-md !bg-green-800 hover:!bg-green-900 transition-all">Démarrer la partie</Link>
    </div>
  );
};

export default HomePage;
