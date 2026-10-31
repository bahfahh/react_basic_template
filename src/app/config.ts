/**
 * Where agents read pack files from. The repo is public, so GitHub's raw file URL works
 * today; switch to the deployed site's /packs/ once it has a public domain.
 */
export const PACK_BASE_URL =
  'https://raw.githubusercontent.com/bahfahh/react_basic_template/claude/react-prototype-a485u2/public/packs/';

export const packUrl = (id: string, ext: 'md' | 'json' = 'md') => `${PACK_BASE_URL}${id}.${ext}`;
