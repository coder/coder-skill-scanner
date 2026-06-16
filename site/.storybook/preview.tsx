import type { Decorator, Preview } from "@storybook/react";
import { withRouter } from "storybook-addon-remix-react-router";
import { withThemeByClassName } from "@storybook/addon-themes";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../src/styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export const decorators: readonly Decorator[] = [
  withRouter,
  withThemeByClassName({
    defaultTheme: "dark",
    themes: { dark: "bg-coder-neutral-black text-coder-neutral-100" },
  }),
  (Story) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={100}>
        <div className="p-6">
          <Story />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  ),
];

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "coder-black",
      values: [
        { name: "coder-black", value: "hsl(180deg, 10%, 4%)" },
        { name: "coder-cinder", value: "hsl(260deg, 6%, 10%)" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
