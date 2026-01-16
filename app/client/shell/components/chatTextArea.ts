import { LitElement, html, css } from "lit"
import { customElement, state } from "lit/decorators.js"
import { consume } from "@lit/context"
import { routerContext, A2UIRouter } from "../services/a2ui-router.js"

@customElement("chat-input")
export class ChatInput extends LitElement {
  @consume({ context: routerContext })
  accessor router!: A2UIRouter;

  @state()
  accessor #inputValue = ""

  // Default server URL for sending messages
  private defaultServerUrl = "http://localhost:10002";

  static styles = css`
    :host {
      display: block;
    }

    .input-container {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    input {
      flex: 1;
      padding: 1rem 1.5rem;
      font-size: 1rem;
      border: none;
      border-radius: 2rem;
      background: #334155;
      color: white;
      outline: none;
      font-family: 'Inter', sans-serif;
    }

    input::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }

    button {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 50%;
      background: #6366f1;
      border: none;
      color: white;
      font-size: 1.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    button:hover {
      background: #4f46e5;
    }

    button:active {
      transform: scale(0.95);
    }
  `

  private async handleSubmit() {
    if (this.#inputValue.trim() && this.router) {
      console.log("[v0] Sending message:", this.#inputValue)
      try {
        await this.router.sendTextMessage(this.defaultServerUrl, this.#inputValue.trim());
        this.#inputValue = ""
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  }

  private handleKeyPress(e: KeyboardEvent) {
    if (e.key === "Enter") {
      this.handleSubmit()
    }
  }

  render() {
    return html`
      <div class="input-container">
        <input
          type="text"
          .value=${this.#inputValue}
          @input=${(e: Event) => (this.#inputValue = (e.target as HTMLInputElement).value)}
          @keypress=${this.handleKeyPress}
          placeholder="Top 5 Chinese restaurants in New York"
        />
        <button @click=${this.handleSubmit}>
          ▶
        </button>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-input": ChatInput
  }
}
