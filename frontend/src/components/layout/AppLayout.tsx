import { Link, Outlet, useLocation } from "react-router-dom";
import { BarChart3, Plus } from "lucide-react";
import { Button } from "../ui/Button.tsx";
import { ErrorBoundary } from "../ErrorBoundary.tsx";

const navLinks = [{ to: "/", label: "Imports" }] as const;

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-gray-900">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-semibold tracking-tight">Margin Analyzer</span>
            </Link>

            <nav className="hidden items-center gap-1 sm:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link to="/import">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Import
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
