"use client";

import { Tabs } from "./Tabs";
import { CodeBlock } from "./CodeBlock";

const GO_INSTALL_CMD = "go install github.com/SamanPandey-in/jevrail/cmd/jevrail@latest";

const FROM_SOURCE_CMD = `git clone https://github.com/SamanPandey-in/jevrail
cd jevrail
go install ./cmd/jevrail   # installs to $GOPATH/bin or $HOME/go/bin; add that to PATH`;

/**
 * The "pick your install method" switcher, styled after the npm / pnpm /
 * yarn tab pickers on package doc sites. Used on both the landing page
 * hero (compact) and the full Installation doc page.
 */
export function InstallTabs({ compact = false }: { compact?: boolean }) {
  return (
    <Tabs
      centerTabs={compact}
      items={[
        {
          value: "go-install",
          label: "go install",
          content: <CodeBlock code={GO_INSTALL_CMD} label={compact ? undefined : "Terminal"} />,
        },
        {
          value: "from-source",
          label: "From source",
          content: <CodeBlock code={FROM_SOURCE_CMD} label={compact ? undefined : "Terminal"} />,
        },
      ]}
    />
  );
}
