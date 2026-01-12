Set up. Requires UV manager to run.

In case the project lock or toml file is broken, can reset using
```bash
uv init
uv sync
uv add a2a-sdk google-adk a2ui jsonschema litellm python-dotenv google-genai
```
To set up, create `.env` file with `GEMINI_API_KEY=<your-sample-api-key>`
**switching from google env to langchain-oci on new updates**

Run server to test right setup. Make sure to have API key and also the toml file dependencies.
Path to a2ui tool.uv is required, if the default project is untouched no need to modify toml file.
```bash
uv run .
```