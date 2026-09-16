import { AppProvider, useApp } from "./context/AppContext";
import { TopBar } from "./components/TopBar";
import { StatusBar } from "./components/StatusBar";
import { Sidebar } from "./components/Sidebar";
import { ChatPanel } from "./components/ChatPanel";
import { ChatInput } from "./components/ChatInput";
import { SessionList } from "./components/SessionList";
import { ConfigPage } from "./components/ConfigPage";
import { SubAgentView } from "./components/SubAgentView";
import { TodoPanel } from "./components/TodoPanel";
import { MCPPage } from "./components/MCPPage";

function MainView() {
  const { view, clearChat } = useApp();

  const content = (() => {
    switch (view) {
      case "chat":
        return (
          <div className="flex h-full flex-col">
            <ChatPanel />
            <ChatInput onClear={clearChat} />
          </div>
        );
      case "sessions":
        return <SessionList />;
      case "config":
        return <ConfigPage />;
      case "subagents":
        return <SubAgentView />;
      case "todos":
        return <TodoPanel />;
      case "mcp":
        return <MCPPage />;
    }
  })();

  return <div className="flex-1 overflow-hidden">{content}</div>;
}

function AppShell() {
  return (
    <div className="flex h-screen w-screen flex-col bg-terminal-bg font-mono text-sm">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <MainView />
      </div>
      <StatusBar />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
