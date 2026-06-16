import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import { Layout } from "./components/Layout/Layout";
import { OverviewPage } from "./pages/OverviewPage";
import { SkillDetailPage } from "./pages/SkillDetailPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HistorySnapshotPage } from "./pages/HistorySnapshotPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Layout />}>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/skills/:namespace/:slug" element={<SkillDetailPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/history/:stamp" element={<HistorySnapshotPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>,
  ),
);
