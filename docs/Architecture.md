# Arquitetura da Interface de Usuário (UI) do Simulador de Circuitos

Este documento descreve a organização dos módulos da interface de usuário (UI) do simulador.  
O objetivo é orientar **desenvolvedores externos** na compreensão da função de cada arquivo,  
permitindo refatoração, manutenção e evolução do sistema.

---

## Visão Geral

A interface é organizada em torno da classe central `Schematic`, que orquestra:

- O **diagrama** (canvas principal).
- A **caixa de ferramentas de componentes** (Parts Bin).
- A **barra de ferramentas de comandos** (Toolbar).
- O **gerenciamento de janelas e diálogos** (UI Windows e Message).
- A **renderização e interação** (Drawing e Event).
- A **interface de simulação** (Netlist, Simulation e Graphing).

---

## Módulos Principais

### 1. Núcleo do Esquemático
- **`Schematic.js`**
  - Ponto central da UI.
  - Agrega o canvas do diagrama, a barra de ferramentas, o parts bin e a área de status.
  - Responsável por eventos de mouse/teclado, zoom, rotação, seleção, cópia/recorte/colagem.
  - Orquestra a interação entre **componentes**, **fios** e **probes**.

- **`Component.js`**
  - Classe base para todos os componentes.
  - Define propriedades, conexões, desenho, rotação e movimentação.
  - Extensível: novos dispositivos podem ser criados herdando desta classe.

- **`ConnectionPoint.js`**
  - Modela pontos de conexão elétrica entre componentes e fios.
  - Propaga rótulos de nós, assegurando consistência topológica.

- **`Wire.js`**
  - Representa conexões elétricas entre pontos.
  - Implementa lógica de seleção, interseção e propagação de rótulos.

- **`Label.js`**
  - Permite inserir rótulos no esquema, úteis para identificar nós ou sinais.

---

### 2. Caixa de Componentes
- **`PartsBin.js`**
  - Renderiza o conjunto de componentes disponíveis ao usuário.
  - Permite arrastar componentes para o diagrama.
  - Cada entrada no bin é uma instância simplificada de `Component`.

---

### 3. Ferramentas de UI
- **`ToolBar.js`**
  - Define os botões da barra superior (abrir, salvar, recortar, colar, simulação, etc.).
  - Gerencia estado de habilitação/desabilitação e ícones.

- **`UIWindows.js`**
  - Infraestrutura de janelas flutuantes (arrastáveis, redimensionáveis, fecháveis).
  - Usada para mostrar gráficos de simulação e diálogos de propriedades.

- **`Message.js`**
  - Área de mensagens de status na parte inferior.
  - Fornece também suporte a diálogos modais com botões de OK/Cancelar.

---

### 4. Renderização e Interação
- **`Drawing.js`**
  - Cuida da renderização do canvas (fundo, grid, seleção, fios, componentes).
  - Implementa zoom, rotação e controles de visualização.

- **`Event.js`**
  - Centraliza o tratamento de eventos de mouse e teclado.
  - Inclui seleção múltipla, movimentação, drag-and-drop, e atalhos (copiar/colar/rotacionar).

---

### 5. Simulação e Resultados
- **`Netlist.js`**
  - Converte o esquema em **netlist JSON**.
  - Faz interface com o motor de simulação (será integrado depois).
  - Armazena resultados de análises (DC, AC, Transitória).

- **`Simulation.js`**
  - Fornece operações para salvar/abrir netlists.
  - Invoca análises (`dc_analysis`, `ac_analysis`, `transient_analysis`).
  - Integra os probes de tensão/corrente ao fluxo de simulação.

- **`Graphing.js`**
  - Responsável por desenhar gráficos de resultados (tensão, corrente, magnitude, fase).
  - Inclui zoom, legendas, cursores de leitura e exportação de dados.

---

### 6. Componentes Específicos
Cada componente é definido em seu próprio arquivo, herdando de `Component`:

- **`Component.Resistor.js`** — Resistor.
- **`Component.Capacitor.js`** — Capacitor.
- **`Component.Source.js`** — Fontes de tensão e corrente (DC, AC, etc.).
- **`Component.Ground.js`** — Terra (nó de referência).
- **`Component.Probe.js`** — Probe de tensão.
- **`Component.Ammeter.js`** — Probe de corrente.
- **`Component.Label.js`** — Rótulos de nós.

---

## Fluxo de Execução Resumido

1. **Inicialização**: `Schematic` monta o diagrama, barra de ferramentas e parts bin.
2. **Interação**: Usuário insere/move/edita componentes → eventos capturados em `Event.js`.
3. **Desenho**: `Drawing.js` atualiza a tela conforme estado dos componentes.
4. **Netlist**: `Netlist.js` gera a representação para simulação.
5. **Simulação**: `Simulation.js` chama o motor (a ser desenvolvido) e coleta resultados.
6. **Resultados**: `Graphing.js` plota resultados em janelas (`UIWindows.js`).
7. **Feedback**: Mensagens e diálogos em `Message.js`.

---

## Pontos de Extensão

- **Adicionar novos componentes**: criar arquivo em `Component.*.js` herdando de `Component.js`.
- **Alterar motor de simulação**: adaptar camada de `Simulation.js` sem alterar UI.
- **Personalizar UI**: modificar `ToolBar.js`, `UIWindows.js` ou `Message.js`.
- **Internacionalização**: textos já usam `i18n[]`, podendo ser traduzidos.

---
