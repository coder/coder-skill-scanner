import type { Meta, StoryObj } from "@storybook/react";
import { RiskBar } from "./RiskBar";

const meta: Meta<typeof RiskBar> = {
  title: "components/RiskBar",
  component: RiskBar,
  args: { score: 50, verdict: "suspicious", showLabel: true, size: "sm" },
};
export default meta;
type Story = StoryObj<typeof RiskBar>;

export const Clean: Story = { args: { score: 10, verdict: "clean" } };
export const Suspicious: Story = { args: { score: 50, verdict: "suspicious" } };
export const Malicious: Story = { args: { score: 100, verdict: "malicious" } };
export const Unknown: Story = { args: { score: 0, verdict: "unknown" } };
export const Medium: Story = {
  args: { score: 60, verdict: "suspicious", size: "md" },
};
