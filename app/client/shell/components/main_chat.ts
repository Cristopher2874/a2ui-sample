import { LitElement, html, css } from "lit"
import { customElement, property, state } from "lit/decorators.js"
import { consume } from "@lit/context"
import { routerContext, A2UIRouter } from "../services/a2ui-router.js"

@customElement("chat-module")
export class ChatModule extends LitElement {
  @consume({ context: routerContext })
  accessor router!: A2UIRouter;

  @property({ type: String })
  accessor title = ""

  @property({ type: String })
  accessor subtitle = ""

  @property({ type: String })
  accessor color = "#334155"

  @state()
  accessor response = ""

  @state()
  accessor status = "Ready"

  // Default server URL for this module
  private defaultServerUrl = "http://localhost:10002";

  connectedCallback() {
    super.connectedCallback();

    // Listen for streaming events from the router
    if (this.router) {
      this.router.addEventListener('streaming-event', (event: any) => {
        const streamingEvent = event.detail;
        this.processStreamingEvent(streamingEvent);
      });
    }
  }

  private processStreamingEvent(event: any) {
    // Process text messages for chat display
    if (event.kind === 'status-update') {
      const status = event.status;
      const isFinal = event.final;
      const state = status?.state;
      const hasMessage = status?.message?.parts?.length > 0;

      // Extract text parts
      if (hasMessage) {
        for (const part of status.message.parts) {
          if (part.kind === 'text') {
            this.response = part.text;
            this.status = isFinal ? "Complete" : "Processing...";
            break; // Use the first text part
          }
        }
      }

      if (state === 'failed') {
        this.status = "Task failed - An error occurred";
      }
    }
    else if (event.kind === 'task') {
      this.status = "Task management event received";
    }
    else if (event.kind === 'message') {
      this.status = "Direct message received";
    }
    else {
      this.status = `Event type: ${event.kind || 'unknown'}`;
    }
  }

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
  `

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
      <div class="response">${this.response || "Waiting for query..."}</div>
      <div class="status">Status: ${this.status}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-module": ChatModule
  }
}
