"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import ThemeToggle from "./theme-toggle";

const profiles = [
  {
    name: "Aluno",
    description: "Consulte o cardápio e compartilhe sua opinião.",
    tone: "mint",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 5a10 10 0 0 0-10 10v2h20v-2A10 10 0 0 0 24 5Z" />
        <path d="M10 21h28v4a14 14 0 0 1-28 0v-4Zm6 18h16" />
      </svg>
    ),
  },
  {
    name: "Gestor",
    description: "Acompanhe indicadores e decisões da alimentação escolar.",
    tone: "peach",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 40V19l16-11 16 11v21H8Z" />
        <path d="M18 40V27h12v13M16 20h.01M24 20h.01M32 20h.01" />
      </svg>
    ),
  },
  {
    name: "Nutricionista",
    description: "Planeje refeições e escute quem está à mesa.",
    tone: "lavender",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M9 25h30a15 15 0 0 1-30 0Z" />
        <path d="M15 19c0-3 3-3 3-6m7 6c0-3 3-3 3-6m4 6c0-3 3-3 3-6M15 40h18" />
      </svg>
    ),
  },
];

type ProfileName = "Aluno" | "Gestor" | "Nutricionista";
type AuthMode = "login" | "register";
type Screen = "profiles" | "auth" | "welcome";
type StudentAccount = {
  matricula: number;
  nome: string;
  salt: string;
  passwordDigest: string;
};
type StaffAccount = {
  identificacao: string;
  role: "Gestor" | "Nutricionista";
  nome: string;
  salt: string;
  passwordDigest: string;
};
type AppSession = {
  role: ProfileName;
  name: string;
  matricula?: number;
};
type Notice = {
  kind: "error" | "success";
  text: string;
};
type MealFeedback = {
  id: string;
  studentName: string;
  studentMatricula: number | null;
  mealId: string;
  mealName: string;
  mealDate: string;
  rating: number;
  comment: string;
  submittedAt: string;
};
type MenuItem = {
  id: string;
  weekday: string;
  name: string;
  description: string;
  nutrition?: NutritionValues;
};
type NutritionValues = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
};
type PantryAssessment = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  month: string;
  rating: number;
  status: "adequado" | "atencao" | "indisponivel";
  notes: string;
  updatedAt: string;
};

const accountsStorageKey = "cardapioAdaptavel:studentAccounts:v1";
const sessionStorageKey = "cardapioAdaptavel:session:v1";
const staffAccountsStorageKey = "cardapioAdaptavel:staffAccounts:v1";
const feedbackStorageKey = "cardapioAdaptavel:mealFeedback:v1";
const menuStorageKey = "cardapioAdaptavel:weeklyMenu:v1";
const pantryStorageKey = "cardapioAdaptavel:pantryAssessments:v1";
const sessionChangeEvent = "cardapio-adaptavel-session-change";
const feedbackChangeEvent = "cardapio-adaptavel-feedback-change";
const menuChangeEvent = "cardapio-adaptavel-menu-change";
const pantryChangeEvent = "cardapio-adaptavel-pantry-change";
const weeklyMenu: MenuItem[] = [
  { id: "segunda", weekday: "Segunda-feira", name: "Arroz, feijão e frango ensopado", description: "Acompanha salada de alface e tomate." },
  { id: "terca", weekday: "Terça-feira", name: "Macarrão à bolonhesa", description: "Com cenoura ralada e fruta da estação." },
  { id: "quarta", weekday: "Quarta-feira", name: "Arroz, feijão e omelete", description: "Acompanha abóbora assada e salada verde." },
  { id: "quinta", weekday: "Quinta-feira", name: "Arroz com carne e legumes", description: "Com feijão carioca e banana." },
  { id: "sexta", weekday: "Sexta-feira", name: "Sopa de legumes com frango", description: "Servida com pão e fruta da estação." },
];

function isStudentAccount(value: unknown): value is StudentAccount {
  if (typeof value !== "object" || value === null) return false;

  const account = value as Record<string, unknown>;
  return (
    typeof account.matricula === "number" &&
    Number.isSafeInteger(account.matricula) &&
    account.matricula > 0 &&
    typeof account.nome === "string" &&
    typeof account.salt === "string" &&
    /^[a-f\d]{32}$/i.test(account.salt) &&
    typeof account.passwordDigest === "string" &&
    /^[a-f\d]{64}$/i.test(account.passwordDigest)
  );
}

function isStaffAccount(value: unknown): value is StaffAccount {
  if (typeof value !== "object" || value === null) return false;
  const account = value as Record<string, unknown>;
  return typeof account.identificacao === "string" && account.identificacao.trim().length >= 3
    && (account.role === "Gestor" || account.role === "Nutricionista")
    && typeof account.nome === "string" && account.nome.trim().length > 0
    && typeof account.salt === "string" && /^[a-f\d]{32}$/i.test(account.salt)
    && typeof account.passwordDigest === "string" && /^[a-f\d]{64}$/i.test(account.passwordDigest);
}

function readStaffAccounts(): { accounts: StaffAccount[] | null; error?: string } {
  try {
    const storedValue = window.localStorage.getItem(staffAccountsStorageKey);
    if (storedValue === null) return { accounts: [] };
    const parsed: unknown = JSON.parse(storedValue);
    if (typeof parsed !== "object" || parsed === null || !("version" in parsed) || parsed.version !== 1
      || !("accounts" in parsed) || !Array.isArray(parsed.accounts) || !parsed.accounts.every(isStaffAccount)) {
      return { accounts: null, error: "Os cadastros de equipe estão inválidos ou incompatíveis. Nenhum registro foi alterado." };
    }
    return { accounts: parsed.accounts };
  } catch {
    return { accounts: null, error: "Não foi possível acessar os cadastros locais neste navegador." };
  }
}

function isMealFeedback(value: unknown): value is MealFeedback {
  if (typeof value !== "object" || value === null) return false;

  const feedback = value as Record<string, unknown>;
  return (
    typeof feedback.id === "string" &&
    feedback.id.length > 0 &&
    typeof feedback.studentName === "string" &&
    feedback.studentName.trim().length > 0 &&
    (feedback.studentMatricula === null ||
      (typeof feedback.studentMatricula === "number" &&
        Number.isSafeInteger(feedback.studentMatricula) &&
        feedback.studentMatricula > 0)) &&
    typeof feedback.mealId === "string" &&
    typeof feedback.mealName === "string" &&
    typeof feedback.mealDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(feedback.mealDate) &&
    typeof feedback.rating === "number" &&
    Number.isInteger(feedback.rating) &&
    feedback.rating >= 1 &&
    feedback.rating <= 5 &&
    typeof feedback.comment === "string" &&
    feedback.comment.length <= 500 &&
    typeof feedback.submittedAt === "string" &&
    !Number.isNaN(Date.parse(feedback.submittedAt))
  );
}

function isNutritionValues(value: unknown): value is NutritionValues {
  if (typeof value !== "object" || value === null) return false;
  const nutrition = value as Record<string, unknown>;
  return ["calories", "protein", "carbohydrates", "fat", "fiber"].every(
    (key) => typeof nutrition[key] === "number" && Number.isFinite(nutrition[key]) && (nutrition[key] as number) >= 0,
  );
}

function isMenuItem(value: unknown): value is MenuItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.weekday === "string" &&
    typeof item.name === "string" &&
    typeof item.description === "string" &&
    (item.nutrition === undefined || isNutritionValues(item.nutrition))
  );
}

function isPantryAssessment(value: unknown): value is PantryAssessment {
  if (typeof value !== "object" || value === null) return false;
  const assessment = value as Record<string, unknown>;
  return (
    typeof assessment.id === "string" &&
    typeof assessment.name === "string" &&
    typeof assessment.quantity === "number" && Number.isFinite(assessment.quantity) && assessment.quantity >= 0 &&
    typeof assessment.unit === "string" &&
    typeof assessment.month === "string" && /^\d{4}-\d{2}$/.test(assessment.month) &&
    typeof assessment.rating === "number" && Number.isInteger(assessment.rating) && assessment.rating >= 1 && assessment.rating <= 5 &&
    (assessment.status === "adequado" || assessment.status === "atencao" || assessment.status === "indisponivel") &&
    typeof assessment.notes === "string" &&
    typeof assessment.updatedAt === "string" && !Number.isNaN(Date.parse(assessment.updatedAt))
  );
}

function readMealFeedback(): { feedbacks: MealFeedback[] | null; error?: string } {
  try {
    const storedValue = window.localStorage.getItem(feedbackStorageKey);
    if (storedValue === null) return { feedbacks: [] };

    const result = parseFeedbackSnapshot(storedValue);
    return result.error
      ? { feedbacks: null, error: result.error }
      : { feedbacks: result.feedbacks };
  } catch {
    return {
      feedbacks: null,
      error: "Não foi possível acessar o armazenamento local. Verifique as permissões do navegador.",
    };
  }
}

function getCurrentWeekStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMenuDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}

function createFeedbackId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readStudentAccounts(): { accounts: StudentAccount[] | null; error?: string } {
  try {
    const storedValue = window.localStorage.getItem(accountsStorageKey);
    if (storedValue === null) return { accounts: [] };

    const parsed: unknown = JSON.parse(storedValue);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== 1 ||
      !("accounts" in parsed) ||
      !Array.isArray(parsed.accounts) ||
      !parsed.accounts.every(isStudentAccount)
    ) {
      return {
        accounts: null,
        error: "Os dados salvos estão inválidos ou são incompatíveis. Não alteramos seus registros.",
      };
    }

    return { accounts: parsed.accounts };
  } catch {
    return {
      accounts: null,
      error: "Não foi possível acessar os dados locais neste navegador. Verifique as permissões de armazenamento.",
    };
  }
}

function parseSessionSnapshot(storedValue: string): AppSession | null {
  try {
    if (!storedValue) return null;

    const parsed: unknown = JSON.parse(storedValue);
    if (typeof parsed !== "object" || parsed === null) return null;

    const value = parsed as Record<string, unknown>;
    if (
      value.version !== 1 ||
      (value.role !== "Aluno" && value.role !== "Gestor" && value.role !== "Nutricionista") ||
      typeof value.name !== "string" ||
      value.name.trim().length === 0
    ) {
      return null;
    }

    // A sessão local precisa corresponder ao formato esperado para cada perfil.
    // Isso evita aceitar sessões malformadas por engano, mas não substitui
    // autenticação segura em servidor: o localStorage pode ser editado pelo usuário.
    if (value.role === "Aluno") {
      if (typeof value.matricula !== "number" || !Number.isSafeInteger(value.matricula) || value.matricula <= 0) {
        return null;
      }
    } else if (typeof value.name !== "string" || value.name.trim().length === 0 || value.matricula !== undefined) {
      return null;
    }

    return {
      role: value.role,
      name: value.name,
      ...(value.role === "Aluno" ? { matricula: value.matricula as number } : {}),
    };
  } catch {
    return null;
  }
}

function subscribeToSession(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(sessionChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(sessionChangeEvent, onStoreChange);
  };
}

function subscribeToFeedback(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(feedbackChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(feedbackChangeEvent, onStoreChange);
  };
}

function subscribeToMenu(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(menuChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(menuChangeEvent, onStoreChange);
  };
}

function subscribeToPantry(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(pantryChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(pantryChangeEvent, onStoreChange);
  };
}

const emptyFeedbackSnapshot = "__cardapio_adaptavel_no_feedback__";
const unavailableFeedbackSnapshot = "__cardapio_adaptavel_unavailable__";
const emptyMenuSnapshot = "__cardapio_adaptavel_no_menu__";
const unavailableMenuSnapshot = "__cardapio_adaptavel_menu_unavailable__";
const emptyPantrySnapshot = "__cardapio_adaptavel_no_pantry__";
const unavailablePantrySnapshot = "__cardapio_adaptavel_pantry_unavailable__";

function getFeedbackSnapshot() {
  try {
    return window.localStorage.getItem(feedbackStorageKey) ?? emptyFeedbackSnapshot;
  } catch {
    return unavailableFeedbackSnapshot;
  }
}

function getServerFeedbackSnapshot() {
  return emptyFeedbackSnapshot;
}

function parseFeedbackSnapshot(snapshot: string) {
  if (snapshot === emptyFeedbackSnapshot) return { feedbacks: [] as MealFeedback[], error: null };
  if (snapshot === unavailableFeedbackSnapshot) {
    return {
      feedbacks: [] as MealFeedback[],
      error: "Não foi possível acessar o armazenamento local. Verifique as permissões do navegador.",
    };
  }

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== 1 ||
      !("feedbacks" in parsed) ||
      !Array.isArray(parsed.feedbacks) ||
      !parsed.feedbacks.every(isMealFeedback)
    ) {
      return {
        feedbacks: [] as MealFeedback[],
        error: "Os feedbacks salvos estão inválidos ou são incompatíveis. Não alteramos esses registros.",
      };
    }

    return { feedbacks: parsed.feedbacks, error: null };
  } catch {
    return {
      feedbacks: [] as MealFeedback[],
      error: "Os feedbacks salvos estão inválidos ou são incompatíveis. Não alteramos esses registros.",
    };
  }
}

function getMenuSnapshot() {
  try {
    return window.localStorage.getItem(menuStorageKey) ?? emptyMenuSnapshot;
  } catch {
    return unavailableMenuSnapshot;
  }
}

function getServerMenuSnapshot() {
  return emptyMenuSnapshot;
}

function parseMenuSnapshot(snapshot: string): { menu: MenuItem[] | null; error: string | null } {
  if (snapshot === emptyMenuSnapshot) return { menu: null, error: null };
  if (snapshot === unavailableMenuSnapshot) {
    return { menu: null, error: "Não foi possível acessar o cardápio salvo neste navegador." };
  }

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (
      typeof parsed !== "object" || parsed === null ||
      !("version" in parsed) || parsed.version !== 1 ||
      !("items" in parsed) || !Array.isArray(parsed.items) || parsed.items.length !== weeklyMenu.length ||
      !parsed.items.every(isMenuItem) ||
      new Set(parsed.items.map((item) => item.id)).size !== weeklyMenu.length ||
      !("publishedAt" in parsed) || typeof parsed.publishedAt !== "string" || Number.isNaN(Date.parse(parsed.publishedAt))
    ) {
      return { menu: null, error: "O cardápio salvo está inválido ou incompatível. Não alteramos esse registro." };
    }
    return { menu: parsed.items, error: null };
  } catch {
    return { menu: null, error: "O cardápio salvo está inválido ou incompatível. Não alteramos esse registro." };
  }
}

function getPantrySnapshot() {
  try {
    return window.localStorage.getItem(pantryStorageKey) ?? emptyPantrySnapshot;
  } catch {
    return unavailablePantrySnapshot;
  }
}

function getServerPantrySnapshot() {
  return emptyPantrySnapshot;
}

function parsePantrySnapshot(snapshot: string): { assessments: PantryAssessment[] | null; error: string | null } {
  if (snapshot === emptyPantrySnapshot) return { assessments: [], error: null };
  if (snapshot === unavailablePantrySnapshot) {
    return { assessments: null, error: "Não foi possível acessar as avaliações de mantimentos neste navegador." };
  }

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (
      typeof parsed !== "object" || parsed === null ||
      !("version" in parsed) || parsed.version !== 1 ||
      !("assessments" in parsed) || !Array.isArray(parsed.assessments) ||
      !parsed.assessments.every(isPantryAssessment)
    ) {
      return { assessments: null, error: "As avaliações de mantimentos estão inválidas ou incompatíveis. Não alteramos esses registros." };
    }
    return { assessments: parsed.assessments, error: null };
  } catch {
    return { assessments: null, error: "As avaliações de mantimentos estão inválidas ou incompatíveis. Não alteramos esses registros." };
  }
}

function subscribeToClientReady() {
  return () => {};
}

function getClientReadySnapshot() {
  return true;
}

function getServerClientReadySnapshot() {
  return false;
}

function getSessionSnapshot() {
  try {
    return window.localStorage.getItem(sessionStorageKey) ?? "";
  } catch {
    return "";
  }
}

function getServerSessionSnapshot() {
  return "";
}

async function hashPassword(password: string, salt: string): Promise<string | null> {
  if (!window.crypto?.subtle) return null;

  const input = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await window.crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createSalt(): string | null {
  if (!window.crypto?.getRandomValues) return null;

  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function StudentDashboard({ session, onLogout }: { session: AppSession; onLogout: () => void }) {
  const feedbackSnapshot = useSyncExternalStore(
    subscribeToFeedback,
    getFeedbackSnapshot,
    getServerFeedbackSnapshot,
  );
  const feedbackState = parseFeedbackSnapshot(feedbackSnapshot);
  const feedbacks = feedbackState.feedbacks;
  const menuSnapshot = useSyncExternalStore(subscribeToMenu, getMenuSnapshot, getServerMenuSnapshot);
  const menuState = parseMenuSnapshot(menuSnapshot);
  const clientReady = useSyncExternalStore(
    subscribeToClientReady,
    getClientReadySnapshot,
    getServerClientReadySnapshot,
  );
  const [selectedMealKey, setSelectedMealKey] = useState("");
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const weekStart = clientReady ? getCurrentWeekStart() : null;
  const todayKey = clientReady ? toLocalDateKey(new Date()) : null;
  const visibleMenu = menuState.menu ?? weeklyMenu;
  const menuEntries = weekStart
    ? visibleMenu.map((meal, index) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + index);
        const dateKey = toLocalDateKey(date);
        return { ...meal, date, dateKey, key: `${dateKey}:${meal.id}` };
      })
    : [];
  const selectedMeal =
    menuEntries.find((meal) => meal.key === selectedMealKey) ??
    menuEntries.find((meal) => meal.dateKey === todayKey) ??
    menuEntries[0] ??
    null;

  function getMealSummary(mealId: string, mealDate: string) {
    const mealFeedbacks = feedbacks.filter(
      (feedback) => feedback.mealId === mealId && feedback.mealDate === mealDate,
    );
    const average = mealFeedbacks.length
      ? mealFeedbacks.reduce((total, feedback) => total + feedback.rating, 0) / mealFeedbacks.length
      : null;
    return { count: mealFeedbacks.length, average };
  }

  function handleFeedbackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (session.role !== "Aluno" || !session.matricula) {
      setNotice({ kind: "error", text: "Apenas uma sessão válida de aluno pode enviar avaliações. Entre novamente para continuar." });
      onLogout();
      return;
    }

    if (!selectedMeal) {
      setNotice({ kind: "error", text: "Aguarde o carregamento do cardápio e tente novamente." });
      return;
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      setNotice({ kind: "error", text: "Escolha uma nota de 1 a 5 para enviar sua avaliação." });
      return;
    }

    const storedFeedback = readMealFeedback();
    if (!storedFeedback.feedbacks) {
      setNotice({
        kind: "error",
        text: storedFeedback.error ?? "Não foi possível ler os feedbacks salvos neste navegador.",
      });
      return;
    }

    const feedback: MealFeedback = {
      id: createFeedbackId(),
      studentName: session.name,
      studentMatricula: session.matricula ?? null,
      mealId: selectedMeal.id,
      mealName: selectedMeal.name,
      mealDate: selectedMeal.dateKey,
      rating: parsedRating,
      comment: comment.trim(),
      submittedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(
        feedbackStorageKey,
        JSON.stringify({ version: 1, feedbacks: [...storedFeedback.feedbacks, feedback] }),
      );
    } catch {
      setNotice({
        kind: "error",
        text: "Não foi possível salvar sua avaliação. Verifique o espaço e as permissões do armazenamento local.",
      });
      return;
    }

    window.dispatchEvent(new Event(feedbackChangeEvent));
    setRating("");
    setComment("");
    setNotice({ kind: "success", text: "Avaliação enviada! Obrigado por ajudar a melhorar o cardápio." });
  }

  const weekLabel = weekStart
    ? `${formatMenuDate(weekStart)} a ${formatMenuDate(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 4))}`
    : "Carregando semana…";

  return (
    <section className="student-dashboard" aria-labelledby="student-title">
      <div className="student-dashboard-heading">
        <div>
          <p className="section-kicker">ÁREA DO ALUNO</p>
          <h1 id="student-title" className="auth-title">Olá, <span>{session.name}</span>!</h1>
          <p className="intro-description">Confira as refeições da semana e conte como foi sua experiência.</p>
        </div>
        <button className="student-logout" type="button" onClick={onLogout}>Sair da conta <span aria-hidden="true">↗</span></button>
      </div>

      <section className="student-menu-section" aria-labelledby="menu-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">CARDÁPIO ESCOLAR · {weekLabel}</p>
            <h2 id="menu-title">Sua semana à mesa</h2>
          </div>
          <p className="section-hint">Selecione uma refeição para avaliar</p>
        </div>

        <div className="student-menu-grid">
          {menuEntries.map((meal) => {
            const summary = getMealSummary(meal.id, meal.dateKey);
            const isSelected = selectedMeal?.key === meal.key;
            return (
              <button
                className={`student-menu-card${isSelected ? " is-selected" : ""}${meal.dateKey === todayKey ? " is-today" : ""}`}
                key={meal.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => { setSelectedMealKey(meal.key); setNotice(null); }}
              >
                <span className="menu-card-topline">
                  <span>{meal.weekday}</span>
                  <span>{formatMenuDate(meal.date)}</span>
                </span>
                <strong>{meal.name}</strong>
                <span className="menu-meal-description">{meal.description}</span>
                <span className="menu-rating-summary">
                  {summary.average === null
                    ? "Ainda sem avaliações"
                    : `★ ${summary.average.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · ${summary.count} ${summary.count === 1 ? "avaliação" : "avaliações"}`}
                </span>
              </button>
            );
          })}
        </div>
        <p className="menu-demo-note" role={menuState.error ? "alert" : undefined}>
          {menuState.error ?? (menuState.menu
            ? "Cardápio publicado pela Nutricionista. As informações são compartilhadas somente neste navegador."
            : "Cardápio de exemplo para demonstração. As avaliações são salvas somente neste navegador.")}
        </p>
      </section>

      <section className="student-feedback-panel" aria-labelledby="feedback-title">
        <div className="feedback-panel-heading">
          <p className="section-kicker">SUA VOZ FAZ DIFERENÇA</p>
          <h2 id="feedback-title">Avalie a refeição</h2>
          <p className="feedback-selected-meal">
            {selectedMeal
              ? `${selectedMeal.weekday}, ${formatMenuDate(selectedMeal.date)} · ${selectedMeal.name}`
              : "Preparando o formulário…"}
          </p>
        </div>

        <form className="student-feedback-form" onSubmit={handleFeedbackSubmit}>
          <fieldset className="rating-fieldset">
            <legend>Qual nota você dá para esta refeição? <span aria-hidden="true">*</span></legend>
            <div className="rating-options">
              {[1, 2, 3, 4, 5].map((value) => (
                <label className={`rating-option${rating === String(value) ? " is-selected" : ""}`} key={value}>
                  <input
                    type="radio"
                    name="rating"
                    value={value}
                    aria-label={`${value} ${value === 1 ? "estrela" : "estrelas"}`}
                    required
                    checked={rating === String(value)}
                    onChange={(event) => setRating(event.target.value)}
                  />
                  <span aria-hidden="true">{value}</span>
                </label>
              ))}
            </div>
            <span className="field-help">1 = não gostei · 5 = gostei muito</span>
          </fieldset>

          <label className="form-field" htmlFor="meal-comment">
            <span>Comentário ou sugestão <span className="field-help">(opcional)</span></span>
            <textarea
              id="meal-comment"
              name="comment"
              rows={4}
              maxLength={500}
              placeholder="O que você achou? Tem alguma sugestão?"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <span className="field-help comment-count">{comment.length}/500 caracteres</span>
          </label>

          <button className="submit-button" type="submit" disabled={!selectedMeal}>
            Enviar avaliação <span aria-hidden="true">↗</span>
          </button>
          {(notice || feedbackState.error) && (
            <p
              className={`form-notice ${notice?.kind ?? "error"}`}
              role={notice?.kind === "error" || feedbackState.error ? "alert" : "status"}
              aria-live="polite"
            >
              {notice?.text ?? feedbackState.error}
            </p>
          )}
        </form>
        <p className="privacy-note">Demonstração local: sua avaliação fica no armazenamento deste navegador e não oferece segurança ou envio para a escola.</p>
      </section>

    </section>
  );
}

function createMenuDraft(): MenuItem[] {
  return weeklyMenu.map((meal) => ({
    ...meal,
    nutrition: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 },
  }));
}

function NutritionistDashboard({ session, onLogout }: { session: AppSession; onLogout: () => void }) {
  const feedbackSnapshot = useSyncExternalStore(subscribeToFeedback, getFeedbackSnapshot, getServerFeedbackSnapshot);
  const feedbackState = parseFeedbackSnapshot(feedbackSnapshot);
  const feedbacks = feedbackState.feedbacks ?? [];
  const menuSnapshot = useSyncExternalStore(subscribeToMenu, getMenuSnapshot, getServerMenuSnapshot);
  const menuState = parseMenuSnapshot(menuSnapshot);
  const pantrySnapshot = useSyncExternalStore(subscribeToPantry, getPantrySnapshot, getServerPantrySnapshot);
  const pantryState = parsePantrySnapshot(pantrySnapshot);
  const clientReady = useSyncExternalStore(subscribeToClientReady, getClientReadySnapshot, getServerClientReadySnapshot);
  const [draftMenu, setDraftMenu] = useState<MenuItem[]>(() => menuState.menu ?? createMenuDraft());
  const [menuNotice, setMenuNotice] = useState<Notice | null>(null);
  const [pantryNotice, setPantryNotice] = useState<Notice | null>(null);
  const [pantryName, setPantryName] = useState("");
  const [pantryQuantity, setPantryQuantity] = useState("");
  const [pantryUnit, setPantryUnit] = useState("kg");
  const [pantryMonth, setPantryMonth] = useState("");
  const [pantryRating, setPantryRating] = useState("3");
  const [pantryStatus, setPantryStatus] = useState<PantryAssessment["status"]>("adequado");
  const [pantryNotes, setPantryNotes] = useState("");
  const [editingPantryId, setEditingPantryId] = useState<string | null>(null);
  const currentMonth = clientReady
    ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
    : "";
  const selectedMonth = pantryMonth || currentMonth;
  const monthlyAssessments = (pantryState.assessments ?? [])
    .filter((assessment) => assessment.month === selectedMonth)
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
  const averageRating = feedbacks.length
    ? feedbacks.reduce((total, feedback) => total + feedback.rating, 0) / feedbacks.length
    : null;
  const recentFeedbacks = [...feedbacks].sort((first, second) => second.submittedAt.localeCompare(first.submittedAt)).slice(0, 8);

  function updateMenuItem(index: number, field: "name" | "description", value: string) {
    setDraftMenu((current) => current.map((meal, mealIndex) =>
      mealIndex === index ? { ...meal, [field]: value } : meal,
    ));
  }

  function updateNutrition(index: number, field: keyof NutritionValues, value: string) {
    const amount = value === "" ? 0 : Number(value);
    setDraftMenu((current) => current.map((meal, mealIndex) =>
      mealIndex === index
        ? { ...meal, nutrition: { ...createMenuDraft()[index].nutrition!, ...meal.nutrition, [field]: amount } }
        : meal,
    ));
  }

  function handleMenuPublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMenuNotice(null);
    if (session.role !== "Nutricionista") {
      setMenuNotice({ kind: "error", text: "Apenas a nutricionista pode publicar o cardápio." });
      onLogout();
      return;
    }
    const storedMenu = parseMenuSnapshot(getMenuSnapshot());
    if (storedMenu.error) {
      setMenuNotice({ kind: "error", text: storedMenu.error });
      return;
    }
    if (draftMenu.some((meal) => !meal.name.trim() || !meal.description.trim())) {
      setMenuNotice({ kind: "error", text: "Preencha o nome e a descrição das cinco refeições antes de publicar." });
      return;
    }
    if (draftMenu.some((meal) => !isNutritionValues(meal.nutrition))) {
      setMenuNotice({ kind: "error", text: "Revise os valores nutricionais: use apenas números iguais ou maiores que zero." });
      return;
    }

    try {
      window.localStorage.setItem(menuStorageKey, JSON.stringify({
        version: 1,
        publishedAt: new Date().toISOString(),
        items: draftMenu.map((meal) => ({ ...meal, name: meal.name.trim(), description: meal.description.trim() })),
      }));
      window.dispatchEvent(new Event(menuChangeEvent));
      setMenuNotice({ kind: "success", text: "Cardápio publicado neste navegador e disponível para os alunos." });
    } catch {
      setMenuNotice({ kind: "error", text: "Não foi possível publicar. Verifique o espaço e as permissões do armazenamento local." });
    }
  }

  function handleMenuDelete() {
    if (session.role !== "Nutricionista") return;
    if (!window.confirm("Remover a publicação atual? Os alunos voltarão a ver o cardápio de demonstração. Esta ação não apaga os feedbacks.")) return;
    try {
      window.localStorage.removeItem(menuStorageKey);
      window.dispatchEvent(new Event(menuChangeEvent));
      setDraftMenu(createMenuDraft());
      setMenuNotice({ kind: "success", text: "Publicação removida. O cardápio de demonstração voltou a ser exibido para os alunos." });
    } catch {
      setMenuNotice({ kind: "error", text: "Não foi possível remover a publicação neste navegador." });
    }
  }

  function handlePantrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPantryNotice(null);
    if (session.role !== "Nutricionista") {
      setPantryNotice({ kind: "error", text: "Apenas a nutricionista pode registrar avaliações de mantimentos." });
      onLogout();
      return;
    }
    const storedPantry = parsePantrySnapshot(getPantrySnapshot());
    if (!storedPantry.assessments) {
      setPantryNotice({ kind: "error", text: storedPantry.error ?? "Não foi possível ler as avaliações salvas." });
      return;
    }

    const assessment: PantryAssessment = {
      id: editingPantryId ?? createFeedbackId(),
      name: pantryName.trim(),
      quantity: Number(pantryQuantity),
      unit: pantryUnit,
      month: selectedMonth,
      rating: Number(pantryRating),
      status: pantryStatus,
      notes: pantryNotes.trim(),
      updatedAt: new Date().toISOString(),
    };
    if (!isPantryAssessment(assessment) || !assessment.name || !Number.isFinite(assessment.quantity)) {
      setPantryNotice({ kind: "error", text: "Confira o ingrediente, a quantidade, o mês e a avaliação informados." });
      return;
    }

    try {
      const nextAssessments = editingPantryId
        ? storedPantry.assessments.map((item) => item.id === editingPantryId ? assessment : item)
        : [...storedPantry.assessments, assessment];
      window.localStorage.setItem(pantryStorageKey, JSON.stringify({ version: 1, assessments: nextAssessments }));
      window.dispatchEvent(new Event(pantryChangeEvent));
      setPantryName("");
      setPantryQuantity("");
      setPantryNotes("");
      setEditingPantryId(null);
      setPantryNotice({ kind: "success", text: editingPantryId ? "Avaliação do mantimento atualizada." : "Avaliação mensal do mantimento salva." });
    } catch {
      setPantryNotice({ kind: "error", text: "Não foi possível salvar. Verifique o espaço e as permissões do armazenamento local." });
    }
  }

  function beginEditPantry(assessment: PantryAssessment) {
    if (session.role !== "Nutricionista") return;
    setEditingPantryId(assessment.id);
    setPantryName(assessment.name);
    setPantryQuantity(String(assessment.quantity));
    setPantryUnit(assessment.unit);
    setPantryMonth(assessment.month);
    setPantryRating(String(assessment.rating));
    setPantryStatus(assessment.status);
    setPantryNotes(assessment.notes);
    setPantryNotice({ kind: "success", text: "Editando registro. Salve o formulário para confirmar as alterações." });
    document.getElementById("pantry-name")?.focus();
  }

  function deletePantryAssessment(id: string) {
    if (session.role !== "Nutricionista") return;
    const storedPantry = parsePantrySnapshot(getPantrySnapshot());
    if (!storedPantry.assessments) {
      setPantryNotice({ kind: "error", text: storedPantry.error ?? "Não foi possível ler os registros." });
      return;
    }
    if (!window.confirm("Excluir esta avaliação de mantimento? Esta ação não pode ser desfeita.")) return;
    try {
      window.localStorage.setItem(pantryStorageKey, JSON.stringify({ version: 1, assessments: storedPantry.assessments.filter((item) => item.id !== id) }));
      window.dispatchEvent(new Event(pantryChangeEvent));
      if (editingPantryId === id) {
        setEditingPantryId(null); setPantryName(""); setPantryQuantity(""); setPantryNotes("");
      }
      setPantryNotice({ kind: "success", text: "Avaliação excluída." });
    } catch {
      setPantryNotice({ kind: "error", text: "Não foi possível excluir a avaliação neste navegador." });
    }
  }

  return (
    <section className="nutrition-dashboard" aria-labelledby="nutrition-title">
      <div className="student-dashboard-heading">
        <div>
          <p className="section-kicker">ESPAÇO DA NUTRICIONISTA</p>
          <h1 id="nutrition-title" className="auth-title">Olá, <span>{session.name}</span>!</h1>
          <p className="intro-description">Planeje refeições, acompanhe a despensa e escute a comunidade escolar.</p>
        </div>
        <button className="student-logout" type="button" onClick={onLogout}>Sair da conta <span aria-hidden="true">↗</span></button>
      </div>

      <section className="nutrition-metrics" aria-label="Resumo dos feedbacks dos alunos">
        <article className="nutrition-metric"><span>AVALIAÇÕES RECEBIDAS</span><strong>{feedbacks.length}</strong><small>registros neste navegador</small></article>
        <article className="nutrition-metric"><span>MÉDIA DAS REFEIÇÕES</span><strong>{averageRating === null ? "—" : averageRating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong><small>{averageRating === null ? "aguardando avaliações" : "de 5 pontos"}</small></article>
        <article className="nutrition-metric"><span>MANTIMENTOS AVALIADOS</span><strong>{monthlyAssessments.length}</strong><small>{selectedMonth || "mês atual"}</small></article>
      </section>

      <section className="nutrition-panel menu-editor-panel" aria-labelledby="nutrition-menu-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">PLANEJAMENTO SEMANAL</p>
            <h2 id="nutrition-menu-title">Cardápio e tabela nutricional</h2>
          </div>
          <span className="section-hint">Por porção · valores estimados</span>
        </div>
        {menuState.error && <p className="form-notice error" role="alert">{menuState.error}</p>}
        <div className="nutrition-table-scroll" role="region" aria-label="Tabela nutricional semanal" tabIndex={0}>
          <table className="nutrition-table">
            <caption>Resumo nutricional estimado por porção</caption>
            <thead><tr><th scope="col">Dia / refeição</th><th scope="col">Energia</th><th scope="col">Proteínas</th><th scope="col">Carboidratos</th><th scope="col">Gorduras</th><th scope="col">Fibras</th></tr></thead>
            <tbody>
              {draftMenu.map((meal) => (
                <tr key={meal.id}>
                  <th scope="row"><strong>{meal.weekday}</strong><span>{meal.name}</span></th>
                  <td>{(meal.nutrition?.calories ?? 0).toLocaleString("pt-BR")} kcal</td>
                  <td>{(meal.nutrition?.protein ?? 0).toLocaleString("pt-BR")} g</td>
                  <td>{(meal.nutrition?.carbohydrates ?? 0).toLocaleString("pt-BR")} g</td>
                  <td>{(meal.nutrition?.fat ?? 0).toLocaleString("pt-BR")} g</td>
                  <td>{(meal.nutrition?.fiber ?? 0).toLocaleString("pt-BR")} g</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><th scope="row">Média diária</th>{(["calories", "protein", "carbohydrates", "fat", "fiber"] as const).map((field) => {
              const average = draftMenu.reduce((total, meal) => total + (meal.nutrition?.[field] ?? 0), 0) / draftMenu.length;
              return <td key={field}>{average.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{field === "calories" ? " kcal" : " g"}</td>;
            })}</tr></tfoot>
          </table>
        </div>
        <form className="nutrition-menu-form" onSubmit={handleMenuPublish}>
          <div className="nutrition-meal-list">
            {draftMenu.map((meal, index) => (
              <fieldset className="nutrition-meal" key={meal.id}>
                <legend>{meal.weekday}</legend>
                <label className="form-field" htmlFor={`nutrition-meal-name-${meal.id}`}>
                  <span>Refeição</span>
                  <input id={`nutrition-meal-name-${meal.id}`} value={meal.name} maxLength={100} onChange={(event) => updateMenuItem(index, "name", event.target.value)} required />
                </label>
                <label className="form-field" htmlFor={`nutrition-meal-description-${meal.id}`}>
                  <span>Descrição / acompanhamentos</span>
                  <input id={`nutrition-meal-description-${meal.id}`} value={meal.description} maxLength={180} onChange={(event) => updateMenuItem(index, "description", event.target.value)} required />
                </label>
                <div className="nutrition-input-grid">
                  {([
                    ["calories", "Energia", "kcal"],
                    ["protein", "Proteínas", "g"],
                    ["carbohydrates", "Carboidratos", "g"],
                    ["fat", "Gorduras", "g"],
                    ["fiber", "Fibras", "g"],
                  ] as const).map(([field, label, unit]) => (
                    <label className="form-field" htmlFor={`nutrition-${field}-${meal.id}`} key={field}>
                      <span>{label} <small>({unit})</small></span>
                      <input
                        id={`nutrition-${field}-${meal.id}`}
                        type="number"
                        min="0"
                        max={field === "calories" ? 5000 : 500}
                        step="0.1"
                        value={meal.nutrition?.[field] ?? 0}
                        onChange={(event) => updateNutrition(index, field, event.target.value)}
                        required
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="nutrition-publish-row">
            <p className="field-help">A publicação substitui o cardápio atual deste navegador e aparece na área do aluno.</p>
            <div className="menu-action-buttons"><button className="submit-button" type="submit">Publicar cardápio <span aria-hidden="true">↗</span></button>{menuState.menu && <button className="secondary-action" type="button" onClick={handleMenuDelete}>Remover publicação</button>}</div>
          </div>
          {menuNotice && <p className={`form-notice ${menuNotice.kind}`} role={menuNotice.kind === "error" ? "alert" : "status"}>{menuNotice.text}</p>}
        </form>
      </section>

      <section className="nutrition-panel pantry-panel" aria-labelledby="pantry-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">CONTROLE MENSAL</p>
            <h2 id="pantry-title">Avaliação de mantimentos</h2>
          </div>
          <label className="form-field month-field" htmlFor="pantry-month">
            <span>Mês da avaliação</span>
            <input id="pantry-month" type="month" value={selectedMonth} onChange={(event) => setPantryMonth(event.target.value)} required />
          </label>
        </div>
        <form className="pantry-form" onSubmit={handlePantrySubmit}>
          <label className="form-field" htmlFor="pantry-name"><span>Mantimento</span><input id="pantry-name" value={pantryName} maxLength={80} onChange={(event) => setPantryName(event.target.value)} placeholder="Ex.: feijão carioca" required /></label>
          <label className="form-field" htmlFor="pantry-quantity"><span>Quantidade disponível</span><input id="pantry-quantity" type="number" min="0" step="0.1" value={pantryQuantity} onChange={(event) => setPantryQuantity(event.target.value)} required /></label>
          <label className="form-field" htmlFor="pantry-unit"><span>Unidade</span><select id="pantry-unit" value={pantryUnit} onChange={(event) => setPantryUnit(event.target.value)}><option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="unidades">unidades</option><option value="caixas">caixas</option></select></label>
          <label className="form-field" htmlFor="pantry-rating"><span>Avaliação (1 a 5)</span><select id="pantry-rating" value={pantryRating} onChange={(event) => setPantryRating(event.target.value)}>{[1, 2, 3, 4, 5].map((value) => <option value={value} key={value}>{value} {value === 1 ? "estrela" : "estrelas"}</option>)}</select></label>
          <label className="form-field" htmlFor="pantry-status"><span>Status</span><select id="pantry-status" value={pantryStatus} onChange={(event) => setPantryStatus(event.target.value as PantryAssessment["status"])}><option value="adequado">Adequado</option><option value="atencao">Atenção</option><option value="indisponivel">Indisponível</option></select></label>
          <label className="form-field pantry-notes-field" htmlFor="pantry-notes"><span>Observações <small>(opcional)</small></span><input id="pantry-notes" value={pantryNotes} maxLength={180} onChange={(event) => setPantryNotes(event.target.value)} placeholder="Validade, qualidade ou reposição necessária" /></label>
          <button className="submit-button pantry-submit" type="submit">{editingPantryId ? "Atualizar avaliação" : "Salvar avaliação"} <span aria-hidden="true">↗</span></button>{editingPantryId && <button className="secondary-action" type="button" onClick={() => { setEditingPantryId(null); setPantryName(""); setPantryQuantity(""); setPantryNotes(""); setPantryNotice(null); }}>Cancelar edição</button>}
        </form>
        {pantryNotice && <p className={`form-notice ${pantryNotice.kind}`} role={pantryNotice.kind === "error" ? "alert" : "status"}>{pantryNotice.text}</p>}
        {pantryState.error ? <p className="form-notice error" role="alert">{pantryState.error}</p> : monthlyAssessments.length ? (
          <ul className="pantry-list">
            {monthlyAssessments.map((assessment) => (
              <li className="pantry-item" key={assessment.id}>
                <div><strong>{assessment.name}</strong><span>{assessment.quantity.toLocaleString("pt-BR")} {assessment.unit} · avaliação {assessment.rating}/5</span>{assessment.notes && <small>{assessment.notes}</small>}</div>
                <div className="pantry-item-actions"><span className={`pantry-status status-${assessment.status}`}>{assessment.status === "atencao" ? "Atenção" : assessment.status === "indisponivel" ? "Indisponível" : "Adequado"}</span><button className="text-action" type="button" onClick={() => beginEditPantry(assessment)}>Editar</button><button className="text-action danger-action" type="button" onClick={() => deletePantryAssessment(assessment.id)}>Excluir</button></div>
              </li>
            ))}
          </ul>
        ) : <p className="nutrition-empty">Nenhum mantimento avaliado em {selectedMonth || "este mês"}. Use o formulário para registrar a primeira avaliação.</p>}
      </section>

      <section className="nutrition-panel feedback-list-panel" aria-labelledby="nutrition-feedback-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">ESCUTA DOS ESTUDANTES</p>
            <h2 id="nutrition-feedback-title">Feedback das refeições</h2>
          </div>
          <span className="section-hint">{feedbacks.length} {feedbacks.length === 1 ? "avaliação" : "avaliações"} no total</span>
        </div>
        {feedbackState.error ? <p className="form-notice error" role="alert">{feedbackState.error}</p> : recentFeedbacks.length ? (
          <ul className="nutrition-feedback-list">
            {recentFeedbacks.map((feedback) => (
              <li className="nutrition-feedback-item" key={feedback.id}>
                <div className="nutrition-feedback-topline"><strong>{feedback.mealName}</strong><span aria-label={`Nota ${feedback.rating} de 5`}>★ {feedback.rating}/5</span></div>
                <p>{feedback.comment || "Sem comentário adicional."}</p>
                <small>{new Date(`${feedback.mealDate}T12:00:00`).toLocaleDateString("pt-BR")} · enviado {new Date(feedback.submittedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</small>
              </li>
            ))}
          </ul>
        ) : <p className="nutrition-empty">Ainda não há feedbacks. As avaliações enviadas pelos alunos aparecerão aqui.</p>}
      </section>

      <p className="privacy-note nutrition-privacy">Demonstração local: cardápios, avaliações e feedbacks ficam somente neste navegador. O armazenamento local não oferece segurança real nem sincroniza com outros dispositivos.</p>
    </section>
  );
}

function ManagerDashboard({ session, onLogout }: { session: AppSession; onLogout: () => void }) {
  const feedbackSnapshot = useSyncExternalStore(subscribeToFeedback, getFeedbackSnapshot, getServerFeedbackSnapshot);
  const feedbackState = parseFeedbackSnapshot(feedbackSnapshot);
  const feedbacks = feedbackState.feedbacks ?? [];
  const menuSnapshot = useSyncExternalStore(subscribeToMenu, getMenuSnapshot, getServerMenuSnapshot);
  const menuState = parseMenuSnapshot(menuSnapshot);
  const pantrySnapshot = useSyncExternalStore(subscribeToPantry, getPantrySnapshot, getServerPantrySnapshot);
  const pantryState = parsePantrySnapshot(pantrySnapshot);
  const average = feedbacks.length ? feedbacks.reduce((sum, item) => sum + item.rating, 0) / feedbacks.length : null;
  const needsAttention = (pantryState.assessments ?? []).filter((item) => item.status !== "adequado").length;
  const sortedFeedbacks = [...feedbacks].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const [notice, setNotice] = useState<Notice | null>(null);

  function deleteFeedback(id: string) {
    if (session.role !== "Gestor") return;
    const stored = readMealFeedback();
    if (!stored.feedbacks) { setNotice({ kind: "error", text: stored.error ?? "Não foi possível ler os feedbacks." }); return; }
    if (!window.confirm("Excluir este feedback? Esta ação não pode ser desfeita.")) return;
    try {
      window.localStorage.setItem(feedbackStorageKey, JSON.stringify({ version: 1, feedbacks: stored.feedbacks.filter((item) => item.id !== id) }));
      window.dispatchEvent(new Event(feedbackChangeEvent));
      setNotice({ kind: "success", text: "Feedback excluído do armazenamento deste navegador." });
    } catch {
      setNotice({ kind: "error", text: "Não foi possível excluir o feedback." });
    }
  }

  return (
    <section className="nutrition-dashboard manager-dashboard" aria-labelledby="manager-title">
      <div className="student-dashboard-heading">
        <div><p className="section-kicker">PAINEL DA GESTÃO</p><h1 id="manager-title" className="auth-title">Olá, <span>{session.name}</span>!</h1><p className="intro-description">Acompanhe os indicadores da participação estudantil e a situação dos mantimentos.</p></div>
        <button className="student-logout" type="button" onClick={onLogout}>Sair da conta <span aria-hidden="true">↗</span></button>
      </div>
      <section className="nutrition-metrics" aria-label="Indicadores de gestão">
        <article className="nutrition-metric"><span>FEEDBACKS REGISTRADOS</span><strong>{feedbacks.length}</strong><small>opiniões dos alunos</small></article>
        <article className="nutrition-metric"><span>MÉDIA DAS AVALIAÇÕES</span><strong>{average === null ? "—" : average.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong><small>{average === null ? "aguardando participação" : "de 5 pontos"}</small></article>
        <article className="nutrition-metric"><span>MANTIMENTOS CADASTRADOS</span><strong>{pantryState.assessments?.length ?? 0}</strong><small>{needsAttention} precisam de atenção</small></article>
      </section>
      <section className="nutrition-panel" aria-labelledby="manager-summary-title">
        <div className="section-heading"><div><p className="section-kicker">RESUMO OPERACIONAL</p><h2 id="manager-summary-title">Situação do cardápio e estoque</h2></div></div>
        <div className="manager-summary-grid">
          <article><span>Cardápio</span><strong>{menuState.menu ? "Publicado" : "Exemplo inicial"}</strong><p>{menuState.menu ? "Há um cardápio salvo neste navegador." : "A aplicação está exibindo as refeições de demonstração."}</p></article>
          <article><span>Estoque</span><strong>{needsAttention ? `${needsAttention} item(ns) em atenção` : "Sem alertas registrados"}</strong><p>Itens marcados como atenção ou indisponíveis pela nutricionista.</p></article>
          <article><span>Participação</span><strong>{feedbacks.length ? "Com respostas" : "Aguardando feedbacks"}</strong><p>As avaliações dos alunos são consolidadas neste navegador.</p></article>
        </div>
        {(feedbackState.error || menuState.error || pantryState.error) && <p className="form-notice error" role="alert">{feedbackState.error ?? menuState.error ?? pantryState.error}</p>}
      </section>
      <section className="nutrition-panel feedback-list-panel" aria-labelledby="manager-feedback-title">
        <div className="section-heading"><div><p className="section-kicker">RELATÓRIO DE PARTICIPAÇÃO</p><h2 id="manager-feedback-title">Feedbacks dos estudantes</h2></div><span className="section-hint">{feedbacks.length} registros</span></div>
        {notice && <p className={`form-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</p>}
        {sortedFeedbacks.length ? <ul className="nutrition-feedback-list">{sortedFeedbacks.map((feedback) => <li className="nutrition-feedback-item" key={feedback.id}>
          <div className="nutrition-feedback-topline"><strong>{feedback.mealName}</strong><span>★ {feedback.rating}/5</span></div>
          <p>{feedback.comment || "Sem comentário adicional."}</p>
          <small>{feedback.studentName} · {new Date(`${feedback.mealDate}T12:00:00`).toLocaleDateString("pt-BR")} · {new Date(feedback.submittedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</small>
          <div className="manager-feedback-actions"><button className="text-action danger-action" type="button" onClick={() => deleteFeedback(feedback.id)}>Excluir registro</button></div>
        </li>)}</ul> : <p className="nutrition-empty">Ainda não existem feedbacks registrados neste navegador.</p>}
      </section>
      <section className="nutrition-panel" aria-labelledby="manager-pantry-title"><div className="section-heading"><div><p className="section-kicker">CONTROLE DE MANTIMENTOS</p><h2 id="manager-pantry-title">Resumo do estoque</h2></div></div>
        {(pantryState.assessments ?? []).length ? <div className="nutrition-table-scroll"><table className="nutrition-table"><thead><tr><th>Mantimento</th><th>Quantidade</th><th>Avaliação</th><th>Status</th><th>Atualizado em</th></tr></thead><tbody>{[...(pantryState.assessments ?? [])].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map((item)=><tr key={item.id}><th scope="row">{item.name}</th><td>{item.quantity.toLocaleString("pt-BR")} {item.unit}</td><td>{item.rating}/5</td><td>{item.status === "adequado" ? "Adequado" : item.status === "atencao" ? "Atenção" : "Indisponível"}</td><td>{new Date(item.updatedAt).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div> : <p className="nutrition-empty">A nutricionista ainda não registrou avaliações de mantimentos.</p>}
      </section>
      <p className="privacy-note nutrition-privacy">Os relatórios refletem somente os dados armazenados neste navegador. Como o projeto não possui servidor, os dados não são compartilhados entre dispositivos e o controle de acesso é apenas client-side.</p>
    </section>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("profiles");
  const [selectedProfile, setSelectedProfile] = useState<ProfileName | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [sessionOverride, setSessionOverride] = useState<AppSession | null | undefined>(undefined);
  const storedSession = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot);
  const session = sessionOverride === undefined ? parseSessionSnapshot(storedSession) : sessionOverride;
  const visibleScreen = session ? "welcome" : screen;
  const [matricula, setMatricula] = useState("");
  const [nome, setNome] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetCredentials() {
    setMatricula("");
    setNome("");
    setPassword("");
    setNotice(null);
  }

  function chooseProfile(profile: ProfileName) {
    resetCredentials();
    setSelectedProfile(profile);
    setAuthMode("login");
    setScreen("auth");
  }

  function returnToProfiles() {
    resetCredentials();
    setSelectedProfile(null);
    setScreen("profiles");
  }

  function startSession(nextSession: AppSession) {
    // Validação client-side de formato e perfil antes de persistir a sessão.
    const validStudentSession = nextSession.role === "Aluno"
      && typeof nextSession.name === "string"
      && nextSession.name.trim().length > 0
      && typeof nextSession.matricula === "number"
      && Number.isSafeInteger(nextSession.matricula)
      && nextSession.matricula > 0;
    const validStaffSession = (nextSession.role === "Gestor" || nextSession.role === "Nutricionista")
      && typeof nextSession.name === "string" && nextSession.name.trim().length > 0
      && nextSession.matricula === undefined;

    if (!validStudentSession && !validStaffSession) {
      setNotice({ kind: "error", text: "Não foi possível iniciar a sessão: perfil ou identificação inválidos. Entre novamente." });
      setSessionOverride(null);
      return;
    }

    try {
      window.localStorage.setItem(
        sessionStorageKey,
        JSON.stringify({ version: 1, ...nextSession }),
      );
      setSessionOverride(nextSession);
      window.dispatchEvent(new Event(sessionChangeEvent));
      setNotice(null);
      setScreen("welcome");
    } catch {
      setNotice({
        kind: "error",
        text: "Não foi possível salvar a sessão neste navegador. Verifique as permissões de armazenamento e tente novamente.",
      });
    }
  }

  function logout() {
    let logoutNotice: Notice | null = null;
    try {
      window.localStorage.removeItem(sessionStorageKey);
    } catch {
      logoutNotice = {
        kind: "error",
        text: "A sessão não pôde ser removida do armazenamento local. Feche o navegador para encerrar esta demonstração.",
      };
    }

    // Limpa somente dados temporários da interface; contas, cardápio, mantimentos e feedbacks permanecem salvos.
    resetCredentials();
    setIsSubmitting(false);
    setSessionOverride(null);
    window.dispatchEvent(new Event(sessionChangeEvent));
    setSelectedProfile(null);
    setAuthMode("login");
    setScreen("profiles");
    setNotice(logoutNotice);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProfile) return;

    setNotice(null);
    setIsSubmitting(true);

    try {
      if (selectedProfile !== "Aluno") {
        const staffStore = readStaffAccounts();
        if (!staffStore.accounts) {
          setNotice({ kind: "error", text: staffStore.error ?? "Não foi possível ler os cadastros da equipe." });
          return;
        }
        const identification = matricula.trim().toLocaleLowerCase("pt-BR");
        if (identification.length < 3) {
          setNotice({ kind: "error", text: "A identificação deve ter pelo menos 3 caracteres." });
          return;
        }

        if (authMode === "register") {
          const trimmedName = nome.trim();
          if (!trimmedName) {
            setNotice({ kind: "error", text: "Informe seu nome completo para concluir o cadastro." });
            return;
          }
          if (password.length < 8) {
            setNotice({ kind: "error", text: "Crie uma senha com pelo menos 8 caracteres." });
            return;
          }
          if (staffStore.accounts.some((account) => account.role === selectedProfile && account.identificacao.toLocaleLowerCase("pt-BR") === identification)) {
            setNotice({ kind: "error", text: "Já existe um cadastro desse perfil com esta identificação." });
            return;
          }
          const salt = createSalt();
          const passwordDigest = salt ? await hashPassword(password, salt) : null;
          if (!salt || !passwordDigest) {
            setNotice({ kind: "error", text: "Este navegador não oferece a criptografia necessária. Tente usar localhost." });
            return;
          }
          const newAccount: StaffAccount = { identificacao: matricula.trim(), role: selectedProfile, nome: trimmedName, salt, passwordDigest };
          try {
            window.localStorage.setItem(staffAccountsStorageKey, JSON.stringify({ version: 1, accounts: [...staffStore.accounts, newAccount] }));
          } catch {
            setNotice({ kind: "error", text: "Não foi possível salvar o cadastro da equipe neste navegador." });
            return;
          }
          setAuthMode("login");
          setPassword("");
          setNome("");
          setNotice({ kind: "success", text: "Cadastro da equipe concluído neste navegador. Agora entre com sua identificação e senha." });
          return;
        }

        const account = staffStore.accounts.find((entry) => entry.role === selectedProfile && entry.identificacao.toLocaleLowerCase("pt-BR") === identification);
        const passwordDigest = account ? await hashPassword(password, account.salt) : null;
        if (!account || !passwordDigest || passwordDigest !== account.passwordDigest) {
          setNotice({ kind: "error", text: "Identificação ou senha incorreta para este perfil." });
          return;
        }
        startSession({ role: selectedProfile, name: account.nome });
        return;
      }

      if (!/^\d+$/.test(matricula.trim())) {
        setNotice({ kind: "error", text: "Informe uma matrícula composta apenas por números." });
        return;
      }

      const numericMatricula = Number(matricula.trim());
      if (!Number.isSafeInteger(numericMatricula) || numericMatricula <= 0) {
        setNotice({ kind: "error", text: "Informe uma matrícula numérica válida." });
        return;
      }

      const storedAccounts = readStudentAccounts();
      if (!storedAccounts.accounts) {
        setNotice({ kind: "error", text: storedAccounts.error ?? "Não foi possível ler os cadastros locais." });
        return;
      }

      if (authMode === "register") {
        const trimmedName = nome.trim();
        if (!trimmedName) {
          setNotice({ kind: "error", text: "Informe seu nome para concluir o cadastro." });
          return;
        }
        if (password.length < 8) {
          setNotice({ kind: "error", text: "Crie uma senha com pelo menos 8 caracteres." });
          return;
        }
        if (storedAccounts.accounts.some((account) => account.matricula === numericMatricula)) {
          setNotice({ kind: "error", text: "Já existe um cadastro com esta matrícula. Entre com sua senha." });
          return;
        }

        const salt = createSalt();
        const passwordDigest = salt ? await hashPassword(password, salt) : null;
        if (!salt || !passwordDigest) {
          setNotice({
            kind: "error",
            text: "Este navegador não oferece a criptografia necessária. Acesse por uma conexão segura ou localhost e tente novamente.",
          });
          return;
        }

        const newAccount: StudentAccount = {
          matricula: numericMatricula,
          nome: trimmedName,
          salt,
          passwordDigest,
        };

        try {
          window.localStorage.setItem(
            accountsStorageKey,
            JSON.stringify({ version: 1, accounts: [...storedAccounts.accounts, newAccount] }),
          );
        } catch {
          setNotice({
            kind: "error",
            text: "Não foi possível salvar o cadastro neste navegador. Verifique o espaço e as permissões de armazenamento.",
          });
          return;
        }

        setAuthMode("login");
        setPassword("");
        setNotice({ kind: "success", text: "Cadastro concluído neste navegador. Agora entre com sua matrícula e senha." });
        return;
      }

      const account = storedAccounts.accounts.find((entry) => entry.matricula === numericMatricula);
      const passwordDigest = account ? await hashPassword(password, account.salt) : null;
      if (!account || !passwordDigest || passwordDigest !== account.passwordDigest) {
        setNotice({ kind: "error", text: "Matrícula ou senha incorreta. Confira os dados e tente novamente." });
        return;
      }

      startSession({ role: "Aluno", name: account.nome, matricula: account.matricula });
    } catch {
      setNotice({ kind: "error", text: "Não foi possível concluir a operação. Tente novamente neste navegador." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Cardápio Adaptável — início">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <path d="M7 18h18a9 9 0 0 1-18 0Zm9-3V7m0 0c-4 0-6-2-6-4 4 0 6 1 6 4Zm0 0c0-4 2-6 6-6 0 4-2 6-6 6Z" />
            </svg>
          </span>
          <span className="brand-name">cardápio<span>adaptável</span></span>
        </a>
        <nav className="header-actions" aria-label="Navegação principal"><a className="team-link" href="/equipe">Nossa equipe</a><ThemeToggle /><span className="header-note"><span className="status-dot" /> Alimentação escolar, feita em conjunto</span></nav>
      </header>

      <main id="inicio" className={`main-content${visibleScreen !== "profiles" ? " is-flow-screen" : ""}`}>
        {visibleScreen === "profiles" && (
          <>
        <section className="intro" aria-labelledby="page-title">
          <div className="intro-copy">
            <p className="eyebrow"><span /> PARTICIPAÇÃO QUE TRANSFORMA</p>
            <h1 id="page-title">Uma escola melhor começa <span>à mesa.</span></h1>
            <p className="intro-description">
              O cardápio fica melhor quando todo mundo participa. Escolha seu perfil para começar.
            </p>
            <a className="text-link" href="#perfis">
              Conheça seu espaço <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="table-art" aria-hidden="true">
            <div className="art-sun" />
            <div className="art-note note-one">mais escuta</div>
            <div className="art-note note-two">menos desperdício</div>
            <div className="plate">
              <div className="plate-inner">
                <span className="food food-leaf" />
                <span className="food food-carrot" />
                <span className="food food-grain" />
                <span className="food food-tomato" />
              </div>
            </div>
            <span className="art-spark spark-one">✳</span>
            <span className="art-spark spark-two">✳</span>
          </div>
        </section>

        <section className="profile-section" id="perfis" aria-labelledby="profiles-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">BEM-VINDO(A)</p>
              <h2 id="profiles-title">Como você quer participar?</h2>
            </div>
            <p className="section-hint">Selecione o perfil que combina com você</p>
          </div>

          <div className="profile-grid">
            {profiles.map((profile, index) => (
              <button
                className={`profile-card ${profile.tone}${selectedProfile === profile.name ? " is-selected" : ""}`}
                key={profile.name}
                type="button"
                aria-pressed={selectedProfile === profile.name}
                onClick={() => chooseProfile(profile.name as ProfileName)}
              >
                <span className="card-topline">
                  <span className="profile-icon">{profile.icon}</span>
                  <span className="card-number">0{index + 1}</span>
                </span>
                <span className="profile-name">{profile.name}</span>
                <span className="profile-description">{profile.description}</span>
                <span className="card-action">Escolher perfil <span aria-hidden="true">↗</span></span>
              </button>
            ))}
          </div>

          <p className="selection-message" role="status" aria-live="polite">
            {notice?.text ?? "Os acessos e cadastros desta demonstração ficam somente neste navegador."}
          </p>
        </section>
          </>
        )}

        {visibleScreen === "auth" && selectedProfile && (
          <section className="auth-panel" aria-labelledby="auth-title">
            <button className="back-link" type="button" onClick={returnToProfiles}>
              <span aria-hidden="true">←</span> Voltar aos perfis
            </button>

            <div className="auth-heading">
              <p className="section-kicker">ACESSO {selectedProfile.toUpperCase()}</p>
              <h1 id="auth-title" className="auth-title">
                {authMode === "register" ? "Seu espaço começa aqui." : "Que bom ter você de volta."}
              </h1>
              <p className="intro-description">
                {selectedProfile === "Aluno"
                  ? "Use sua matrícula para criar ou acessar sua conta."
                  : `Crie uma conta ou entre como ${selectedProfile.toLowerCase()} com sua própria identificação.`}
              </p>
            </div>

            {(selectedProfile === "Aluno" || selectedProfile === "Gestor" || selectedProfile === "Nutricionista") && (
              <div className="auth-tabs" aria-label="Opções de acesso">
                <button
                  className={authMode === "login" ? "auth-tab is-active" : "auth-tab"}
                  type="button"
                  aria-pressed={authMode === "login"}
                  onClick={() => { setAuthMode("login"); resetCredentials(); }}
                >
                  Entrar
                </button>
                <button
                  className={authMode === "register" ? "auth-tab is-active" : "auth-tab"}
                  type="button"
                  aria-pressed={authMode === "register"}
                  onClick={() => { setAuthMode("register"); resetCredentials(); }}
                >
                  Criar cadastro
                </button>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="form-field" htmlFor="matricula">
                <span>{selectedProfile === "Aluno" ? "Matrícula" : "Identificação de acesso"}</span>
                <input
                  id="matricula"
                  name="matricula"
                  type="text"
                  inputMode={selectedProfile === "Aluno" ? "numeric" : "text"}
                  pattern={selectedProfile === "Aluno" ? "[0-9]+" : undefined}
                  minLength={selectedProfile === "Aluno" ? undefined : 3}
                  maxLength={selectedProfile === "Aluno" ? undefined : 40}
                  autoComplete="username"
                  value={matricula}
                  onChange={(event) => setMatricula(event.target.value)}
                  required
                />
              </label>

              {authMode === "register" && (
                <label className="form-field" htmlFor="nome">
                  <span>Nome completo</span>
                  <input
                    id="nome"
                    name="nome"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    required
                  />
                </label>
              )}

              <label className="form-field" htmlFor="password">
                <span>Senha</span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  minLength={authMode === "register" ? 8 : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                {authMode === "register" && (
                  <span className="field-help">Use pelo menos 8 caracteres.</span>
                )}
              </label>

              <button className="submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Aguarde…" : authMode === "register" ? "Criar cadastro" : "Entrar"}
                <span aria-hidden="true">↗</span>
              </button>

              {notice && (
                <p className={`form-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
                  {notice.text}
                </p>
              )}
            </form>

            <p className="privacy-note">
Demonstração local: os cadastros ficam somente neste navegador. As senhas são armazenadas como resumo criptográfico, mas sem servidor não há segurança real nem verificação institucional de quem pode se cadastrar como gestor ou nutricionista.
            </p>
          </section>
        )}

        {visibleScreen === "welcome" && session && (
          session.role === "Aluno" ? (
            <StudentDashboard session={session} onLogout={logout} />
          ) : session.role === "Nutricionista" ? (
            <NutritionistDashboard session={session} onLogout={logout} />
          ) : (
            <ManagerDashboard session={session} onLogout={logout} />
          )
        )}

        <footer className="site-footer">
          <span>Feito para ouvir, cuidar e alimentar boas ideias.</span>
          <span><a className="footer-team-link" href="/equipe">Conheça a equipe</a> · Projeto escolar <span className="footer-heart" aria-label="com carinho">♥</span></span>
        </footer>
      </main>
    </div>
  );
}
