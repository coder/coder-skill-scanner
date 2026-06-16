import type { Meta, StoryObj } from "@storybook/react";
import { VerdictExplanation } from "./VerdictExplanation";
import type { SkillEntry } from "../../types/report";

const baseSkill: SkillEntry = {
  namespace: "coder",
  slug: "setup",
  source_repo: "coder/skills",
  source_ref: "main",
  source_sha: "0308038abcde",
  skill_path: "skills/setup",
  verdict: "malicious",
  reasons: ["skillspector risk_score=100 >= malicious threshold 81"],
  scanners: {
    skillspector: {
      risk_score: 100,
      risk_severity: "critical",
      risk_recommendation: "DO_NOT_INSTALL",
      findings_by_severity: { high: 10, medium: 13 },
      findings_by_rule: [
        { id: "PE3", severity: "high", count: 5 },
        { id: "E1", severity: "medium", count: 3 },
        { id: "RA2", severity: "medium", count: 3 },
        { id: "SC2", severity: "high", count: 3 },
        { id: "EA2", severity: "medium", count: 2 },
        { id: "MP2", severity: "medium", count: 2 },
        { id: "PE2", severity: "medium", count: 2 },
        { id: "E2", severity: "high", count: 1 },
        { id: "LP3", severity: "medium", count: 1 },
        { id: "TM2", severity: "high", count: 1 },
      ],
    },
  },
};

const meta: Meta<typeof VerdictExplanation> = {
  title: "components/VerdictExplanation",
  component: VerdictExplanation,
};
export default meta;
type Story = StoryObj<typeof VerdictExplanation>;

export const Malicious: Story = {
  args: { skill: baseSkill },
};

export const Suspicious: Story = {
  args: {
    skill: {
      ...baseSkill,
      verdict: "suspicious",
      reasons: ["skillspector risk_score=60 >= suspicious threshold 51"],
      scanners: {
        skillspector: {
          risk_score: 60,
          risk_severity: "high",
          risk_recommendation: "DO_NOT_INSTALL",
          findings_by_severity: { medium: 4, high: 1 },
          findings_by_rule: [
            { id: "P3", severity: "high", count: 2 },
            { id: "TM1", severity: "medium", count: 2 },
            { id: "SC1", severity: "medium", count: 1 },
          ],
        },
      },
    },
  },
};

export const Clean: Story = {
  args: {
    skill: {
      ...baseSkill,
      slug: "coder-modules",
      verdict: "clean",
      reasons: [],
      scanners: {
        skillspector: {
          risk_score: 10,
          risk_severity: "low",
          risk_recommendation: "SAFE",
          findings_by_severity: {},
          findings_by_rule: [],
        },
      },
    },
  },
};

export const Unknown: Story = {
  args: {
    skill: {
      ...baseSkill,
      slug: "broken",
      verdict: "unknown",
      reasons: ["skillspector did not produce parseable output"],
      scanners: {
        skillspector: {
          crashed: true,
        },
      },
    },
  },
};
