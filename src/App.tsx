import { useState } from "react";
import { X } from "lucide-react";
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
import { WorkspacePage } from "./components/WorkspacePage";

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
      case "workspace":
        return <WorkspacePage />;
    }
  })();

  return <div className="flex-1 overflow-hidden">{content}</div>;
}

function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-terminal-bg font-mono text-sm">
      <TopBar onMenu={() => setNavOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <div className="h-full">
            <Sidebar />
          </div>
        </div>
        {navOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="absolute inset-0 bg-terminal-bg/80"
              onClick={closeNav}
            />
            <div className="relative flex h-full flex-col border-r border-terminal-border-bright bg-terminal-surface shadow-2xl">
              <button
                onClick={closeNav}
                className="flex h-8 w-full items-center justify-end border-b border-terminal-border px-2 text-terminal-muted hover:text-terminal-green"
                title="Close menu"
              >
                <X size={14} />
              </button>
              <div className="min-h-0 flex-1">
                <Sidebar onNavigate={closeNav} />
              </div>
            </div>
          </div>
        )}
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
