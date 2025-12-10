# Dashboard Builder — Design System Cheatsheet

## 🎯 Core Rules

1. **Carbon Design System colors** (не Radix, не shadcn defaults)
2. **shadcn/ui naming** (primary, secondary, destructive, muted, accent)
3. **Tailwind 4** (@theme in CSS) или **Tailwind 3** (config.js) — уточни при старте
4. **99% = Tailwind classes**, TypeScript токены только для Canvas/Charts

---

## 📁 Project Structure

```
src/
├── app.css                          ← Entry point: @import tokens.css
├── lib/shared/
│   ├── styles/
│   │   ├── tokens/
│   │   │   ├── tokens.css           ← Tailwind 4 @theme
│   │   │   ├── semantic.ts          ← TS exports для Canvas/Charts
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── cn.ts                ← clsx + tailwind-merge
│   │       └── index.ts
│   └── ui/                          ← Shared компоненты
│       ├── Button/
│       ├── Input/
│       └── Card/
```

**Import:**
```typescript
/* src/app.css - уже настроено */
@import '$lib/shared/styles/tokens/tokens.css';

// TypeScript (только для Canvas/Charts)
import { semantic, type ButtonVariant } from '$shared/styles/tokens';
```

---

## 🎨 Unique Tokens

### Carbon Colors (используй эти, не другие!)
```svelte
<!-- Primary = Carbon blue-60 (#0f62fe), не zinc/slate -->
<button class="bg-primary hover:bg-primary-hover text-primary-foreground">

<!-- Success = Carbon green-60, Warning = yellow-30, Error = red-60 -->
<span class="bg-success text-success-foreground">
```

### Dashboard-specific
```svelte
<!-- Sidebar (специфично для dashboard) -->
<nav class="bg-sidebar text-sidebar-foreground">
  <a class="hover:bg-sidebar-hover active:bg-sidebar-active">Nav</a>
</nav>

<!-- Chart colors (для Recharts, Chart.js) -->
import { semantic } from '$shared/styles/tokens';
const chartColors = [
  semantic.chart[1], // blue
  semantic.chart[2], // green
  semantic.chart[3], // yellow
  semantic.chart[4], // red
  semantic.chart[5], // gray
];
```

---

## 🔧 When to Use TypeScript Tokens

**ONLY for:**
- Canvas/WebGL: `ctx.fillStyle = semantic.primary.DEFAULT`
- Chart libraries: `backgroundColor: semantic.chart[1]`
- Programmatic logic: `style="color: {getColor()}"`

**Everything else = Tailwind classes**

---

## ✅ Quick Checklist

- [ ] Carbon colors используются (не Radix/shadcn defaults)
- [ ] Semantic naming (primary/secondary, не blue/red)
- [ ] Interactive states (hover/active/disabled)
- [ ] text-*-foreground для контраста
- [ ] transition-colors для UX
- [ ] TypeScript токены ТОЛЬКО для Canvas/Charts

---

## 📋 Component Variants (TypeScript)

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'accent' | 'muted';
type StatusVariant = 'success' | 'warning' | 'error' | 'info';
```

---

🛠️ cn() Utility (Critical!)
Всегда используй в компонентах для композиции классов
typescriptimport { cn } from '$shared/styles/utils';

// Разрешает конфликты Tailwind
cn('px-2', 'px-4')  // => 'px-4' (последний побеждает)

// Условные классы
cn('base', { 'active': isActive, 'disabled': !isActive })

// В компонентах
<button class={cn('px-4 py-2 bg-primary', className)}>


**Last updated**: Nov 2025 | **Stack**: SvelteKit 2 + Svelte 5 + Tailwind + Carbon DS