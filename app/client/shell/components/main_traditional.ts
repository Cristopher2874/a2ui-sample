import { LitElement, html, css } from "lit"
import { customElement } from "lit/decorators.js"

@customElement("static-module")
export class StaticModule extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: linear-gradient(135deg, #67e8f9 0%, #06b6d4 100%);
      border-radius: 1rem;
      padding: 2rem;
      color: white;
    }

    .title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }

    .content {
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .status {
      font-size: 0.875rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 0.5rem;
    }
  `

  render() {
    return html`
      <div class="title">Static app container</div>
      <div class="content">App using traditional methods</div>
      <div class="status">Window for status</div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "static-module": StaticModule
  }
}
