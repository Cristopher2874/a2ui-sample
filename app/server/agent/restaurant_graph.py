from langgraph.graph import MessagesState, StateGraph
from langgraph.graph import StateGraph, START, END
from langgraph.graph import MessagesState
from langchain_core.runnables import RunnableConfig

from agent.agents.food_place_agent import RestaurantFinderAgent
from agent.agents.data_agent import DataAgent
from agent.agents.presenter_agent import PresenterAgent

from dotenv import load_dotenv
load_dotenv()

async def main():
    # Agents
    finder_agent = RestaurantFinderAgent()
    data_agent = DataAgent()
    presenter_agent = PresenterAgent(base_url="http://localhost:8000")
    await finder_agent.initialize()
    await data_agent.initialize()

    # Graph
    graph_builder = StateGraph(MessagesState)

    graph_builder.add_node("search",finder_agent)
    graph_builder.add_node("data",data_agent)
    graph_builder.add_node("presenter", presenter_agent)

    graph_builder.add_edge(START, "search")
    graph_builder.add_edge("search","data")
    graph_builder.add_edge("data", "presenter")
    graph_builder.add_edge("presenter", END)

    outage_graph = graph_builder.compile()

    config:RunnableConfig = {"run_id":str("thread-1234")}

    # Test
    async for chunk in outage_graph.astream(
        input={"messages":[{'role':'user','content':'Can you give me top 3 italian restaurants in NY?'}]},
        config=config,
        stream_mode='values',
        subgraphs=True
    ):
        print(chunk[1]['messages'][-1])

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
