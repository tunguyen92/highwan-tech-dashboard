import fs from 'node:fs';

const dryRun = process.argv.includes('--dry-run');
const dashboard = 'src/app/(main)/dashboard';

const targets = [
  'src/app/(external)',
  'src/app/(main)/auth',
  'src/app/(main)/chat',
  'src/app/(main)/mail',
  ...[
    '(legacy)',
    'academy',
    'analytics',
    'calendar',
    'chat',
    'coming-soon',
    'crm',
    'default',
    'ecommerce',
    'file-manager',
    'finance',
    'infrastructure',
    'invoice',
    'kanban',
    'logistics',
    'mail',
    'patient-monitoring',
    'productivity',
    'products',
    'profile',
    'roles',
    'tasks',
    'users',
  ].map((name) => `${dashboard}/${name}`),
  `${dashboard}/_components/header/account-switcher.tsx`,
  `${dashboard}/_components/header/github-repositories-menu.tsx`,
  `${dashboard}/_components/sidebar/support-card.tsx`,
  'src/data',
  'src/proxy.disabled.ts',
];

let removed = 0;
for (const target of targets) {
  if (!fs.existsSync(target)) continue;
  console.log(`remove: ${target}`);
  if (!dryRun) fs.rmSync(target, { recursive: true, force: true });
  removed++;
}

console.log(
  dryRun
    ? `(dry run: ${removed} item(s) would be removed, nothing was changed)`
    : `Done: ${removed} item(s) removed. Run "npx tsc --noEmit" to confirm nothing else referenced them.`
);
