import { LitElement, html, css } from "lit"
import { customElement, property, state } from "lit/decorators.js"

@customElement("agent-config-canvas")
export class AgentConfigCanvas extends LitElement {
    @property({ type: String })
    accessor serverURL = "http://localhost:10002/config"

    @state()
    accessor model = "xai.grok-4-fast-non-reasoning"

    @state()
    accessor temperature = 0.7

    @state()
    accessor agentName = "place_finder_agent"

    @state()
    accessor systemPrompt = "You are an agent that is specialized on finding different restaurants/caffeterias depending on type of cuisine. Return your answer in the best way possible so other LLM can read the information and proceed. Only return a list of the names of restaurants/caffeterias found."

    @state()
    accessor toolsEnabled = ["get_restaurants"]

    @state()
    accessor responseMessage = ""

    static styles = css`
        :host {
            display: block;
            background: #000000;
            padding: 2rem;
            border-radius: 0.5rem;
            color: white;
            font-family: 'Inter', sans-serif;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: bold;
        }

        select, input, textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #334155;
            border-radius: 0.5rem;
            background: #334155;
            color: white;
            font-size: 1rem;
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
        }

        button {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 0.5rem;
            background: #334155;
            color: white;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.2s;
        }

        button:hover {
            background: rgba(255, 255, 255, 0.5);
        }

        .response {
            margin-top: 2rem;
            padding: 1rem;
            border-radius: 0.5rem;
            background: #1e293b;
        }

        .success {
            border-left: 4px solid #10b981;
        }

        .error {
            border-left: 4px solid #ef4444;
        }
    `

    async send(): Promise<void> {
        const inputData = {
            "place_finder_agent": {
                "model": this.model,
                "temperature": this.temperature,
                "name": this.agentName,
                "system_prompt": this.systemPrompt,
                "tools_enabled": this.toolsEnabled
            },
            "data_finder_agent": {
                "model": "openai.gpt-4.1",
                "temperature": 0.7,
                "name": "data_finder_agent",
                "system_prompt": "You are an agent expert in finding restaurant data.You will receive the information about a list of restaurants or caffeterias to find information about. Your job is to gather that information and pass the full data to a new agent that will respond to the user. Important, consider including links, image references and other UI data to be rendered during next steps. Consider that caffeteria or restaurant data should be complete, use tools as required according to context. Make sure to use the exact restaurant names from information.",
                "tools_enabled": ["get_restaurant_data", "get_cafe_data"]
            },
            "presenter_agent": {
                "model": this.model,
                "temperature": 0.7,
                "system_prompt": "",
                "name": "presenter_agent",
                "tools_enabled": []
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

    private handleToolChange(tool: string, checked: boolean) {
        if (checked) {
            this.toolsEnabled = [...this.toolsEnabled, tool];
        } else {
            this.toolsEnabled = this.toolsEnabled.filter(t => t !== tool);
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
            <details open>
                <summary><h2>Agent Configuration</h2></summary>

                <div class="form-group">
                    <label for="model">Model:</label>
                <select
                    id="model"
                    .value=${this.model}
                    @change=${(e: Event) => this.model = (e.target as HTMLSelectElement).value}
                >
                    ${availableModels.map(model => html`
                        <option value=${model} ?selected=${this.model === model}>${model}</option>
                    `)}
                </select>
            </div>

            <div class="form-group">
                <label for="temperature">Temperature:</label>
                <input
                    id="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    .value=${this.temperature.toString()}
                    @input=${(e: Event) => this.temperature = parseFloat((e.target as HTMLInputElement).value) || 0}
                />
            </div>

            <div class="form-group">
                <label for="agentName">Agent Name:</label>
                <input
                    id="agentName"
                    type="text"
                    .value=${this.agentName}
                    @input=${(e: Event) => this.agentName = (e.target as HTMLInputElement).value}
                />
            </div>

            <div class="form-group">
                <label for="systemPrompt">System Prompt:</label>
                <textarea
                    id="systemPrompt"
                    .value=${this.systemPrompt}
                    @input=${(e: Event) => this.systemPrompt = (e.target as HTMLTextAreaElement).value}
                ></textarea>
            </div>

            <div class="form-group">
                <label>Tools Enabled:</label>
                <div class="checkbox-group">
                    ${availableTools.map(tool => html`
                        <div class="checkbox-item">
                            <input
                                type="checkbox"
                                id=${tool}
                                .checked=${this.toolsEnabled.includes(tool)}
                                @change=${(e: Event) => this.handleToolChange(tool, (e.target as HTMLInputElement).checked)}
                            />
                            <label for=${tool}>${tool}</label>
                        </div>
                    `)}
                </div>
                </div>

                <button @click=${this.send}>Send Configuration</button>

                ${this.responseMessage ? html`
                    <div class="response ${this.responseMessage.startsWith('Error') ? 'error' : 'success'}">
                        ${this.responseMessage}
                    </div>
                ` : ''}
            </details>
        `;
    }
}

declare global {
  interface HTMLElementTagNameMap {
    "agent-config-canvas": AgentConfigCanvas
  }
}