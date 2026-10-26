import Link from "next/link";
import ThemeToggle from "../theme-toggle";

const team = [
  { name: "Luís Diogo Nascimento Arruda", role: "Integrante da equipe" },
  { name: "Iago Henrique Gomes Florêncio", role: "Integrante da equipe" },
  { name: "Pedro Henrique de Medeiros Brito", role: "Integrante da equipe" },
  { name: "Pedro Ricardo de Souza Arruda", role: "Integrante da equipe" },
];

export default function TeamPage() {
  return (
    <main className="team-page">
      <header className="team-page-header">
        <Link className="brand" href="/" aria-label="Voltar ao Cardápio Adaptável">
          <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M7 18h18a9 9 0 0 1-18 0Zm9-3V7m0 0c-4 0-6-2-6-4 4 0 6 1 6 4Zm0 0c0-4 2-6 6-6 0 4-2 6-6 6Z" /></svg></span>
          <span className="brand-name">cardápio<span>adaptável</span></span>
        </Link>
        <div className="team-header-actions"><ThemeToggle /><Link className="team-back-link" href="/">← Voltar ao início</Link></div>
      </header>
      <section className="team-hero">
        <p className="section-kicker">PROJETO ALBERTO · 3º TRIMESTRE</p>
        <h1>Uma ideia construída <span>em equipe.</span></h1>
        <p>Conheça os integrantes do Cardápio Adaptável, uma proposta para aproximar estudantes, nutricionistas e gestão por meio da participação no cardápio escolar.</p>
      </section>
      <section className="team-section" aria-labelledby="team-title">
        <div className="section-heading"><div><p className="section-kicker">QUEM FAZ ACONTECER</p><h2 id="team-title">Nossa equipe</h2></div><span className="section-hint">4 integrantes</span></div>
        <div className="team-grid">
          {team.map((member, index) => <article className="team-card" key={member.name}>
            <div className="team-avatar" aria-hidden="true">{member.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("")}</div>
            <span className="team-number">INTEGRANTE 0{index + 1}</span>
            <h3>{member.name}</h3>
            <p>{member.role}</p>
          </article>)}
        </div>
      </section>
      <section className="team-mission">
        <p className="section-kicker">NOSSO OBJETIVO</p>
        <h2>Ouvir os estudantes para melhorar a alimentação escolar.</h2>
        <p>A plataforma permite consultar o cardápio, registrar avaliações e sugestões, acompanhar mantimentos e visualizar indicadores que apoiam decisões mais conscientes e ajudam a reduzir o desperdício.</p>
      </section>
      <footer className="team-footer"><span>Cardápio Adaptável · Projeto escolar</span><Link href="/">Voltar para a aplicação ↗</Link></footer>
    </main>
  );
}
