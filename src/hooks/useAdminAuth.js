// Simple module-level session flag. It survives component remounts but resets on refresh or a new tab.
let _unlocked = false;

export function isUnlocked() {
  return _unlocked;
}

export function unlock() {
  _unlocked = true;
}
