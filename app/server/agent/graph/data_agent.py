import json
import logging
import os
from collections.abc import AsyncIterable
from typing import Any
from langchain.agents import create_agent
from langchain_oci import ChatOCIGenAI
from langchain.messages import HumanMessage, AIMessage, AnyMessage, ToolMessage
from langgraph.graph.state import CompiledStateGraph
from langchain_core.runnables import RunnableConfig
from dotenv import load_dotenv
load_dotenv()
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.messages import HumanMessage

class DataAgent:
    """ Agent in charge of finding the data about the restaurants specified to the user """

    AGENT_INSTRUCTIONS = """You are an agent expert in finding restaurant data.
    You will receive the information about a list of restaurants or caffeterias to find information about.
    Your job is to gather that information and pass the full data to a new agent that will respond to the user.
    Important, consider including links, image references and other UI data to be rendered during next steps.
    Consider that caffeteria or restaurant data should be complete, use tools as required according to context.
    Make sure to use the exact restaurant names from information."""

    def __init__(self, oci_model:str = "xai.grok-4-fast-non-reasoning"):
        self.oci_model = oci_model
        self._name = "place_data_agent"
        self._client = self._init_oci_client()
        self.agent = None

    def _init_oci_client(self):
        client = ChatOCIGenAI(
            model_id=self.oci_model,
            service_endpoint=os.getenv("SERVICE_ENDPOINT"),
            compartment_id=os.getenv("COMPARTMENT_ID"),
            model_kwargs={"temperature":0.7},
            auth_profile=os.getenv("AUTH_PROFILE"),
        )

        return client

    async def initialize(self):
        self.agent = await self._build_agent()

    async def __call__(self, state):
        # Message cleanup
        user_query = str(state['messages'][0].content)
        last_model_response = str(state['messages'][-1])
        messages = {
            'messages':[
                HumanMessage(user_query),
                last_model_response
            ]
        }
        return await self.agent.ainvoke(messages)
    
    async def _build_agent(self):
        tools = await self._get_mcp_tools()

        return create_agent(
            model=self._client,
            tools=tools,
            system_prompt=self.AGENT_INSTRUCTIONS,
            name=self._name
        )

    async def _get_mcp_tools(self):
        # MCP client connection using langchain mcp
        client = MultiServerMCPClient(
                {
                    "data_server": {
                        "transport": "streamable_http",  # HTTP-based remote server
                        "url": "http://localhost:8001/mcp",
                    }
                }
            )

        return await client.get_tools()
    
async def main():
    agent = DataAgent()
    await agent.initialize()

    messages = {'messages': [HumanMessage(content='Can you give me top 3 chinese restaurants in NY?', additional_kwargs={}, response_metadata={}), AIMessage(content="Xi'an Famous Foods\nHan Dynasty\nRedFarm", additional_kwargs={}, response_metadata={}, tool_calls=[], invalid_tool_calls=[])]}

    async for chunk in agent.agent.astream(
        input=messages,
        stream_mode='values'
    ):
        print(chunk['messages'][-1])

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())