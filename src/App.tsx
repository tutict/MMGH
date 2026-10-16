import DesktopShell from "./shell/DesktopShell";
import MobileShell from "./shell/MobileShell";
import { useWorkspaceController } from "./state/useWorkspaceController";
import "./CSS/App.css";

export default function App() {
  const model = useWorkspaceController();
  if (model.isMobileViewport) {
    return <MobileShell model={model} />;
  }
  return <DesktopShell model={model}>{model.stage}</DesktopShell>;
}
