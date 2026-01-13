import { LitElement, html, css } from "lit"
import { customElement, state } from "lit/decorators.js"
import "./components/main_static"
import "./components/main_chat"
import "./components/main_surface"

@customElement("app-container")
export class AppContainer extends LitElement {
  @state()
  accessor query = ""

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
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
      min-height: 0;
    }

    .chat-bar {
      color: white;
      font-size: 1rem;
      margin-bottom: 0.5rem;
    }
  `

  private handleQuerySubmit(e: CustomEvent) {
    this.query = e.detail.query
    console.log("Query submitted:", this.query)

    // Dispatch event to chat modules
    this.dispatchEvent(
      new CustomEvent("query-update", {
        detail: { query: this.query },
        bubbles: true,
        composed: true,
      }),
    )
  }

  render() {
    return html`
      <div class="container">
        <div class="header">EDGE demo showcase</div>
        
        <div class="modules">
          <static-module></static-module>
          <chat-module 
            title="Chat app container"
            subtitle="App using LLM to chat"
            color="#f87171"
            .query=${this.query}>
          </chat-module>
          <chat-module 
            title="Sample application for A2UI"
            color="#334155"
            .query=${this.query}>
          </chat-module>
        </div>
        <chat-input @query-submit=${this.handleQuerySubmit}></chat-input>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-container": AppContainer
  }
}
