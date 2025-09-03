# Circuit UI — Arquitetura & Organização de Arquivos

> **Objetivo:** Documentar a organização de pastas/módulos, contratos e pontos de extensão da UI para facilitar **remanufatura**, testes e contribuições externas.  
> **Escopo:** UI e serviços auxiliares; a **máquina de simulação** (engine) entrará depois por meio de uma interface (`SimulationEngine`).

---

## 1) Princípios de Design

- **Separação de responsabilidades (SoC):** Estado do diagrama em `CanvasModel`; desenho/interação em `CanvasView`.
- **Baixo acoplamento via eventos:** `EventBus` para Pub/Sub (UI e Canvas se comunicam sem dependências diretas).
- **Interfaces claras:** contratos para elementos, netlist, simulação e janelas flutuantes.
- **Padrões adotados:**
  - **Mediator/Facade:** `AppShell` orquestra a UI.
  - **Observer (Pub/Sub):** `EventBus`.
  - **Composite:** `CanvasModel` gerencia uma coleção de elementos (`BaseElement` e derivados).
  - **Strategy/Adapter (futuro):** diferentes backends de simulação por trás de `SimulationEngine`.
  - **Visitor (implícito):** `NetlistExporter` visita elementos para gerar trechos de netlist.

---

## 2) Layout Geral do Projeto

| Caminho                            | Descrição                                                              |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `src/app/`                         | Orquestração da interface e widgets principais.                        |
| `src/app/AppShell.js`              | Ponto central da UI (mediador entre módulos).                          |
| `src/app/CommandBar.js`            | Barra de comandos (novo, abrir, salvar, zoom, undo/redo, export, run). |
| `src/app/PalettePanel.js`          | Paleta/galeria de elementos (drag & drop).                             |
| `src/app/WindowManager.js`         | Controle de janelas flutuantes/móveis.                                 |
| `src/app/ToastService.js`          | Mensagens não bloqueantes (info, warn, error).                         |
| `src/app/EventBus.js`              | Barramento de eventos (publish/subscribe).                             |
| `src/canvas/`                      | Modelo e visualização do diagrama.                                     |
| `src/canvas/CanvasModel.js`        | Estrutura de grafo: elementos e seleção.                               |
| `src/canvas/CanvasView.js`         | Renderização e interações do canvas.                                   |
| `src/canvas/SelectionModel.js`     | Estado de seleção (única, múltipla, retângulo).                        |
| `src/canvas/HitTestService.js`     | Serviço de hit-test para seleção/arraste/edição.                       |
| `src/canvas/elements/`             | Tipos concretos de elementos do diagrama.                              |
| `src/services/`                    | Serviços independentes da UI (testáveis isoladamente).                 |
| `src/services/NetlistExporter.js`  | Gera netlist a partir do `CanvasModel`.                                |
| `src/services/SimulationEngine.js` | (Futuro) Porta para SPICE/WASM/outro backend.                          |
| `src/services/PlottingService.js`  | Gera gráficos dos resultados em janelas.                               |
| `src/ui/views/`                    | Conteúdos específicos exibidos em janelas.                             |
| `src/ui/views/NetlistView.js`      | Visualização de netlist (somente leitura).                             |
| `src/ui/views/GraphView.js`        | Visualização de gráficos de simulação.                                 |
| `src/ui/views/HelpView.js`         | Ajuda/atalhos.                                                         |


> **Nota:** Se o repositório ainda estiver com nomes “originais”, veja o **Anexo A** (mapa de migração).

---

## 3) Papéis e Responsabilidades (Resumo por Módulo)

### `app/`
- **AppShell**  
  Orquestra a interface: recebe eventos da `CommandBar` e `PalettePanel`, muta o `CanvasModel`, solicita `render()` ao `CanvasView`, abre janelas no `WindowManager`, usa `ToastService` para feedback, chama `NetlistExporter` e (no futuro) `SimulationEngine`.

- **CommandBar**  
  Emite ações do usuário (novo/abrir/salvar/zoom/undo/redo/export/run) para o `AppShell` (via chamada direta ou `EventBus`).  
  **Extensão:** adicionar um novo comando significa criar uma ação e mapear seu handler no `AppShell`.

- **PalettePanel**  
  Lista elementos disponíveis e inicia `dragStart(elementType)`. Notifica `AppShell` que, ao receber um drop válido, instancia o `BaseElement` correspondente em `CanvasModel`.

- **WindowManager**  
  Administra janelas flutuantes: abre/fecha/move/redimensiona, e hospeda conteúdos que implementam `IWindowContent` (ex.: `NetlistView`, `GraphView`, `HelpView`).

- **ToastService**  
  Mensagens não bloqueantes (info/warn/error) — não bloqueiam o fluxo, evitam modais disruptivos.

- **EventBus**  
  Pub/Sub com tópicos textuais (ex.: `command:*`, `canvas:selectionChanged`).

### `canvas/`
- **CanvasModel**  
  Estrutura de dados do diagrama: coleção de elementos, conexões, e `SelectionModel`. Sem renderização.

- **CanvasView**  
  Desenho (2D context/WebGL/SVG), pan/zoom, interações (mouse/teclado), hit-test (via `HitTestService`).  
  **Importante:** não contém regras elétricas.

- **SelectionModel**  
  Gerencia seleção simples/grupo e suas regras (adicionar/remover/limpar).

- **HitTestService**  
  Determina qual elemento/pino/segmento está sob um ponto (x, y) e retorna o alvo.

- **elements/**  
  - **BaseElement**: classe base com operações comuns (mover, rotacionar, flip, bounds, serialize).  
  - **WireElement**: segmentos/pontos; liga `ConnectionPoint` ↔ `ConnectionPoint`.  
  - **LabelElement**: texto/âncoras.  
  - **ConnectionPoint**: pinos/terminais de conexão elétrica.  
  - **ResistorElement**, **CapacitorElement**, **GroundElement**, **SourceElement**, **AmmeterElement**, **ProbeElement**: elementos concretos com pinos e metadados elétricos, expõem `toNetlist()`.

### `services/`
- **NetlistExporter**  
  Percorre o `CanvasModel` e compõe texto (SPICE-like). Não conhece UI.

- **SimulationEngine (futuro)**  
  Interface para engines (ex.: SPICE em WASM). `run(netlist): SimResult`.

- **PlottingService**  
  Cria séries/curvas a partir de `SimResult` e injeta em `GraphView`.

### `ui/views/`
- **NetlistView**  
  Mostra o netlist como texto (read-only), permite copiar e salvar.

- **GraphView**  
  Mostra gráficos (ex.: tensão vs. tempo). Recebe dados do `PlottingService`.

- **HelpView**  
  Dicas rápidas, atalhos e fluxos comuns.

---

## 4) Contratos / Interfaces (APIs internas)

> **Sugestão:** mesmo em JavaScript, documente as “interfaces” como **JSDoc** ou arquivos de tipos `.d.ts` (se usar TypeScript).

### Interfaces principais

#### `IRenderable` (elementos do `CanvasView`)
```ts
interface IRenderable {
  draw(ctx: CanvasRenderingContext2D): void
  getBounds(): { x: number; y: number; w: number; h: number }
}
```

#### `IConnectable` (elementos com pinos)
```ts
interface IConnectable {
  getPins(): ConnectionPoint[]
  hitTestPin(x: number, y: number): ConnectionPoint | null
}
```

#### `INetlistNode` (exportação)
```ts
interface INetlistNode {
  toNetlist(): string[] // Linhas de netlist (parciais) produzidas pelo elemento
}
```

#### `IWindowContent` (conteúdo de janelas)
```ts
interface IWindowContent {
  mount(container: HTMLElement): void
  unmount(): void
}
```

#### `IEventBus`
```ts
interface IEventBus {
  subscribe(topic: string, handler: (payload?: any) => void): () => void // retorna unsubscribe
  publish(topic: string, payload?: any): void
}
```

#### `ISimulationEngine` (futuro)
```ts
interface ISimulationEngine {
  run(netlist: string): Promise<SimResult>
}
```

---

## 5) Tópicos de Eventos (convenção sugerida)

- **command:**  
  `command:new`, `command:open`, `command:save`,  
  `command:undo`, `command:redo`, `command:zoomIn`, `command:zoomOut`,  
  `command:exportNetlist`, `command:runSimulation`

- **canvas:**  
  `canvas:selectionChanged`, `canvas:elementAdded`,  
  `canvas:elementRemoved`, `canvas:viewportChanged`

- **palette:**  
  `palette:dragStart`, `palette:drop`

- **netlist / simulation:**  
  `netlist:generated`, `simulation:started`,  
  `simulation:completed`, `simulation:failed`

- **graph:**  
  `graph:open`, `graph:close`

**Padrão:** `domínio:ação` (usar **kebab-case** ou **snake_case**, mas seja consistente).

---

## 6) Fluxo Essencial (Visão Geral)

1. Usuário clica em um comando.  
   → `CommandBar` emite `command:*` via `EventBus` **ou** chama `AppShell.handleCommand`.

2. `AppShell` interpreta e:
   - atualiza `CanvasModel` (ex.: adicionar elemento),
   - solicita `CanvasView.render(model)`,
   - aciona serviços (`NetlistExporter`, `SimulationEngine`, `PlottingService`),
   - usa `WindowManager` para abrir `NetlistView` ou `GraphView`.

3. `CanvasView` publica eventos de interação (`canvas:selectionChanged`, etc.) para manter o estado sincronizado.

---

## 7) Pontos de Extensão (como contribuir)

### Adicionar novo elemento
1. Criar `YourElement.js` em `canvas/elements/`, estendendo `BaseElement`.
2. Implementar:
   - `getPins()`
   - `draw()`
   - `toNetlist()`
3. Registrar no `PalettePanel`.
4. Opcional: adicionar ícone/preview no catálogo.

### Adicionar comando na `CommandBar`
1. Definir ação (`command:yourAction`).
2. Mapear handler em `AppShell.handleCommand`.
3. (Se houver undo/redo) modelar como `ICommand` com `execute/undo`.

### Plugar um `SimulationEngine`
1. Implementar `ISimulationEngine`.
2. Injetar no `AppShell` (composição).
3. Padronizar `SimResult` (tempo, séries, metadados).

### Criar nova janela (`WindowManager`)
1. Implementar `IWindowContent` (ex.: `BodePlotView`).
2. Abrir via `WindowManager.open("bode", content)`.

---

## 8) Qualidade, Testes e Estilo

- **Testes de unidade**
  - `services/` e `canvas/` devem ser testáveis sem DOM.
  - `CanvasView` pode ser testado com mocks/headless canvas.
- **Lint/Format**: usar **ESLint + Prettier** com regras padronizadas.
- **Commits/PRs**: mensagens claras, PRs pequenos, incluir captura/descrição (GIF opcional).

---

## 9) Roadmap (alto nível)

- `SimulationEngine` com backend **SPICE (WASM)**.  
- Undo/Redo via **Command Pattern** com histórico no `AppShell`.  
- Roteamento de `WireElement` com snapping e auto-ortogonal.  
- Agrupamento (`group/ungroup`) nativo no `SelectionModel`.  
- Salvamento/abertura de projeto (`JSON`) com versões compatíveis.  


