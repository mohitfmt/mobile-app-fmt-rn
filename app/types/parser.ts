export interface ParsedNode {
  type: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: ParsedNode[];
  parent?: ParsedNode | null; // Add the parent property
}

export interface HTMLContentParserProps {
  htmlContent: string;
}

// Default export to satisfy Expo Router
export default function Parser() {
  return null;
}
