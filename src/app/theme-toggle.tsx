"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "cardapioAdaptavel:theme:v1";
type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      const nextTheme: Theme = saved === "dark" ? "dark" : "light";
      setTheme(nextTheme);
      applyTheme(nextTheme);
    } catch {
      applyTheme("light");
    }
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      // O tema continua funcionando nesta sessão mesmo se o armazenamento estiver indisponível.
    }
  }

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} aria-pressed={theme === "dark"}>
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      {theme === "dark" ? "Modo claro" : "Modo escuro"}
    </button>
  );
}
