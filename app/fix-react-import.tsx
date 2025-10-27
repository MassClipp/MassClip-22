// This file ensures we're using the correct React imports
// Import React properly without useEffectEvent
import React from "react"

// Re-export React for use throughout the application
export default React

// Export commonly used hooks explicitly
export const {
  useState,
  useEffect,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
  useLayoutEffect,
  useDebugValue,
  useDeferredValue,
  useTransition,
  useId,
  // useEffectEvent is not exported from React yet in stable versions
  // If you need similar functionality, use useCallback with dependencies
} = React
