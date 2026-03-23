import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders agent deck header", () => {
  render(<App />);
  expect(screen.getByText(/MMGH Agent/i)).toBeInTheDocument();
});
