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

class RestaurantFinderAgent:
    """ Agent that has tools to find different restaurants depending on type of cuisine """

    AGENT_INSTRUCTIONS = """You are and agent that is specialized on finding different restaurants/caffeterias depending on type of cuisine.
    Return your answer in the best way possible so other LLM can read the information and proceed.
    Only return a list of the names of restaurants/caffeterias found."""

    def __init__(self, oci_model:str = "xai.grok-4-fast-non-reasoning"):
        self.oci_model = oci_model
        self._name = "place_finder_agent"
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
        return await self.agent.ainvoke(state)
    
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
                    "food_place_server": {
                        "transport": "streamable_http",  # HTTP-based remote server
                        "url": "http://localhost:8000/mcp",
                    }
                }
            )

        return await client.get_tools()
