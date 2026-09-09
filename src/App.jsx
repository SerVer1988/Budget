  function addTransaction(tx) {
    const next = [...transactions, { ...tx, id: uid() }];
    persistTransactions(next);
    setToast("Добавлено");
    setTimeout(() => setToast(null), 1400);
  }
  function deleteTransaction(id) {
    persistTransactions(transactions.filter((t) => t.id !== id));
  }
  function toggleIncludeInTotal(key) {
    const next = { ...settings, includeInTotal: { ...settings.includeInTotal, [key]: !settings.includeInTotal[key] } };
    persistSettings(next);
  }
 
  if (!loaded) {
    return (
      <div style={{ background: C.bg, color: C.inkMuted, minHeight: "100vh" }} className="font-display flex items-center justify-center">
        <div className="text-sm">Загрузка…</div>
      </div>
    );
  }
 
  return (
    <div style={{ background: tab === "add" ? "#e4f6da" : C.bg, color: C.ink, minHeight: "100vh" }} className="font-display">
      {tab !== "add" && (
        <header className="max-w-md mx-auto px-4 pt-5 pb-1">
          <div className="text-lg font-semibold">Бюджет</div>
        </header>
      )}
 
      <main className={`max-w-md mx-auto pb-24 ${tab === "add" ? "px-3 pt-6" : "px-4 pt-3"}`}>
        {tab === "dashboard" && (
          <DashboardView settings={settings} transactions={transactions}
            selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
            onDelete={deleteTransaction} onToggleInclude={toggleIncludeInTotal} goToAdd={() => setTab("add")} />
        )}
        {tab === "add" && <AddView settings={settings} transactions={transactions} onAdd={addTransaction} />}
        {tab === "savings" && <SavingsView settings={settings} transactions={transactions} />}
        {tab === "analysis" && (
          <AnalysisView settings={settings} transactions={transactions}
            selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
        )}
        {tab === "settings" && (
          <SettingsView settings={settings} onSave={persistSettings}
            onWipeAll={() => persistTransactions([])} />
        )}
      </main>
 
      <TabBar tab={tab} setTab={setTab} />
      <Toast text={toast} />
    </div>
  );
}
 
