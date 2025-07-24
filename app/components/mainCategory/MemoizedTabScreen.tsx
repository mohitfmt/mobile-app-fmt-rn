// MemoizedTabScreen.tsx
//
// This file defines the MemoizedTabScreen component, which memoizes the rendering of tab screens
// for performance. It ensures that each tab's content is only rendered when visible, improving
// navigation speed and memory usage in tabbed layouts.
//
// Key responsibilities:
// - Memoize tab screen rendering for performance
// - Only render tab content when visible or after first render
//
// Usage: Use <MemoizedTabScreen categoryName isVisible onScroll /> in tab navigators.
//
// -----------------------------------------------------------------------------

import React, { memo, useEffect, useState } from "react";
import HomeLandingSection from "./MainCategory";

const MemoizedTabScreen = memo(
  ({
    categoryName,
    isVisible,
    onScroll,
  }: {
    categoryName: string;
    isVisible: boolean;
    onScroll?: (e: any) => void;
  }) => {
    const [hasRendered, setHasRendered] = useState(false);

    useEffect(() => {
      if (isVisible && !hasRendered) {
        setHasRendered(true);
      }
    }, [isVisible, hasRendered]);

    // This triggers HomeLandingSection's useEffect when visible tab is swiped in
    return hasRendered || isVisible ? (
      <HomeLandingSection
        categoryName={categoryName}
        isVisible={isVisible} // optional: can be used to trigger refresh internally
        onScroll={onScroll}
      />
    ) : null;
  }
);

export default MemoizedTabScreen;
