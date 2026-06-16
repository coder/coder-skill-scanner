import type { Meta, StoryObj } from "@storybook/react";
import { RuleBadge } from "./RuleBadge";

const meta: Meta<typeof RuleBadge> = {
  title: "components/RuleBadge",
  component: RuleBadge,
  args: { id: "PE3", severity: "high", count: 5 },
};
export default meta;
type Story = StoryObj<typeof RuleBadge>;

export const Default: Story = {};

export const NoCount: Story = { args: { id: "EA2", severity: "high", count: undefined } };

export const UnknownRule: Story = {
  args: { id: "ZZ99", severity: "low", count: 1 },
};

export const Catalogue: Story = {
  args: { id: "PE3" },
  render: () => (
    <div className="flex max-w-xl flex-wrap gap-2">
      {["PE3", "E1", "RA2", "SC2", "EA2", "MP2", "PE2", "E2", "LP3", "TM2"].map(
        (id) => (
          <RuleBadge key={id} id={id} severity="high" count={3} />
        ),
      )}
    </div>
  ),
};
