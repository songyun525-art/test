import { Skyline } from "./Hero";

export default function PageHeader({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <header className="hero hero-small">
      <Skyline />
      <div className="hero-body">
        <p className="hero-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="hero-sub">{sub}</p>
      </div>
    </header>
  );
}
