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

src/
app/ # Orquestração e widgets da UI
AppShell.js # Ponto central da UI (mediador)
CommandBar.js # Barra de comandos (novo, abrir, salvar, zoom, undo/redo, export, run)
PalettePanel.js # Paleta/galeria de elementos (drag & drop)
WindowManager.js # Janelas flutuantes/móveis e seus conteúdos
ToastService.js # Mensagens não bloqueantes (info, warn, error)
EventBus.js # Barramento de eventos (publish/subscribe)

canvas/ # Modelo e visualização do diagrama
CanvasModel.js # Grafo/coleção de elementos e seleção
CanvasView.js # Renderização e interações do canvas
SelectionModel.js # Estado de seleção (única/múltipla/retângulo de seleção)
HitTestService.js # Hit-test para seleção/arraste/edição
elements/ # Tipos concretos de elementos do diagrama
BaseElement.js
WireElement.js
LabelElement.js
ConnectionPoint.js
ResistorElement.js
CapacitorElement.js
GroundElement.js
SourceElement.js
AmmeterElement.js
ProbeElement.js

services/ # Serviços sem estado de UI (testáveis isoladamente)
NetlistExporter.js # Gera netlist a partir do CanvasModel
SimulationEngine.js # (Futuro) Porta para SPICE/WASM/outro backend
PlottingService.js # Plota resultados em uma janela (gráfico)

ui/ # Conteúdos específicos exibidos em janelas
views/
NetlistView.js # Visualização de netlist (somente texto/readonly)
GraphView.js # Visualização de gráficos (resultados de simulação)
HelpView.js # Ajuda/atalhos


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

## 4) Contratos/Interfaces (APIs internas)

> **Sugestão:** Mesmo em JavaScript, documente as “interfaces” como JSDoc ou tipos d.ts (se usar TypeScript).

- **IRenderable** (para elementos no `CanvasView`)
  ```ts
  interface IRenderable {
    draw(ctx: CanvasRenderingContext2D): void
    getBounds(): { x: number; y: number; w: number; h: number }
  }

IConnectable (elementos com pinos)

interface IConnectable {
  getPins(): ConnectionPoint[]
  hitTestPin(x: number, y: number): ConnectionPoint | null
}


INetlistNode (exportação)

interface INetlistNode {
  toNetlist(): string[]     // linhas de netlist (parciais) produzidas pelo elemento
}


IWindowContent (conteúdos de janelas)

interface IWindowContent {
  mount(container: HTMLElement): void
  unmount(): void
}


IEventBus

interface IEventBus {
  subscribe(topic: string, handler: (payload?: any) => void): () => void  // retorna unsubscribe
  publish(topic: string, payload?: any): void
}


ISimulationEngine (futuro)

interface ISimulationEngine {
  run(netlist: string): Promise<SimResult>
}

5) Tópicos de Eventos (convenção sugerida)

command:new, command:open, command:save, command:undo, command:redo, command:zoomIn, command:zoomOut, command:exportNetlist, command:runSimulation

canvas:selectionChanged, canvas:elementAdded, canvas:elementRemoved, canvas:viewportChanged

palette:dragStart, palette:drop

netlist:generated, simulation:started, simulation:completed, simulation:failed

graph:open, graph:close

Padrão: domínio:ação (snake-case/kebab-case à escolha, mas seja consistente).

6) Fluxo Essencial (Visão Geral)

Usuário clica em um comando → CommandBar emite command:* via EventBus ou chama AppShell.handleCommand.

AppShell interpreta e:

atualiza CanvasModel (ex.: adicionar elemento),

solicita CanvasView.render(model),

ou aciona serviços (NetlistExporter, SimulationEngine, PlottingService),

e usa WindowManager para abrir NetlistView/GraphView.

CanvasView publica eventos de interação (canvas:selectionChanged, etc.) para manter o estado sincronizado.

7) Pontos de Extensão (como contribuir)

Adicionar novo elemento

Criar YourElement.js em canvas/elements/ estendendo BaseElement.

Implementar getPins(), draw(), toNetlist().

Registrar no PalettePanel.

Opcional: ícone/preview no catálogo.

Adicionar comando na CommandBar

Definir ação (command:yourAction).

Mapear handler em AppShell (método handleCommand).

(Se houver undo/redo) modelar como ICommand com execute/undo.

Plugar um SimulationEngine

Implementar ISimulationEngine.

Injetar no AppShell (composição).

Padronizar SimResult (tempo, séries, metadados).

Nova janela (WindowManager)

Criar um IWindowContent (ex.: BodePlotView).

Abrir com WindowManager.open("bode", content).

8) Qualidade, Testes e Estilo

Testes de unidade:

services/ e canvas/ devem ser testáveis sem DOM.

CanvasView pode ser testado com canvas mock/headless.

Lint/Format: ESLint + Prettier (regras padronizadas).

Commits/PRs: mensagens claras, PRs pequenos, com captura/descrição (GIF opcional).

9) Roadmap (alto nível)

SimulationEngine com backend SPICE (WASM).

Undo/Redo via Command Pattern e histórico no AppShell.

Roteamento de WireElement com snapping e auto-ortogonal.

Agrupamento (group/ungroup) nativo em SelectionModel.

Salvamento/abertura de projeto (JSON) com versões compatíveis.