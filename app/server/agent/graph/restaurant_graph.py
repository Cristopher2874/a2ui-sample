from collections.abc import AsyncIterable
from typing import Any
from langgraph.graph import MessagesState, StateGraph
from langgraph.graph import StateGraph, START, END
from langgraph.graph import MessagesState
from langchain.messages import HumanMessage, AIMessage, AnyMessage, ToolMessage
from langchain_core.runnables import RunnableConfig

from agent.graph.food_place_agent import RestaurantFinderAgent
from agent.graph.data_agent import DataAgent
from agent.graph.presenter_agent import PresenterAgent

from dotenv import load_dotenv
load_dotenv()

class RestaurantGraph:
    """ Graph to call the agent chain """

    SUPPORTED_CONTENT_TYPES = ["text", "text/plain", "text/event-stream"]

    def __init__(self, base_url:str, use_ui:bool = False):
        self._place_finder = RestaurantFinderAgent()
        self._data_finder = DataAgent()
        self._presenter_agent = PresenterAgent(base_url, use_ui)

    async def build_graph(self):
        await self._place_finder.initialize()
        await self._data_finder.initialize()

        graph_builder = StateGraph(MessagesState)

        graph_builder.add_node("search",self._place_finder)
        graph_builder.add_node("data",self._data_finder)
        graph_builder.add_node("presenter", self._presenter_agent)

        graph_builder.add_edge(START, "search")
        graph_builder.add_edge("search","data")
        graph_builder.add_edge("data", "presenter")
        graph_builder.add_edge("presenter", END)

        self._restaurant_graph = graph_builder.compile()

    async def call_restaurant_graph(self, query, session_id) -> AsyncIterable[dict[str, Any]]:
        config:RunnableConfig = {"run_id":str("thread-1234")}
        current_message = {"messages":[HumanMessage(query)]}
        config:RunnableConfig = {"run_id":str(session_id)}
        final_response_content = None
        final_model_state = None
        model_token_count = 0

        # Test
        async for chunk in self._restaurant_graph.astream(
            input=current_message,
            config=config,
            stream_mode='values',
            subgraphs=True
        ):
            latest_update: AnyMessage = chunk[1]['messages'][-1]
            final_response_content = latest_update.content

            if hasattr(latest_update, 'tool_calls') and latest_update.tool_calls:
                tool_name = str(latest_update.tool_calls[0].get('name'))
                tool_args = str(latest_update.tool_calls[0].get('args'))
                latest_update = f"Model calling tool: {tool_name} with args {tool_args}"
            elif isinstance(latest_update,ToolMessage):
                tool_name = str(latest_update.name)
                status_content = str(latest_update.content)
                latest_update = f"Tool {tool_name} responded with:\n{status_content[:100]}...\n\nInformation passed to agent to build response"
            elif isinstance(latest_update, AIMessage):
                status_content = str(latest_update.content)
                model_id = str(latest_update.response_metadata.get("model_id"))
                total_tokens_on_call = int(latest_update.response_metadata.get("total_tokens"))
                model_token_count = model_token_count + total_tokens_on_call
                agent_name = str(latest_update.name)
                model_data = f"""
                    model_id: {model_id},
                    agent_name: {agent_name},
                    total_tokens_on_call: {str(model_token_count)}
                """
                latest_update = f"Agent current response:\n{status_content[:100]}...\n\nAgent metadata:\n{model_data}"
                final_model_state = latest_update
            else:
                status_content = str(latest_update.content)
                latest_update = f"Processing task, current state:\n{status_content[:100]}..."

            # Yield intermediate updates on every attempt
            yield {
                "is_task_complete": False,
                "updates": latest_update
            }
        
        # Update the final response to contain the model_status.
        text_part, json_string = final_response_content.split("---a2ui_JSON---", 1)
        text_part = final_model_state
        final_response_content = f"{text_part}\n---a2ui_JSON---\n{json_string}"

        yield {
            "is_task_complete": True,
            "updates": final_response_content
        }