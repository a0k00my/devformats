import { tr } from '../lib/strings';

// English-only shim kept so existing tool components (`const { tr } = useLang()`)
// don't need touching until they're re-skinned in Phase 7.
export function useLang() {
  return { tr };
}
