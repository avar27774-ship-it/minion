// AuthPage.jsx — Playerok-style refactor
// API сохранён 100%:
//   POST /api/auth/register/init
//   POST /api/auth/register/check  → botUsername
//   POST /api/auth/register/verify → token + user
//   POST /api/auth/login           → token + user
//   POST /api/auth/reset/request
//   POST /api/auth/reset/confirm
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useStore } from "../store";

const API = "/api";

const T = {
  bg:      "#0D0D0E",
  surface: "#1B1B1D",
  s2:      "#242426",
  border:  "rgba(255,255,255,0.07)",
  yellow:  "#FFD600",
  green:   "#39FF14",
  text:    "#FFFFFF",
  muted:   "rgba(255,255,255,0.38)",
  dim:     "rgba(255,255,255,0.6)",
  red:     "#FF4D4D",
};

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
function Input({ label, type = "text", value, onChange, placeholder, autoComplete, icon }) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const isPass = type === "password";

  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{ fontSize: 12, fontWeight: 600, color: T.dim, marginBottom: 6, letterSpacing: "0.02em" }}>
          {label}
        </div>
      )}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: focused ? T.s2 : T.surface,
        border: `1px solid ${focused ? T.yellow + "50" : T.border}`,
        borderRadius: 13, padding: "12px 14px",
        transition: "all 0.2s",
        boxShadow: focused ? `0 0 0 3px ${T.yellow}10` : "none",
      }}>
        {icon && <span style={{ fontSize: 16, opacity: 0.6 }}>{icon}</span>}
        <input
          type={isPass ? (show ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontSize: 15, color: T.text,
            fontFamily: "'Onest', system-ui, sans-serif",
          }}
        />
        {isPass && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 16, padding: 0 }}
          >
            {show ? "🙈" : "👁️"}
          </button>
        )}
      </div>
    </div>
  );
}

function PrimaryBtn({ children, onClick, loading, disabled, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        width: "100%", padding: "14px",
        background: loading || disabled ? "rgba(255,214,0,0.3)" : T.yellow,
        border: "none", borderRadius: 13,
        fontSize: 15, fontWeight: 800,
        color: loading || disabled ? "rgba(0,0,0,0.5)" : "#000",
        cursor: loading || disabled ? "not-allowed" : "pointer",
        fontFamily: "'Onest', system-ui, sans-serif",
        transition: "all 0.2s",
        boxShadow: loading || disabled ? "none" : `0 4px 20px ${T.yellow}45`,
        letterSpacing: "-0.2px",
        ...style,
      }}
    >
      {loading ? "⏳ Загрузка..." : children}
    </button>
  );
}

function SecondaryBtn({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", padding: "13px",
        background: "transparent",
        border: `1px solid ${T.border}`,
        borderRadius: 13, fontSize: 14, fontWeight: 600,
        color: T.dim, cursor: "pointer",
        fontFamily: "'Onest', system-ui, sans-serif",
        transition: "all 0.2s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function Steps({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: i === current ? 2 : 1,
          height: 3, borderRadius: 10,
          background: i <= current ? T.yellow : T.surface,
          transition: "all 0.4s",
          boxShadow: i === current ? `0 0 8px ${T.yellow}60` : "none",
        }} />
      ))}
    </div>
  );
}

// ─── LOGIN FORM ───────────────────────────────────────────────────────────────
function LoginForm({ onSwitch, onForgot }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useStore();
  const navigate = useNavigate();

  // POST /api/auth/login — без изменений
  const handleSubmit = async () => {
    if (!username.trim() || !password) return toast.error("Заполните все поля");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/login`, {
        username: username.trim().toLowerCase(),
        password,
      });
      login(data.user, data.token);
      toast.success("Добро пожаловать! 👋");
      navigate("/");
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: T.text, letterSpacing: "-0.6px", marginBottom: 6 }}>
          Добро пожаловать 👋
        </div>
        <div style={{ fontSize: 14, color: T.muted }}>
          Войдите в свой аккаунт Minions.Market
        </div>
      </div>

      <Input
        label="Логин"
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="your_username"
        autoComplete="username"
        icon="👤"
      />
      <Input
        label="Пароль"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
        icon="🔒"
      />

      <button onClick={onForgot} style={{
        background: "none", border: "none", cursor: "pointer",
        color: T.yellow, fontSize: 13, fontWeight: 600,
        padding: "0 0 18px", display: "block",
        fontFamily: "'Onest', system-ui, sans-serif",
      }}>
        Забыли пароль?
      </button>

      <PrimaryBtn onClick={handleSubmit} loading={loading}>
        Войти в аккаунт →
      </PrimaryBtn>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <span style={{ fontSize: 14, color: T.muted }}>Нет аккаунта? </span>
        <button onClick={onSwitch} style={{
          background: "none", border: "none", cursor: "pointer",
          color: T.yellow, fontSize: 14, fontWeight: 700,
          fontFamily: "'Onest', system-ui, sans-serif",
        }}>Зарегистрироваться</button>
      </div>
    </div>
  );
}

// ─── REGISTER FORM (3 шага) ───────────────────────────────────────────────────
function RegisterForm({ onSwitch }) {
  const [step, setStep]           = useState(0);
  const [username, setUsername]   = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [code, setCode]           = useState("");
  const [password, setPassword]   = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading]     = useState(false);
  const { login } = useStore();
  const navigate  = useNavigate();

  // Шаг 0: POST /api/auth/register/check → botUsername
  const handleCheck = async () => {
    if (!username.trim()) return toast.error("Введите логин");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/register/check`, {
        username: username.trim().toLowerCase(),
      });
      setBotUsername(data.botUsername);
      setStep(1);
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  // Шаг 2: POST /api/auth/register/verify → token + user
  const handleVerify = async () => {
    if (!code.trim()) return toast.error("Введите код");
    if (!password)    return toast.error("Введите пароль");
    if (password !== password2) return toast.error("Пароли не совпадают");
    if (password.length < 6)    return toast.error("Минимум 6 символов");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/register/verify`, {
        username: username.trim().toLowerCase(),
        code: code.trim(),
        password,
      });
      login(data.user, data.token);
      toast.success("Аккаунт создан! 🎉");
      navigate("/");
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка верификации");
    } finally {
      setLoading(false);
    }
  };

  const STEPS = ["Логин", "Telegram", "Пароль"];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: T.text, letterSpacing: "-0.6px", marginBottom: 6 }}>
          Новый аккаунт ✨
        </div>
        <div style={{ fontSize: 14, color: T.muted }}>
          Шаг {step + 1} из {STEPS.length} — {STEPS[step]}
        </div>
      </div>

      <Steps current={step} total={STEPS.length} />

      {/* ── Шаг 0: ввод логина ── */}
      {step === 0 && (
        <div>
          <Input
            label="Придумайте логин"
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="only_latin_0-9_"
            autoComplete="username"
            icon="✏️"
          />
          <div style={{
            background: `${T.yellow}0D`, border: `1px solid ${T.yellow}20`,
            borderRadius: 12, padding: "11px 13px", marginBottom: 18,
            fontSize: 12, color: T.dim, lineHeight: 1.6,
          }}>
            💡 Только латиница, цифры и _. От 3 до 24 символов.
          </div>
          <PrimaryBtn onClick={handleCheck} loading={loading}>
            Продолжить →
          </PrimaryBtn>
        </div>
      )}

      {/* ── Шаг 1: Telegram-бот ── */}
      {step === 1 && (
        <div>
          <div style={{
            background: "rgba(41,182,246,0.08)", border: "1px solid rgba(41,182,246,0.18)",
            borderRadius: 16, padding: "18px 16px", marginBottom: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🤖</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>
              Подтвердите через Telegram
            </div>
            <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.6, marginBottom: 14 }}>
              Напишите боту команду и получите код подтверждения:
            </div>
            <div style={{
              background: T.surface, borderRadius: 10, padding: "10px 14px",
              fontFamily: "monospace", fontSize: 14, color: T.yellow, marginBottom: 14,
            }}>
              /code {username}
            </div>
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 11,
                background: "#229ED9", color: "#fff",
                fontSize: 14, fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 16px rgba(34,158,217,0.4)",
              }}
            >
              ✈️ Открыть бота @{botUsername}
            </a>
          </div>
          <PrimaryBtn onClick={() => setStep(2)}>
            Я получил код →
          </PrimaryBtn>
          <SecondaryBtn onClick={() => setStep(0)} style={{ marginTop: 10 }}>
            ← Назад
          </SecondaryBtn>
        </div>
      )}

      {/* ── Шаг 2: код + пароль ── */}
      {step === 2 && (
        <div>
          <Input
            label="Код из Telegram"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            icon="🔑"
          />
          <Input
            label="Придумайте пароль"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Минимум 6 символов"
            autoComplete="new-password"
            icon="🔒"
          />
          <Input
            label="Повторите пароль"
            type="password"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            placeholder="Повторите пароль"
            autoComplete="new-password"
            icon="🔒"
          />

          {password && password2 && password !== password2 && (
            <div style={{ fontSize: 12, color: T.red, marginBottom: 12, marginTop: -8 }}>
              ❌ Пароли не совпадают
            </div>
          )}

          <PrimaryBtn onClick={handleVerify} loading={loading}>
            Создать аккаунт 🎉
          </PrimaryBtn>
          <SecondaryBtn onClick={() => setStep(1)} style={{ marginTop: 10 }}>
            ← Назад
          </SecondaryBtn>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <span style={{ fontSize: 14, color: T.muted }}>Уже есть аккаунт? </span>
        <button onClick={onSwitch} style={{
          background: "none", border: "none", cursor: "pointer",
          color: T.yellow, fontSize: 14, fontWeight: 700,
          fontFamily: "'Onest', system-ui, sans-serif",
        }}>Войти</button>
      </div>
    </div>
  );
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
function ForgotForm({ onBack }) {
  const [step, setStep]       = useState(0);
  const [username, setUsername] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [code, setCode]       = useState("");
  const [newPass, setNewPass]  = useState("");
  const [loading, setLoading]  = useState(false);

  // POST /api/auth/reset/request
  const handleRequest = async () => {
    if (!username.trim()) return toast.error("Введите логин");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/reset/request`, {
        username: username.trim().toLowerCase(),
      });
      setBotUsername(data.botUsername);
      setStep(1);
      toast.success("Если аккаунт найден — бот отправит код");
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  // POST /api/auth/reset/confirm
  const handleConfirm = async () => {
    if (!code.trim() || !newPass) return toast.error("Заполните все поля");
    if (newPass.length < 6) return toast.error("Минимум 6 символов");
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset/confirm`, {
        username: username.trim().toLowerCase(),
        code: code.trim(),
        newPassword: newPass,
      });
      toast.success("Пароль изменён! Войдите с новым паролем");
      onBack();
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: T.text, letterSpacing: "-0.6px", marginBottom: 6 }}>
          Сброс пароля 🔐
        </div>
        <div style={{ fontSize: 14, color: T.muted }}>
          {step === 0 ? "Введите логин — пришлём код в Telegram" : "Введите код и новый пароль"}
        </div>
      </div>

      <Steps current={step} total={2} />

      {step === 0 && (
        <div>
          <Input
            label="Ваш логин"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="your_username"
            icon="👤"
          />
          <PrimaryBtn onClick={handleRequest} loading={loading}>
            Получить код →
          </PrimaryBtn>
          <SecondaryBtn onClick={onBack} style={{ marginTop: 10 }}>
            ← Назад к входу
          </SecondaryBtn>
        </div>
      )}

      {step === 1 && (
        <div>
          {botUsername && (
            <div style={{
              background: "rgba(41,182,246,0.08)", border: "1px solid rgba(41,182,246,0.18)",
              borderRadius: 12, padding: "12px 14px", marginBottom: 16,
              fontSize: 13, color: T.dim, lineHeight: 1.5,
            }}>
              🤖 Бот <strong style={{ color: "#29B6F6" }}>@{botUsername}</strong> отправил код для сброса пароля.
            </div>
          )}
          <Input
            label="Код из Telegram"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            icon="🔑"
          />
          <Input
            label="Новый пароль"
            type="password"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            placeholder="Минимум 6 символов"
            icon="🔒"
          />
          <PrimaryBtn onClick={handleConfirm} loading={loading}>
            Сменить пароль ✓
          </PrimaryBtn>
          <SecondaryBtn onClick={() => setStep(0)} style={{ marginTop: 10 }}>
            ← Назад
          </SecondaryBtn>
        </div>
      )}
    </div>
  );
}

// ─── ROOT AuthPage ────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      <div style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex", flexDirection: "column",
        justifyContent: "center",
        padding: "24px 18px 40px",
        fontFamily: "'Onest', system-ui, sans-serif",
      }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32, animation: "fadeUp 0.4s ease both" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: `linear-gradient(135deg, ${T.yellow}, #FF8C00)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, fontWeight: 900, color: "#000",
            margin: "0 auto 14px",
            boxShadow: `0 8px 32px ${T.yellow}45`,
          }}>M</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: "-0.4px" }}>
            Minions<span style={{ color: T.yellow }}>.</span>Market
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            Маркетплейс цифровых товаров
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 22,
          padding: "26px 22px",
          animation: "fadeUp 0.4s 0.05s ease both",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}>
          {mode === "login"    && <LoginForm    onSwitch={() => setMode("register")} onForgot={() => setMode("forgot")} />}
          {mode === "register" && <RegisterForm onSwitch={() => setMode("login")} />}
          {mode === "forgot"   && <ForgotForm   onBack={() => setMode("login")} />}
        </div>

        {/* Legal */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: T.muted }}>
          Регистрируясь, вы принимаете{" "}
          <a href="/legal/rules" style={{ color: T.dim }}>правила</a>{" "}
          и{" "}
          <a href="/legal/offer" style={{ color: T.dim }}>оферту</a>
        </div>
      </div>
    </>
  );
}
