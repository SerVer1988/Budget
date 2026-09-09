
.font-display { font-family: "Space Grotesk", system-ui, sans-serif; }
.font-mono { font-family: "IBM Plex Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; }

button { -webkit-tap-highlight-color: transparent; }

.expense-screen {
  --expense-green: #123c0d;
  --expense-lime: #35dc22;
  position: relative;
  min-height: calc(100vh - 7.5rem);
  color: var(--expense-green);
  isolation: isolate;
}

.expense-screen::before,
.expense-screen::after {
  content: "";
  position: fixed;
  z-index: -1;
  width: 180px;
  height: 320px;
  opacity: .17;
  pointer-events: none;
  background:
    radial-gradient(ellipse 42px 18px at 30% 18%, #28a744 0 55%, transparent 58%),
    radial-gradient(ellipse 46px 19px at 63% 34%, #28a744 0 55%, transparent 58%),
    radial-gradient(ellipse 48px 20px at 25% 52%, #28a744 0 55%, transparent 58%),
    radial-gradient(ellipse 43px 18px at 65% 69%, #28a744 0 55%, transparent 58%),
    linear-gradient(74deg, transparent 48%, #258a3a 49% 51%, transparent 52%);
}

.expense-screen::before { left: -75px; top: 160px; transform: rotate(-20deg); }
.expense-screen::after { right: -88px; bottom: 25px; transform: rotate(18deg) scaleX(-1); }

.operation-switch {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 0 auto 34px;
  overflow: hidden;
  border: 1px solid #b5c7ae;
  border-radius: 17px;
