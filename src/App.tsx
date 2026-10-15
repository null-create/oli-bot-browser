import { useRef, useState } from "react";
import { X } from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useSidebarLayout } from "./hooks/useSidebarLayout";
import { TopBar } from "./components/TopBar";
import { StatusBar } from "./components/StatusBar";
import { Sidebar } from "./components/Sidebar";
import { SidebarResizer } from "./components/SidebarResizer";
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
  const shellRef = useRef<HTMLDivElement>(null);
  const { width, setWidth, collapsed, toggle, reset } = useSidebarLayout();

  return (
    <div
      ref={shellRef}
      style={
        {
          "--sidebar-w": `${width}px`,
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        } as React.CSSProperties
      }
      className="flex h-dvh w-full flex-col overflow-hidden bg-oli-bg font-mono text-sm"
    >
      <TopBar
        onMenu={() => setNavOpen(true)}
        onToggleSidebar={toggle}
        sidebarCollapsed={collapsed}
      />
      <div className="flex min-h-0 flex-1">
        {!collapsed && (
          <div
            className="hidden md:flex"
            style={{ width: "var(--sidebar-w)" }}
          >
            <Sidebar />
          </div>
        )}
        {!collapsed && (
          <SidebarResizer
            width={width}
            shellRef={shellRef}
            onResize={setWidth}
            onReset={reset}
            onCollapse={toggle}
          />
        )}
        {navOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="absolute inset-0 bg-oli-bg/80"
              onClick={closeNav}
            />
            <div className="animate-slide-in-left relative flex h-full w-72 max-w-[85vw] flex-col border-r border-oli-line-strong bg-oli-surface shadow-2xl">
              <button
                onClick={closeNav}
                className="flex min-h-11 w-full items-center justify-end border-b border-oli-line px-2 text-oli-muted hover:text-oli-accent"
                title="Close menu"
              >
                <X size={16} />
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
    <ThemeProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ThemeProvider>
  );
}
