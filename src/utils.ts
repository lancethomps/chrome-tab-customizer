export function strTrim(val: string): string {
  return val.replace(/^\s+|\s+$/g, "");
}

export const POP_UP_AS_TAB_EXCEPTIONS_DEFAULT = '^chrome-devtools://\n^chrome://\n';

export const OPTIONS_DEFAULTS = {
  tabOpenPos: "default",
  tabCloseAction: "default",
  newTabAction: "default",
  popUpAsTab: false,
  popUpAsTabExceptions: POP_UP_AS_TAB_EXCEPTIONS_DEFAULT,
  externalLinkDefault: false,
  externalLinkUnfocus: false,
}