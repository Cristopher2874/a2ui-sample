import { LitElement, html, css } from "lit"
import { customElement, property, state } from "lit/decorators.js"
import './temp_surface.js'

@customElement("dynamic-module")
export class DynamicModule extends LitElement {
  @property({ type: String })
  accessor title = ""

  @property({ type: String })
  accessor subtitle = ""

  @property({ type: String })
  accessor color = "#334155"

  @property({ type: String })
  accessor query = ""

  @state()
  accessor response = ""

  @state()
  accessor status = "Ready"

  static styles = css`
    :host {
      display: block;
      border-radius: 1rem;
      padding: 2rem;
      color: white;
      display: flex;
      flex-direction: column;
    }

    .title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      font-size: 1rem;
      margin-bottom: 1.5rem;
      opacity: 0.9;
    }

    .response {
      flex: 1;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 0.5rem;
      overflow-y: auto;
    }

    .status {
      font-size: 0.875rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 0.5rem;
    }

    .a2ui-container {
      flex: 1;
      overflow-y: auto;
      max-height: 900px;
      margin: 0.5rem;
      width: 100%;
    }
  `

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has("query") && this.query) {
      this.handleQuery()
    }
  }

  private async handleQuery() {
    this.status = "Processing..."
    this.response = `Processing query: "${this.query}"`

    // Simulate async processing
    await new Promise((resolve) => setTimeout(resolve, 1000))

    this.response = `Response to "${this.query}": This is a simulated response from ${this.title}. The query has been processed successfully.`
    this.status = "Complete"
  }

  render() {
    return [
      this.#mainDynamicRegion(),
    ]
  }

  #mainDynamicRegion () {
    return html`
      <style>
        :host {
          background: ${this.color};
        }
      </style>
      <div class="title">${this.title}</div>
      ${this.subtitle ? html`<div class="subtitle">${this.subtitle}</div>` : ""}
      <div class="a2ui-container">
        <a2ui-shell></a2ui-shell>
      </div>
      <div class="status">Status: ${this.status}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dynamic-module": DynamicModule
  }
}
