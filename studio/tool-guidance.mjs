// Build-time platform guidance belongs here, never in imported skill content.
// Both the inline editor and the facet dialog use the same plain-text values.
export const TOOL_FIELD_GUIDANCE={
 connection:'Use the configured connection identifier from your platform administrator. Do not guess it or enter a password or access token.',
 operation:'Use an operation supported by that connection. Ask your platform administrator where to find its operation names and any connection limits.'
};
export function toolFieldHelp(field){return TOOL_FIELD_GUIDANCE[field]||'';}
