import React from "react";
import { diag } from "./diagnostics.js";
import { ReportProblem } from "./ReportProblem.jsx";
import { C } from "./constants.js";

/* Если интерфейс упал, вместо белого экрана показываем понятное сообщение и кнопку «Сообщить о проблеме». */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, report: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    const where = String(info?.componentStack || "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 3).join(" > ");
    diag.add("render", `${error?.message || error} | ${where}`);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: C.bg, color: C.ink, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 360, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Что-то пошло не так</div>
          <div style={{ fontSize: 14, color: C.inkMuted, marginBottom: 18 }}>
            Ваши данные в безопасности. Попробуйте перезагрузить приложение, а если ошибка повторится, сообщите нам: это поможет её исправить.
          </div>
          <button type="button" className="btn primary" style={{ width: "100%", marginBottom: 8 }} onClick={() => window.location.reload()}>Перезагрузить</button>
          <button type="button" className="btn" style={{ width: "100%" }} onClick={() => this.setState({ report: true })}>Сообщить о проблеме</button>
        </div>
        {this.state.report && <ReportProblem onClose={() => this.setState({ report: false })} />}
      </div>
    );
  }
}
