/**
 * Vitest global setup — V0.7.
 *
 * Extends Vitest's `expect` with @testing-library/jest-dom matchers
 * (toBeInTheDocument, toHaveClass, toHaveAttribute, etc.) for component tests.
 */
import '@testing-library/jest-dom/vitest';
