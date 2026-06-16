import type { Meta, StoryObj } from "@storybook/react";
import { VerdictPill } from "./VerdictPill";
import { VERDICTS } from "../../types/report";

const meta: Meta<typeof VerdictPill> = {
  title: "components/VerdictPill",
  component: VerdictPill,
  args: { verdict: "clean", size: "md" },
};

export default meta;
type Story = StoryObj<typeof VerdictPill>;

export const Clean: Story = { args: { verdict: "clean" } };
export const Suspicious: Story = { args: { verdict: "suspicious" } };
export const Malicious: Story = { args: { verdict: "malicious" } };
export const Unknown: Story = { args: { verdict: "unknown" } };

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(["sm", "md", "lg"] as const).map((size) => (
        <div key={size} className="flex items-center gap-3">
          {VERDICTS.map((v) => (
            <VerdictPill key={`${v}-${size}`} verdict={v} size={size} />
          ))}
        </div>
      ))}
    </div>
  ),
};
