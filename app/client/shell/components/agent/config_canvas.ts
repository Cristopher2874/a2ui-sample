import { LitElement, html, css } from "lit"
import { customElement, property, state } from "lit/decorators.js"

@customElement("agent-config-canvas")
export class AgentConfigCanvas extends LitElement {
  @property({ type: Boolean }) accessor open = false;

  @property({ type: String })
  accessor serverURL = "http://localhost:10002/config"

  @state() accessor agentsConfig = {
    "place_finder_agent": {
      model: "xai.grok-4-fast-non-reasoning",
      temperature: 0.7,
      name: "place_finder_agent",
      systemPrompt: "You are an agent that is specialized on finding different restaurants/caffeterias depending on type of cuisine. Return your answer in the best way possible so other LLM can read the information and proceed. Only return a list of the names of restaurants/caffeterias found.",
      toolsEnabled: ["get_restaurants, get_cafes"]
    },
    "data_finder_agent": {
      model: "openai.gpt-4.1",
      temperature: 0.7,
      name: "data_finder_agent",
      systemPrompt: "You are an agent expert in finding restaurant data.You will receive the information about a list of restaurants or caffeterias to find information about. Your job is to gather that information and pass the full data to a new agent that will respond to the user. Important, consider including links, image references and other UI data to be rendered during next steps. Consider that caffeteria or restaurant data should be complete, use tools as required according to context. Make sure to use the exact restaurant names from information.",
      toolsEnabled: ["get_restaurant_data", "get_cafe_data"]
    },
    "presenter_agent": {
      model: "xai.grok-4-fast-non-reasoning",
      temperature: 0.7,
      name: "presenter_agent",
      systemPrompt: "",
      toolsEnabled: []
    }
  };

  @state() accessor responseMessage = "";

  private handleToolChange(agentName: string, tool: string, checked: boolean) {
    if (checked) {
      this.agentsConfig = {
        ...this.agentsConfig,
        [agentName]: {
          ...this.agentsConfig[agentName],
          toolsEnabled: [...this.agentsConfig[agentName].toolsEnabled, tool]
        }
      };
    } else {
      this.agentsConfig = {
        ...this.agentsConfig,
        [agentName]: {
          ...this.agentsConfig[agentName],
          toolsEnabled: this.agentsConfig[agentName].toolsEnabled.filter(t => t !== tool)
        }
      };
    }
  }

  static styles = css`
    :host {
      display: block;
      font-family: 'Inter
      margin-bottom: 1rem;
    }

    button {
      padding: 0.5rem;
      border: 1px solid #334155;
      border-radius: 0.25rem;
      background: #1a2332;
      color: white;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    button:hover {
      background: #64748b;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 1000;
      background: white;
      border: none;
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      padding: 2rem;
      color: #1e293b;
    }

    dialog::backdrop {
      background: rgba(0, 0, 0, 0.5);
    }

    dialog h2 {
      margin-top: 0;
      color: #1e293b;
    }

    dialog h3 {
      color: #1e293b;
      margin-bottom: 1rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: bold;
      color: #374151;
    }

    select, input, textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      background: white;
      color: #1f2937;
      font-size: 1rem;
      box-sizing: border-box;
    }

    select:focus, input:focus, textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    input[type="number"] {
      width: auto;
      max-width: 200px;
    }

    textarea {
      resize: vertical;
      min-height: 100px;
    }

    .checkbox-group {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
    }

    .checkbox-item input[type="checkbox"] {
      margin-right: 0.5rem;
      accent-color: #3b82f6;
    }

    .checkbox-item label {
      font-weight: normal;
      color: #374151;
    }

    .dialog-buttons {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
    }

    .dialog-buttons button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .send-btn {
      background: #10b981;
      color: white;
    }

    .send-btn:hover {
      background: #059669;
    }

    .close-btn {
      background: #6b7280;
      color: white;
    }

    .close-btn:hover {
      background: #4b5563;
    }

    .response {
      margin-top: 2rem;
      padding: 1rem;
      border-radius: 0.5rem;
      background: #f9fafb;
      border-left: 4px solid transparent;
    }

    .success {
      border-left-color: #10b981;
    }

    .error {
      border-left-color: #ef4444;
      color: #dc2626;
    }
  `

  async send(): Promise<void> {
    const inputData = {
      "place_finder_agent": {
        "model": this.agentsConfig["place_finder_agent"].model,
        "temperature": this.agentsConfig["place_finder_agent"].temperature,
        "name": this.agentsConfig["place_finder_agent"].name,
        "system_prompt": this.agentsConfig["place_finder_agent"].systemPrompt,
        "tools_enabled": this.agentsConfig["place_finder_agent"].toolsEnabled
      },
      "data_finder_agent": {
        "model": this.agentsConfig["data_finder_agent"].model,
        "temperature": this.agentsConfig["data_finder_agent"].temperature,
        "name": this.agentsConfig["data_finder_agent"].name,
        "system_prompt": this.agentsConfig["data_finder_agent"].systemPrompt,
        "tools_enabled": this.agentsConfig["data_finder_agent"].toolsEnabled
      },
      "presenter_agent": {
        "model": this.agentsConfig["presenter_agent"].model,
        "temperature": this.agentsConfig["presenter_agent"].temperature,
        "name": this.agentsConfig["presenter_agent"].name,
        "system_prompt": this.agentsConfig["presenter_agent"].systemPrompt,
        "tools_enabled": this.agentsConfig["presenter_agent"].toolsEnabled
      }
    };

    try {
      const response = await fetch(this.serverURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(inputData)
      });

      const result = await response.json();

      if (result.status === "success") {
        this.responseMessage = result.message;
      } else {
        this.responseMessage = `Error: ${result.message}`;
      }
    } catch (error) {
      this.responseMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  render() {
    const availableModels = [
      "xai.grok-4",
      "xai.grok-4-fast-non-reasoning",
      "meta.llama-4-scout-17b-16e-instruct",
      "openai.gpt-4.1",
      "openai.gpt-oss-120b"
    ];

    const availableTools = [
      "get_restaurants",
      "get_cafes",
      "get_restaurant_data",
      "get_cafe_data"
    ];

    return html`
      <button @click=${() => { this.open = true; this.shadowRoot?.querySelector('dialog')?.showModal(); }}>Cfg</button>
      <dialog ?open=${this.open} @close=${() => this.open = false}>
        <h2>Agent Configuration</h2>
        ${Object.keys(this.agentsConfig).map(agentName => html`
          <div>
            <h3>${agentName}</h3>
            <div class="form-group">
              <label for="${agentName}-model">Model:</label>
              <select
                id="${agentName}-model"
                .value=${this.agentsConfig[agentName].model}
                @change=${(e: Event) => this.agentsConfig = { ...this.agentsConfig, [agentName]: { ...this.agentsConfig[agentName], model: (e.target as HTMLSelectElement).value } }}
              >
                ${availableModels.map(model => html`
                  <option value=${model} ?selected=${this.agentsConfig[agentName].model === model}>${model}</option>
                `)}
              </select>
            </div>

            <div class="form-group">
              <label for="${agentName}-temperature">Temperature:</label>
              <input
                id="${agentName}-temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                .value=${this.agentsConfig[agentName].temperature.toString()}
                @input=${(e: Event) => this.agentsConfig = { ...this.agentsConfig, [agentName]: { ...this.agentsConfig[agentName], temperature: parseFloat((e.target as HTMLInputElement).value) || 0 } }}
              />
            </div>

            <div class="form-group">
              <label for="${agentName}-name">Name:</label>
              <input
                id="${agentName}-name"
                type="text"
                .value=${this.agentsConfig[agentName].name}
                @input=${(e: Event) => this.agentsConfig = { ...this.agentsConfig, [agentName]: { ...this.agentsConfig[agentName], name: (e.target as HTMLInputElement).value } }}
              />
            </div>

            <div class="form-group">
              <label for="${agentName}-systemPrompt">System Prompt:</label>
              <textarea
                id="${agentName}-systemPrompt"
                .value=${this.agentsConfig[agentName].systemPrompt}
                @input=${(e: Event) => this.agentsConfig = { ...this.agentsConfig, [agentName]: { ...this.agentsConfig[agentName], systemPrompt: (e.target as HTMLTextAreaElement).value } }}
              ></textarea>
            </div>

            <div class="form-group">
              <label>Tools Enabled:</label>
              <div class="checkbox-group">
                ${availableTools.map(tool => html`
                  <div class="checkbox-item">
                    <input
                      type="checkbox"
                      id="${agentName}-${tool}"
                      .checked=${this.agentsConfig[agentName].toolsEnabled.includes(tool)}
                      @change=${(e: Event) => this.handleToolChange(agentName, tool, (e.target as HTMLInputElement).checked)}
                    />
                    <label for="${agentName}-${tool}">${tool}</label>
                  </div>
                `)}
              </div>
            </div>
          </div>
        `)}
        <div class="dialog-buttons">
          <button class="send-btn" @click=${this.send}>Send Configuration</button>
          <button class="close-btn" @click=${() => { this.open = false; this.shadowRoot?.querySelector('dialog')?.close(); }}>Close</button>
        </div>
        ${this.responseMessage ? html`
          <div class="response ${this.responseMessage.startsWith('Error') ? 'error' : 'success'}">
            ${this.responseMessage}
          </div>
        ` : ''}
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "agent-config-canvas": AgentConfigCanvas
  }
}