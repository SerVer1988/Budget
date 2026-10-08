import React from "react";
import handwrittenFontUrl from "./assets/font-handwritten.ttf";
import { C } from "./constants.js";

/* ============================================================ CSS */
export function AppStyles() {
  return (
    <style>{`
      @font-face {
        font-family: 'Handgeschrieben';
        src: url(${handwrittenFontUrl}) format('truetype');
        font-display: swap;
      }

      * {
        box-sizing: border-box;
      }

      html, body, #root {
        width: 100%;
        min-height: 100%;
        margin: 0;
        overflow-x: hidden;
        background: ${C.bg};
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: ${C.ink};
      }

      button, input, select, textarea {
        font: inherit;
        max-width: 100%;
      }

      button {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      .app-viewport {
        width: 100%;
        min-height: 100svh;
        background: ${C.bg};
        color: ${C.ink};
        overflow-x: clip;
      }

      .app-shell {
        width: 100%;
        max-width: 430px;
        min-height: 100svh;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow-x: clip;
      }

      .app-main {
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        padding: calc(8px + env(safe-area-inset-top)) 12px calc(94px + env(safe-area-inset-bottom));
        overflow-y: visible;
        overflow-x: clip;
        background: ${C.bg};
        transition: background-color 0.25s ease;
      }

      .app-main::-webkit-scrollbar {
        width: 0;
        height: 0;
      }

      .screen-stack {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
        min-width: 0;
      }

      .soft-card {
        width: 100%;
        min-width: 0;
        border: 1px solid ${C.border};
        background: ${C.surface};
        border-radius: 18px;
        box-shadow: 0 8px 20px rgba(22, 32, 27, 0.05);
      }

      .panel {
        border: 1px solid ${C.border};
        background: ${C.surface};
        border-radius: 18px;
        padding: 14px;
        width: 100%;
        min-width: 0;
      }

      .muted {
        color: ${C.inkMuted};
      }

      .mono {
        font-variant-numeric: tabular-nums;
      }

      .section-title {
        font-size: 12px;
        font-weight: 700;
        color: ${C.ink};
        margin: 12px 2px 8px;
      }

      .section-title-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: transparent;
        border: 0;
        padding: 0;
        cursor: pointer;
        text-align: left;
        color: ${C.ink};
      }

      .section-title-toggle .section-title {
        margin: 12px 0 8px;
      }

      /* Баннер профиля в начале «Настроек» */
      .profile-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        padding: 12px 14px;
        border: 1px solid ${C.sber};
        border-radius: 18px;
        background: linear-gradient(135deg, ${C.sber}, #2f9d62);
        color: #fff;
        cursor: pointer;
        text-align: left;
      }
      .profile-banner-text {
        font-size: 18px;
        font-weight: 800;
        line-height: 1.2;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .profile-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
        border-radius: 50%;
        overflow: hidden;
        background: ${C.sberSoft};
        color: ${C.sber};
        border: 2px solid rgba(255, 255, 255, 0.85);
      }
      .profile-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .profile-head {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .profile-head-title {
        font-size: 18px;
        font-weight: 800;
      }
      .profile-back {
        width: 40px;
        height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid ${C.border};
        border-radius: 14px;
        background: ${C.surface};
        color: ${C.ink};
        cursor: pointer;
      }

      /* Сворачиваемые блоки: одинаковая тонкая плашка, независимо от panel / panel-compact */
      .panel:has(> .section-title-toggle) {
        padding: 0 14px;
      }
      .panel:has(> .section-title-toggle) > .section-title-toggle {
        min-height: 40px;
      }
      .panel .section-title-toggle .section-title {
        margin: 0;
      }
      .panel:has(> .section-title-toggle) > .section-title-toggle + * {
        margin-top: 2px;
      }
      .panel:has(> .section-title-toggle) > :last-child:not(.section-title-toggle) {
        margin-bottom: 14px;
      }

      .section-chevron {
        flex: 0 0 auto;
        color: ${C.inkMuted};
        transition: transform 0.15s ease;
      }

      .section-chevron.open {
        transform: rotate(180deg);
      }

      .cat-edit-row {
        width: 100%;
      }

      .icon-picker {
        width: 100%;
        margin: 8px 0 4px;
        padding: 12px;
        border: 1px solid ${C.border};
        background: ${C.surface2};
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .icon-picker-name {
        width: 100%;
        height: 38px;
        border: 1px solid ${C.border};
        border-radius: 10px;
        padding: 0 10px;
        background: ${C.surface};
        color: ${C.ink};
        font-size: 14px;
        font-weight: 700;
      }

      .color-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 10px;
        border-radius: 999px;
        outline: none;
        cursor: pointer;
      }

      .color-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        background: ${C.surface};
        border: 3px solid ${C.ink};
        cursor: pointer;
      }

      .color-slider::-moz-range-thumb {
        width: 22px;
        height: 22px;
        border-radius: 999px;
        background: ${C.surface};
        border: 3px solid ${C.ink};
        cursor: pointer;
      }

      .icon-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 6px;
      }

      .icon-grid-btn {
        width: 100%;
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid ${C.border};
        border-radius: 10px;
        background: ${C.surface};
        color: ${C.inkMuted};
        cursor: pointer;
      }

      .icon-grid-btn.active {
        border-width: 2px;
      }

      .bucket-config-row {
        display: flex;
        align-items: flex-end;
        gap: 10px;
        margin-bottom: 12px;
      }

      .bucket-config-row:last-child {
        margin-bottom: 0;
      }

      .bank-icon-picker {
        display: flex;
        gap: 6px;
        flex: 0 0 auto;
      }

      .bank-icon-option {
        width: 38px;
        height: 38px;
        flex: 0 0 auto;
        border-radius: 999px;
        border: 2px solid transparent;
        background: ${C.surface2};
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${C.inkMuted};
        cursor: pointer;
      }

      .bank-icon-option img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .bank-icon-option.active {
        border-color: ${C.ink};
      }

      .month-nav {
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) 42px;
        align-items: center;
        gap: 8px;
        width: 100%;
      }

      .month-nav button {
        width: 42px;
        height: 40px;
        border-radius: 13px;
        border: 1px solid ${C.border};
        background: ${C.surface};
        color: ${C.ink};
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .month-label {
        text-align: center;
        font-size: 15px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .add-panel {
        width: 100%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .bank-badge {
        width: 35px;
        height: 35px;
        flex: 0 0 auto;
        border-radius: 999px;
        overflow: hidden;
        box-shadow: 0 3px 10px rgba(22, 32, 27, 0.16);
      }

      .bank-badge img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .limit-status {
        font-size: 12px;
        margin-top: 4px;
        font-weight: 600;
      }

      /* Картинка — фон на всю ширину экрана; всё остальное лежит поверх неё
         абсолютным позиционированием в процентах от самой картинки. */
      .folder-hero {
        position: relative;
        width: calc(100% + 24px);
        margin: 0 -12px;
        line-height: 0;
      }

      .folder-hero-img {
        width: 100%;
        height: auto;
        display: block;
        user-select: none;
        -webkit-user-drag: none;
      }

      .hero-tab-num {
        position: absolute;
        top: calc(4.5% + 3px);
        transform: translate(-50%, -50%);
        background: transparent;
        border: 0;
        padding: 7px 8px;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 22px;
        font-weight: 700;
        font-size: 15px;
        font-variant-numeric: tabular-nums;
        color: ${C.inkMuted};
        opacity: 0.7;
        cursor: pointer;
        line-height: 1.1;
        white-space: nowrap;
      }

      .hero-tab-num.active {
        opacity: 1;
        color: ${C.ink};
        font-weight: 800;
        font-size: 18px;
      }

      .hero-flow {
        position: absolute;
        top: calc(13% + 3px);
        line-height: 1.2;
      }

      .hero-flow span {
        display: block;
        font-size: 11px;
        font-weight: 700;
        color: ${C.ink};
        margin-bottom: 1px;
      }

      .hero-flow b {
        display: block;
        font-size: 13px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .hero-flow-in {
        left: calc(4% + 4px);
        text-align: left;
      }

      .hero-flow-out {
        right: calc(4% + 4px);
        text-align: right;
      }

      .hero-title {
        position: absolute;
        left: 50%;
        top: calc(24% + 8px);
        transform: translate(-50%, -50%);
        margin: 0;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        pointer-events: none;
        text-align: center;
        font-family: 'Handgeschrieben', cursive;
        font-size: 24px;
        line-height: 1;
        font-weight: 400;
        white-space: nowrap;
      }

      .hero-badge {
        position: absolute;
        left: 50%;
        top: calc(39% + 8px);
        transform: translate(-50%, -50%);
      }

      .hero-hit {
        position: absolute;
        appearance: none;
        -webkit-appearance: none;
        background: transparent;
        border: 0;
        padding: 0;
        margin: 0;
        cursor: pointer;
        border-radius: 999px;
      }

      .hero-hit:focus-visible {
        outline: 2px solid ${C.gardenInk};
        outline-offset: 2px;
      }

      .hero-hit-prev,
      .hero-hit-next {
        top: 84%;
        width: 17%;
        height: 22%;
        transform: translate(-50%, -50%);
      }

      .hero-hit-prev {
        left: 22%;
      }

      .hero-hit-next {
        left: 77%;
      }

      .hero-hit-add {
        left: 49.5%;
        top: 84%;
        width: 30%;
        height: 34%;
        transform: translate(-50%, -50%);
      }

      .quick-grid {
        width: 100%;
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }

      .cat-list {
        width: 100%;
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .cat-tile {
        width: 100%;
        max-width: 180px;
        aspect-ratio: 180 / 84;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 5px;
        border: 1px solid ${C.border};
        border-left: 5px solid transparent;
        background: ${C.surface};
        border-radius: 18px;
        padding: 10px 12px;
        color: ${C.ink};
        text-align: left;
      }

      .cat-tile-head {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .cat-tile-icon {
        width: 34px;
        height: 34px;
        flex: 0 0 auto;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .cat-tile-name {
        flex: 1;
        min-width: 0;
        font-size: 14px;
        font-weight: 800;
        line-height: 1.15;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cat-tile-chevron {
        flex: 0 0 auto;
        width: 20px;
        height: 20px;
        border-radius: 999px;
        background: ${C.surface2};
        color: ${C.inkMuted};
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .cat-tile-amounts {
        font-size: 12px;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cat-tile-spent {
        font-size: 14px;
        font-weight: 800;
      }

      .cat-tile-limit {
        font-size: 11px;
        font-weight: 600;
        color: ${C.inkMuted};
      }

      .cat-tile-bar {
        position: relative;
        width: 100%;
        height: 7px;
        border-radius: 999px;
        overflow: hidden;
        display: flex;
      }

      .cat-tile-bar-fill {
        height: 100%;
        flex: 0 0 auto;
        background-image: none;
      }

      .quick-tile {
        min-width: 0;
        min-height: 104px;
        border: 1px solid ${C.gardenCardBorder};
        background: ${C.gardenCard};
        border-radius: 17px;
        padding: 9px 7px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: ${C.ink};
        box-shadow: 0 5px 12px rgba(22, 32, 27, 0.04);
      }

      .quick-tile.empty {
        opacity: 0.55;
        border-style: dashed;
      }

      .quick-amount {
        max-width: 100%;
        font-size: 11px;
        line-height: 1.1;
        color: ${C.inkMuted};
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .quick-icon {
        width: 42px;
        height: 42px;
        flex: 0 0 auto;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, ${C.gardenInk} 14%, #fff);
      }

      .quick-icon svg {
        width: 20px;
        height: 20px;
      }

      .quick-name {
        max-width: 100%;
        min-height: 28px;
        font-size: 12px;
        line-height: 1.15;
        font-weight: 700;
        text-align: center;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .dots {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        margin: 12px 0 0;
      }

      .dot {
        width: 7px;
        height: 7px;
        border: 0;
        border-radius: 999px;
        background: ${C.border};
        padding: 0;
      }

      .dot.active {
        background: var(--accent);
      }

      .ozon-detail {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .progress {
        height: 8px;
        border-radius: 999px;
        overflow: hidden;
        background: ${C.ozonSoft};
      }

      .progress div {
        height: 100%;
        border-radius: 999px;
        background: ${C.ozon};
      }

      .stat-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }

      .stat-box {
        min-width: 0;
        border: 1px solid ${C.border};
        background: ${C.surface};
        border-radius: 16px;
        padding: 12px;
        text-align: center;
      }

      .stat-box .label {
        font-size: 11px;
        color: ${C.inkMuted};
        margin-bottom: 5px;
      }

      .stat-box .value {
        font-size: 15px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .form-card {
        border: 1px solid ${C.border};
        background: ${C.surface};
        border-radius: 20px;
        padding: 14px;
        width: 100%;
        min-width: 0;
      }

      .form-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 12px;
      }

      .form-title-row h2 {
        margin: 0;
        font-size: 18px;
        line-height: 1.2;
        font-weight: 800;
      }

      .icon-button {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        border: 1px solid ${C.border};
        background: ${C.surface2};
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${C.inkMuted};
      }

      .operation-tabs {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
        grid-auto-flow: column;
        gap: 4px;
        padding: 4px;
        border: 1px solid ${C.border};
        background: ${C.surface2};
        border-radius: 15px;
        margin-bottom: 12px;
      }

      .operation-tabs button {
        min-width: 0;
        height: 34px;
        border: 0;
        border-radius: 11px;
        background: transparent;
        color: ${C.inkMuted};
        font-size: 11px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .operation-tabs button.active {
        background: ${C.ink};
        color: #fff;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 11px;
        min-width: 0;
      }

      .field label {
        font-size: 11px;
        line-height: 1.1;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: ${C.inkMuted};
      }

      .field input,
      .field select {
        width: 100%;
        height: 44px;
        border: 1px solid ${C.border};
        background: ${C.surface2};
        border-radius: 14px;
        color: ${C.ink};
        padding: 0 12px;
        outline: none;
      }

      .field input.amount-input {
        height: 54px;
        font-size: 28px;
        line-height: 1;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .amount-row {
        display: flex;
        align-items: stretch;
        gap: 8px;
      }

      .amount-row input.amount-input {
        flex: 1;
        min-width: 0;
      }

      .amount-save {
        flex: 0 0 auto;
        height: 54px;
        padding: 0 18px;
        font-size: 15px;
        white-space: nowrap;
      }

      .form-grid-2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }

      .card-picker {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
        gap: 7px;
        margin-bottom: 11px;
      }

      .card-picker-item {
        min-width: 0;
        border: 1px solid ${C.border};
        background: ${C.surface};
        border-radius: 15px;
        padding: 9px 6px;
        text-align: center;
        color: ${C.ink};
      }

      .card-picker-item.active {
        border-color: var(--pick-color);
        background: var(--pick-soft);
      }

      .card-picker-item .main {
        font-size: 12px;
        font-weight: 800;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .card-picker-item .sub {
        font-size: 10px;
        margin-top: 2px;
        color: ${C.inkMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .button-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
        margin-top: 4px;
      }

      .btn {
        height: 44px;
        border-radius: 14px;
        border: 1px solid ${C.border};
        background: ${C.surface2};
        color: ${C.ink};
        font-weight: 800;
        cursor: pointer;
      }

      .btn.primary {
        background: ${C.ink};
        border-color: ${C.ink};
        color: #fff;
      }

      /* Компактная сводка: слева общий баланс с галочками, справа доход и расходы столбиком */
      .summary-row {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        gap: 8px;
        align-items: stretch;
      }

      .summary-side {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }

      .stat-box-compact {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 5px 6px;
        border-radius: 14px;
      }

      .stat-box-compact .label {
        margin-bottom: 1px;
      }

      .stat-box-compact .value {
        font-size: 14px;
      }

      .total-balance {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 10px;
        padding: 10px 12px;
        text-align: left;
      }

      .total-balance-info {
        min-width: 0;
        flex: 1;
      }

      .total-balance .label {
        font-size: 12px;
        color: ${C.inkMuted};
        margin-bottom: 2px;
      }

      .total-balance .value {
        font-size: clamp(17px, 5.6vw, 24px);
        line-height: 1.12;
        font-weight: 900;
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .check-row {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        flex: 0 0 auto;
        gap: 4px;
      }

      .check-row label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11.5px;
        cursor: pointer;
      }

      .bank-card {
        width: 100%;
        min-width: 0;
        border: 1px solid ${C.border};
        border-left: 4px solid transparent;
        background: ${C.surface};
        border-radius: 16px;
        padding: 8px 11px;
        cursor: pointer;
      }

      .bank-row {
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .bank-name {
        min-width: 0;
        font-size: 14px;
        font-weight: 800;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .bank-card-icon {
        width: 20px;
        height: 20px;
        flex: 0 0 auto;
        border-radius: 999px;
        object-fit: cover;
      }

      .bank-value {
        flex: 0 0 auto;
        text-align: right;
        font-size: 14.5px;
        font-weight: 900;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .bank-chevron {
        flex: 0 0 auto;
        color: ${C.inkMuted};
        transition: transform 0.15s ease;
      }

      .bank-chevron.open {
        transform: rotate(180deg);
      }

      .bank-detail {
        margin-top: 7px;
        padding-top: 7px;
        border-top: 1px solid ${C.border};
      }

      .bank-progress {
        flex: 1;
        min-width: 0;
        height: 5px;
        border-radius: 999px;
        overflow: hidden;
      }

      .bank-progress div {
        height: 100%;
        border-radius: 999px;
      }

      .small-note {
        font-size: 11px;
        line-height: 1.35;
        color: ${C.inkMuted};
      }

      .chart-box {
        width: 100%;
        height: 170px;
        min-width: 0;
        overflow: hidden;
        position: relative;
      }

      .chart-box-nav {
        padding: 0 22px;
      }

      .chart-day-arrow {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 26px;
        height: 26px;
        border: 0;
        border-radius: 999px;
        background: ${C.surface2};
        color: ${C.inkMuted};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1;
      }

      .chart-day-arrow-prev {
        left: 0;
      }

      .chart-day-arrow-next {
        right: 0;
      }

      .chart-carousel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }

      .chart-carousel-header .section-title {
        margin: 2px 0 4px;
        flex: 1;
        text-align: center;
      }

      .chart-carousel-arrow {
        flex: 0 0 auto;
        width: 26px;
        height: 26px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: ${C.inkMuted};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .chart-carousel-dots {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 3px;
      }

      .chart-carousel-dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: ${C.border};
      }

      .chart-carousel-dot.active {
        background: ${C.ink};
      }

      .tx-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        padding: 10px 0;
        border-bottom: 1px solid ${C.border};
      }

      .tx-row:last-child {
        border-bottom: 0;
      }

      .tx-day {
        width: 24px;
        flex: 0 0 24px;
        text-align: center;
        font-size: 11px;
        font-variant-numeric: tabular-nums;
        color: ${C.inkMuted};
      }

      .tx-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        flex: 0 0 auto;
      }

      .tx-main {
        min-width: 0;
        flex: 1;
      }

      .tx-label {
        font-size: 12px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tx-sub {
        font-size: 11px;
        color: ${C.inkMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tx-amount {
        max-width: 112px;
        flex: 0 1 auto;
        font-size: 12px;
        font-weight: 900;
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: right;
      }

      .debt-row {
        gap: 10px;
      }

      .loan-settle {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin: 0 0 8px;
        padding: 8px 10px;
        border-radius: 12px;
        background: ${C.surface2};
        border: 1px solid ${C.border};
      }

      .debt-main {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
      }

      .debt-label {
        font-size: 12px;
        font-weight: 700;
        color: ${C.inkMuted};
        flex: 0 0 auto;
      }

      .debt-icon {
        width: 32px;
        height: 32px;
        flex: 0 0 auto;
        border-radius: 999px;
        border: 2px dashed var(--debt-color, ${C.border});
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
      }

      .debt-icon .bank-badge {
        width: 100%;
        height: 100%;
      }

      .debt-arrow {
        flex: 0 0 auto;
        color: ${C.inkMuted};
      }

      .delete-btn {
        width: 30px;
        height: 30px;
        border: 0;
        background: transparent;
        color: ${C.inkMuted};
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        cursor: pointer;
      }

      .empty-state {
        text-align: center;
        padding: 34px 12px;
      }

      .empty-state svg {
        margin: 0 auto 10px;
        color: ${C.inkMuted};
      }

      .bottom-nav-wrap {
        position: fixed;
        left: 50%;
        bottom: max(6px, env(safe-area-inset-bottom));
        transform: translateX(-50%);
        width: min(calc(100vw - 8px), 430px);
        z-index: 30;
        display: flex;
        justify-content: center;
        pointer-events: none;
      }

      .bottom-nav-plants {
        position: absolute;
        left: 0;
        right: 0;
        bottom: -8px;
        width: 100%;
        height: auto;
        pointer-events: none;
        user-select: none;
        z-index: 0;
      }

      .bottom-nav {
        position: relative;
        z-index: 1;
        pointer-events: auto;
        width: min(calc(100vw - 84px), 320px);
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        padding: 8px;
        border: 1px solid ${C.gardenNavBorder};
        border-radius: 22px;
        background: ${C.gardenNav};
        box-shadow: 0 12px 28px rgba(22, 32, 27, 0.13);
      }

      .nav-btn {
        min-width: 0;
        height: 54px;
        border: 1px solid transparent;
        border-radius: 16px;
        background: transparent;
        color: ${C.gardenInk};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }

      .nav-btn.active {
        background: ${C.gardenNavActive};
        border-color: ${C.gardenNavActiveBorder};
        font-weight: 800;
      }

      .toast {
        position: fixed;
        left: 50%;
        bottom: calc(84px + env(safe-area-inset-bottom));
        transform: translateX(-50%);
        width: max-content;
        max-width: min(380px, calc(100vw - 24px));
        z-index: 60;
        border-radius: 18px;
        padding: 10px 12px 10px 14px;
        background: ${C.ink};
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 800;
        box-shadow: 0 12px 26px rgba(22,32,27,0.2);
      }
      .toast-text {
        flex: 1;
        min-width: 0;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }
      .toast-undo {
        flex: none;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-left: 4px;
        padding: 7px 10px;
        border: 0;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.16);
        color: #fff;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }

      .confirm-overlay {
        position: fixed;
        inset: 0;
        z-index: 80;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        background: rgba(22, 32, 27, 0.45);
        padding: 0 12px calc(16px + env(safe-area-inset-bottom));
      }
      .confirm-sheet {
        width: 100%;
        max-width: 420px;
        border-radius: 22px;
        padding: 18px 16px 16px;
        background: ${C.surface};
        border: 1px solid ${C.border};
        box-shadow: 0 -8px 30px rgba(22, 32, 27, 0.2);
      }
      .confirm-title {
        font-size: 17px;
        font-weight: 800;
        margin-bottom: 4px;
      }
      .confirm-text {
        font-size: 14px;
        color: ${C.inkMuted};
        margin-bottom: 12px;
        overflow-wrap: anywhere;
      }

      .notice {
        border-radius: 16px;
        padding: 12px;
        font-size: 12px;
        line-height: 1.4;
        border: 1px solid ${C.amber};
        background: ${C.amberSoft};
        color: #8A5A15;
      }

      .history-list {
        border: 1px solid ${C.border};
        border-radius: 18px;
        background: ${C.surface};
        padding: 4px 12px;
      }

      .day-total-header {
        margin: 8px -12px;
        padding: 6px 12px;
        background: ${C.surface2};
        border-radius: 10px;
        text-align: center;
        font-weight: 800;
        font-size: 14px;
        color: ${C.ink};
      }

      .day-total-sep {
        color: ${C.inkMuted};
        font-weight: 700;
      }

      .history-list > .day-total-header:first-child {
        margin-top: 4px;
      }

      .sync-banner {
        position: fixed;
        top: env(safe-area-inset-top, 0px);
        left: 0;
        right: 0;
        max-width: 430px;
        margin: 0 auto;
        z-index: 300;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        background: ${C.amberSoft};
        color: ${C.amber};
        border-bottom: 1px solid ${C.amber};
        font-size: 12px;
        font-weight: 700;
      }

      .sync-banner button {
        flex: 0 0 auto;
        border: 0;
        border-radius: 999px;
        padding: 6px 12px;
        background: ${C.amber};
        color: #fff;
        font-size: 12px;
        font-weight: 800;
      }

      /* Компактные панели и карточки */
      .panel-compact {
        padding: 10px 12px;
      }

      .panel-compact .section-title {
        margin: 0 2px 6px;
      }

      .panel-compact .field {
        gap: 4px;
        margin-bottom: 8px;
      }

      .panel-compact .field:last-child {
        margin-bottom: 0;
      }

      .panel-compact .field input,
      .panel-compact .field select {
        height: 36px;
        border-radius: 11px;
        font-size: 14px;
        padding: 0 10px;
      }

      .form-grid-3 {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .bank-forecast {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 5px;
      }

      .bank-forecast-value {
        flex: 0 0 auto;
        font-size: 12.5px;
        font-weight: 900;
      }

      /* Калькулятор под полем суммы */
      .calc-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 6px;
      }

      .calc-key {
        width: 38px;
        height: 30px;
        border-radius: 9px;
        border: 1px solid ${C.border};
        background: ${C.surface};
        color: ${C.ink};
        font-size: 16px;
        font-weight: 800;
        line-height: 1;
      }

      .calc-key:active {
        background: ${C.border};
      }

      .calc-eq {
        width: 44px;
        color: ${C.sber};
      }

      .calc-eq:disabled {
        opacity: 0.35;
      }

      .calc-result {
        margin-left: auto;
        font-size: 13px;
        font-weight: 800;
        color: ${C.inkMuted};
      }

      /* Прогноз и сравнение месяцев */
      .fc-list {
        display: flex;
        flex-direction: column;
      }

      .fc-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 0;
      }

      .fc-row + .fc-row {
        border-top: 1px solid ${C.border};
      }

      .fc-name {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 800;
        color: ${C.ink};
      }

      .fc-sub {
        font-size: 11.5px;
        color: ${C.inkMuted};
      }

      .fc-val {
        flex: 0 0 auto;
        text-align: right;
        font-size: 14px;
        font-weight: 900;
      }

      /* Операции: поиск + фильтры + итог — одна компактная залипающая зона */
      .ops-sticky {
        margin: 0 -12px 8px;
        padding: 6px 12px 7px;
        position: sticky;
        top: env(safe-area-inset-top, 0px);
        z-index: 5;
        background: ${C.bg};
        border-bottom: 1px solid ${C.border};
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .ops-search {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 10px;
        border: 1px solid ${C.border};
        border-radius: 10px;
        background: ${C.surface};
        color: ${C.inkMuted};
      }

      .ops-search input {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        font-size: 13px;
        color: ${C.ink};
        padding: 0;
      }

      .ops-search button {
        display: flex;
        align-items: center;
        border: 0;
        background: transparent;
        color: ${C.inkMuted};
        padding: 2px;
      }

      .ops-chips {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .ops-chips-scroll {
        overflow-x: auto;
        scrollbar-width: none;
      }

      .ops-chips-scroll::-webkit-scrollbar {
        display: none;
      }

      .ops-chips .type-filter-chip {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }

      .chip-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex: 0 0 auto;
      }

      .ops-total {
        margin-left: auto;
        padding-left: 6px;
        font-size: 14px;
        font-weight: 900;
        white-space: nowrap;
      }

      .type-filter-chip {
        padding: 4px 9px;
        border-radius: 999px;
        border: 1px solid ${C.border};
        background: ${C.surface};
        color: ${C.inkMuted};
        font-size: 11.5px;
        font-weight: 700;
        line-height: 1.3;
      }

      .type-filter-chip.active {
        background: ${C.ink};
        color: #fff;
        border-color: ${C.ink};
      }

      /* Modal */
      .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(22, 32, 27, 0.6);
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        backdrop-filter: blur(4px);
      }
      
      .modal-card {
        background: ${C.surface};
        border-radius: 28px;
        padding: 24px;
        width: 100%;
        max-width: 360px;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
        animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes modalSlideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @media (max-width: 360px) {
        .app-main {
          padding-left: 9px;
          padding-right: 9px;
        }

        .ops-sticky {
          margin-left: -9px;
          margin-right: -9px;
          padding-left: 9px;
          padding-right: 9px;
        }

        .folder-hero {
          width: calc(100% + 18px);
          margin: 0 -9px;
        }

        .hero-title {
          font-size: 24px;
        }

        .quick-grid {
          gap: 7px;
        }

        .quick-tile {
          min-height: 96px;
          padding: 8px 5px;
        }

        .quick-icon {
          width: 38px;
          height: 38px;
        }

        .cat-list {
          gap: 8px;
        }

        .cat-tile {
          padding: 9px 10px;
        }

        .cat-tile-icon {
          width: 30px;
          height: 30px;
        }

        .cat-tile-name {
          font-size: 13px;
        }

        .cat-tile-amounts {
          font-size: 11px;
        }

        .operation-tabs button {
          font-size: 10px;
        }

        .field input.amount-input {
          font-size: 24px;
        }

        .amount-save {
          height: 48px;
          padding: 0 12px;
          font-size: 13px;
        }

        .bottom-nav {
          width: calc(100vw - 64px);
          gap: 6px;
          padding: 7px;
        }

        .nav-btn {
          height: 50px;
          font-size: 10px;
        }
      }

      @media (max-height: 720px) {
        .app-main {
          padding-top: calc(6px + env(safe-area-inset-top));
        }

        .add-panel {
          gap: 10px;
        }

        .hero-title {
          font-size: 24px;
        }

        .quick-tile {
          min-height: 92px;
        }

        .quick-name {
          min-height: 24px;
        }
      }
    `}</style>
  );
}
