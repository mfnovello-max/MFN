# CLX Design System (Tokens + Buttons)

Plugin global do WordPress para o Cobraleds 2026.

## O que este plugin faz

Ao ativar o plugin, ele injeta globalmente:

- `assets/tokens.css` com os tokens CSS (`:root`) e base leve de tipografia/cores no `body`.
- `assets/components/buttons.css` com o componente global de botões (`.clx-btn*`).

Os assets são enfileirados via `wp_enqueue_scripts` com prioridade `5`.

## Como usar

Use as classes abaixo em qualquer tema/plugin:

- `.clx-btn` → classe base do botão.
- `.clx-btn clx-btn--primary` → variação principal.
- `.clx-btn clx-btn--secondary` → variação secundária.
- `.clx-btn-group` → agrupador responsivo para organizar múltiplos botões.

### Exemplo

```html
<div class="clx-btn-group">
  <a href="#" class="clx-btn clx-btn--primary">
    <span class="clx-btn-label">Comprar</span>
  </a>
  <a href="#" class="clx-btn clx-btn--secondary">
    <span class="clx-btn-label">Ver detalhes</span>
  </a>
</div>
```

## Versão

`1.0.1`
