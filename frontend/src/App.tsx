import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./components/layout/AppLayout.tsx";
import { BatchListPage } from "./pages/BatchListPage.tsx";
import { BatchDetailPage } from "./pages/BatchDetailPage.tsx";
import { ImportPage } from "./pages/ImportPage.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<BatchListPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="batches/:batchId" element={<BatchDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
