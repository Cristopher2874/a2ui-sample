import json
import logging
import os
from collections.abc import AsyncIterable
from typing import Any
from langchain.agents import create_agent
from langchain_oci import ChatOCIGenAI
# from langchain_oci import ChatOCIOpenAI
from langchain.messages import HumanMessage, AIMessage, AnyMessage, ToolMessage
from langgraph.graph.state import CompiledStateGraph
from langchain_core.runnables import RunnableConfig

import jsonschema
from prompt_builder import (
    A2UI_SCHEMA,
    RESTAURANT_UI_EXAMPLES,
    get_text_prompt,
    get_ui_prompt,
)
from langchain_tools import get_restaurants

logger = logging.getLogger(__name__)

AGENT_INSTRUCTION = """
    You are a helpful restaurant finding assistant. Your goal is to help users find and book restaurants using a rich UI.

    To achieve this, you MUST follow this logic:

    1.  **For finding restaurants:**
        a. You MUST call the `get_restaurants` tool. Extract the cuisine, location, and a specific number (`count`) of restaurants from the user's query (e.g., for "top 5 chinese places", count is 5).
        b. After receiving the data, you MUST follow the instructions precisely to generate the final a2ui UI JSON, using the appropriate UI example from the `prompt_builder.py` based on the number of restaurants.

    2.  **For booking a table (when you receive a query like 'USER_WANTS_TO_BOOK...'):**
        a. You MUST use the appropriate UI example from `prompt_builder.py` to generate the UI, populating the `dataModelUpdate.contents` with the details from the user's query.

    3.  **For confirming a booking (when you receive a query like 'User submitted a booking...'):**
        a. You MUST use the appropriate UI example from `prompt_builder.py` to generate the confirmation UI, populating the `dataModelUpdate.contents` with the final booking details.
"""

class OCIRestaurantAgent:
    """ Agent using OCI libraries to find restaurants """

    SUPPORTED_CONTENT_TYPES = ["text", "text/plain"]

    def __init__(self, base_url: str, use_ui: bool = False):
        self.base_url = base_url
        self.use_ui = use_ui
        self._agent = self._build_agent(use_ui)
        self._user_id = "remote_agent"

        # --- MODIFICATION: Wrap the schema ---
        # Load the A2UI_SCHEMA string into a Python object for validation
        try:
            # First, load the schema for a *single message*
            single_message_schema = json.loads(A2UI_SCHEMA)

            # The prompt instructs the LLM to return a *list* of messages.
            # Therefore, our validation schema must be an *array* of the single message schema.
            self.a2ui_schema_object = {"type": "array", "items": single_message_schema}
            logger.info(
                "A2UI_SCHEMA successfully loaded and wrapped in an array validator."
            )
        except json.JSONDecodeError as e:
            logger.error(f"CRITICAL: Failed to parse A2UI_SCHEMA: {e}")
            self.a2ui_schema_object = None
        # --- END MODIFICATION ---

    def get_processing_message(self) -> str:
        """ Helper function to simulate thinking? """
        return "Finding restaurants that match your criteria..."

    def _build_agent(self, use_ui: bool) -> CompiledStateGraph:
        """Builds the LLM agent for the restaurant agent."""
        if use_ui:
            # Construct the full prompt with UI instructions, examples, and schema
            instruction = AGENT_INSTRUCTION + get_ui_prompt(
                self.base_url, RESTAURANT_UI_EXAMPLES
            )
        else:
            instruction = get_text_prompt()

        oci_llm = ChatOCIGenAI(
            model_id="openai.gpt-4.1",
            service_endpoint=os.getenv("SERVICE_ENDPOINT"),
            compartment_id=os.getenv("COMPARTMENT_ID"),
            model_kwargs={"temperature":0.7},
            auth_profile=os.getenv("AUTH_PROFILE"),
        )

        return create_agent(
            model=oci_llm,
            tools=[get_restaurants],
            system_prompt=instruction,
            name="restaurant_agent"
        )
    
    async def oci_stream(self, query, session_id) -> AsyncIterable[dict[str, Any]]:
        """ Function to call agent and stream responses """
        
        #TODO: Skipped session state flow, still working on why is required

        # --- Begin: UI Validation and Retry Logic ---
        max_retries = 1  # Total 2 attempts
        attempt = 0
        current_query_text = query

        # Ensure schema was loaded
        if self.use_ui and self.a2ui_schema_object is None:
            logger.error(
                "--- RestaurantAgent.stream: A2UI_SCHEMA is not loaded. "
                "Cannot perform UI validation. ---"
            )
            yield {
                "is_task_complete": True,
                "content": (
                    "I'm sorry, I'm facing an internal configuration error with my UI components. "
                    "Please contact support."
                ),
            }
            return
        
        while attempt <= max_retries:
            attempt += 1
            logger.info(
                f"--- RestaurantAgent.stream: Attempt {attempt}/{max_retries + 1} "
                f"for session {session_id} ---"
            )

            current_message = {"messages":[HumanMessage(query)]}
            config:RunnableConfig = {"run_id":str(session_id)}
            final_response_content = None

            async for event in self._agent.astream(
                input=current_message,
                stream_mode="values",
                config=config
            ):
                logger.info(f"Event from runner:{event}")

                latest_update:AnyMessage = event['messages'][-1]

                if hasattr(latest_update, 'tool_calls') and latest_update.tool_calls:
                    latest_update = latest_update.tool_calls
                else:
                    latest_update = latest_update.content

                # Yield intermediate updates on every attempt
                yield {
                    "is_task_complete": False,
                    "updates": str(latest_update,)
                }

                final_response_content = latest_update

            if final_response_content is None:
                logger.warning(
                    f"--- RestaurantAgent.stream: Received no final response content from runner "
                    f"(Attempt {attempt}). ---"
                )
                if attempt <= max_retries:
                    current_query_text = (
                        "I received no response. Please try again."
                        f"Please retry the original request: '{query}'"
                    )
                    continue  # Go to next retry
                else:
                    # Retries exhausted on no-response
                    final_response_content = "I'm sorry, I encountered an error and couldn't process your request."
                    # Fall through to send this as a text-only error
            
            is_valid = False
            error_message = ""

            if self.use_ui:
                logger.info(
                    f"--- RestaurantAgent.stream: Validating UI response (Attempt {attempt})... ---"
                )
                try:
                    if "---a2ui_JSON---" not in final_response_content:
                        raise ValueError("Delimiter '---a2ui_JSON---' not found.")

                    text_part, json_string = final_response_content.split(
                        "---a2ui_JSON---", 1
                    )

                    if not json_string.strip():
                        raise ValueError("JSON part is empty.")

                    json_string_cleaned = (
                        json_string.strip().lstrip("```json").rstrip("```").strip()
                    )

                    if not json_string_cleaned:
                        raise ValueError("Cleaned JSON string is empty.")

                    # --- New Validation Steps ---
                    # 1. Check if it's parsable JSON
                    parsed_json_data = json.loads(json_string_cleaned)

                    # 2. Check if it validates against the A2UI_SCHEMA
                    # This will raise jsonschema.exceptions.ValidationError if it fails
                    logger.info(
                        "--- RestaurantAgent.stream: Validating against A2UI_SCHEMA... ---"
                    )
                    jsonschema.validate(
                        instance=parsed_json_data, schema=self.a2ui_schema_object
                    )
                    # --- End New Validation Steps ---

                    logger.info(
                        f"--- RestaurantAgent.stream: UI JSON successfully parsed AND validated against schema. "
                        f"Validation OK (Attempt {attempt}). ---"
                    )
                    is_valid = True
                except (
                    ValueError,
                    json.JSONDecodeError,
                    jsonschema.exceptions.ValidationError,
                ) as e:
                    logger.warning(
                        f"--- RestaurantAgent.stream: A2UI validation failed: {e} (Attempt {attempt}) ---"
                    )
                    logger.warning(
                        f"--- Failed response content: {final_response_content[:500]}... ---"
                    )
                    error_message = f"Validation failed: {e}."

            else:  # Not using UI, so text is always "valid"
                is_valid = True

            if is_valid:
                logger.info(
                    f"--- RestaurantAgent.stream: Response is valid. Sending final response (Attempt {attempt}). ---"
                )
                logger.info(f"Final response: {final_response_content}")
                yield {
                    "is_task_complete": True,
                    "content": final_response_content,
                }
                return  # We're done, exit the generator

            # --- If we're here, it means validation failed ---

            if attempt <= max_retries:
                logger.warning(
                    f"--- RestaurantAgent.stream: Retrying... ({attempt}/{max_retries + 1}) ---"
                )
                # Prepare the query for the retry
                current_query_text = (
                    f"Your previous response was invalid. {error_message} "
                    "You MUST generate a valid response that strictly follows the A2UI JSON SCHEMA. "
                    "The response MUST be a JSON list of A2UI messages. "
                    "Ensure the response is split by '---a2ui_JSON---' and the JSON part is well-formed. "
                    f"Please retry the original request: '{query}'"
                )
                # Loop continues...

            # --- If we're here, it means we've exhausted retries ---
            logger.error(
                "--- RestaurantAgent.stream: Max retries exhausted. Sending text-only error. ---"
            )
            yield {
                "is_task_complete": True,
                "content": (
                    "I'm sorry, I'm having trouble generating the interface for that request right now. "
                    "Please try again in a moment."
                ),
            }
            # --- End: UI Validation and Retry Logic ---


# TODO: test section
async def main():
    oci_agent = OCIRestaurantAgent("example",True)

    async for response in oci_agent.oci_stream("Hello! Can you get me top 5 chinese restaurants in NY?",123):
        print(response)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

    {'is_task_complete': False, 'updates': 
     AIMessage(content='', additional_kwargs={
        'finish_reason': 'tool_calls', 
        'time_created': '2026-01-14 18:31:13.607000+00:00', 
        'total_tokens': 320, 
        'tool_calls': [{
            'id': 'call_z25VRCtpbwAk1VzCAvizHNCu', 
            'function': {'name': 'get_restaurants', 'arguments': {'cuisine': 'chinese', 'location': 'NY', 'count': 5}}, 
            'type': 'function'}]}, 
        response_metadata={'model_id': 'openai.gpt-4.1', 'model_version': '1.0.0', 'request_id': '657CB787777842B585FC4C0E56F30DA0/45B8566AA102914790049B5ED00520A6/6BC16D1A1C184EA492A6306E749E2972', 'content-length': '420', 'finish_reason': 'tool_calls', 'time_created': '2026-01-14 18:31:13.607000+00:00', 'total_tokens': 320, 'tool_calls': [{'id': 'call_z25VRCtpbwAk1VzCAvizHNCu', 'function': {'name': 'get_restaurants', 'arguments': {'cuisine': 'chinese', 'location': 'NY', 'count': 5}}, 'type': 'function'}]}, 
        name='restaurant_agent', 
        id='lc_run--019bbdc6-ab67-7a71-a842-e898702168dd-0', 
        tool_calls=[{'name': 'get_restaurants', 'args': {'cuisine': 'chinese', 'location': 'NY', 'count': 5}, 'id': 'call_z25VRCtpbwAk1VzCAvizHNCu', 'type': 'tool_call'}], 
        invalid_tool_calls=[])}
