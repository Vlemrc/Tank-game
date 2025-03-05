import Link from 'next/link';

const HomePage = () => {
  return (
    <div>
      <h1>Bienvenue dans le jeu de Tanks !</h1>
      <Link href="/game">Démarrer la partie</Link>
    </div>
  );
};

export default HomePage;
