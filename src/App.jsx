import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Home, Plus, PiggyBank, BarChart3, Settings as SettingsIcon,
  ChevronLeft, ChevronRight, Trash2, Check, AlertTriangle, Wallet, X,
  ChevronLeft, ChevronRight, Trash2, Check, CheckCircle2, AlertTriangle, Wallet, X,
  ShoppingCart, ShoppingBag, UtensilsCrossed, Coffee, Zap, Droplet, Wifi, Phone,
  Car, Bus, Fuel, Plane, Train, HeartPulse, Pill, Stethoscope, Dumbbell, GraduationCap,
  Baby, PawPrint, Gift, Film, Tv, Music, Gamepad2, Book, Shirt, Smartphone, Laptop,
}

/* ============================================================ Quick-add carousel */
function QuickTile({ icon: Icon, color, name, amount, onClick, isAddNew }) {
  if (isAddNew) {
    return (
      <button onClick={onClick}
        className="rounded-xl border-2 flex flex-col items-center justify-center gap-1 py-4"
        style={{ borderColor: C.border, borderStyle: "dashed", color: C.inkMuted, background: "transparent" }}>
        <Plus size={20} />
        <span className="text-xs">Новое</span>
      </button>
    );
  }
function QuickTile({ icon: Icon, color, name, amount, onClick }) {
  return (
    <button onClick={onClick}
      className="rounded-xl border flex flex-col items-center gap-1.5 py-3 px-2 relative"
      style={{ borderColor: C.border, background: C.surface }}>
      {amount != null && (
        <span className="absolute top-1.5 right-1.5 font-mono px-1.5 py-0.5 rounded-full"
          style={{ fontSize: 10, background: C.bg, color: C.inkMuted }}>
          {formatMoney(amount)}
        </span>
      )}
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: color + "22" }}>
        <Icon size={19} style={{ color }} />
      className="expense-category-card">
      <div className="expense-category-icon" style={{ background: color + "18", color }}>
        <Icon size={27} strokeWidth={2} />
      </div>
      <span className="text-xs font-medium text-center leading-tight">{name}</span>
      <span className="min-w-0 text-left">
        <span className="expense-category-name">{name}</span>
        <span className="expense-category-amount">{amount != null ? formatMoney(amount) : "Добавить"}</span>
