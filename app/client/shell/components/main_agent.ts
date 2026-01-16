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

    .status p {
      margin: 0.25rem 0;
    }

    .status-text {
      white-space: pre-wrap;
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

  connectedCallback() {
    super.connectedCallback();

    // Listen for streaming events from the A2UI shell
    this.addEventListener('streaming-event', (event: any) => {
      const streamingEvent = event.detail;
      this.updateStatusFromStreamingEvent(streamingEvent);
    });
  }

  // TODO: this method should go on a separate router type
  private updateStatusFromStreamingEvent(event: any) {
    // status updates messages
    if (event.kind === 'status-update') {
      const status = event.status;
      const isFinal = event.final;
      const state = status?.state;
      const hasMessage = status?.message?.parts?.length > 0;

      // Actual part with status of server
      const serverState:Array<any> = hasMessage? event.status.message.parts : [{"text":"Server did not send any message parts"}];
      const serverMessage = serverState[0].text || "No text content"

      console.log("process status", status);
      console.log("process final message received", isFinal);
      console.log("process state", state);
      console.log("server message",serverState);
      console.log("End of message update")

      if (state == 'failed'){
        this.status = "Task failed - An error occurred"
      }else {
        this.status = serverMessage;
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
        <a2ui-shell user_query=${this.query}></a2ui-shell>
      </div>
      <div class="status">
        <p>Status:</p>
        <p class="status-text">${this.status}</p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dynamic-module": DynamicModule
  }
}
