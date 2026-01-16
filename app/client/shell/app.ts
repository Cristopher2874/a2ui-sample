import { LitElement, html, css } from "lit"
import { customElement, state } from "lit/decorators.js"
import { provide } from "@lit/context"
import { a2uiRouter, routerContext } from "./services/a2ui-router.js"
import "./components/main_traditional"
import "./components/chatTextArea"
import "./components/main_agent"
import "./components/main_chat"

@customElement("app-container")
export class AppContainer extends LitElement {
  @provide({ context: routerContext })
  accessor router = a2uiRouter;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: auto;
      background: #1a2332;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 2rem;
      gap: 2rem;
    }

    .header {
      color: white;
      font-size: 2rem;
      font-weight: 700;
    }

    .modules {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      flex: 1;
      width: 100%;
    }
  `

  render() {
    return html`
      <div class="container">
        <div class="header">EDGE demo showcase</div>

        <div class="modules">
          <static-module></static-module>
          <chat-module
            title="Chat app container"
            subtitle="App using LLM to chat"
            color="#f87171">
          </chat-module>
          <dynamic-module
            title="Sample application for A2UI"
            color="#334155">
          </dynamic-module>
        </div>
        <chat-input></chat-input>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-container": AppContainer
  }
}
