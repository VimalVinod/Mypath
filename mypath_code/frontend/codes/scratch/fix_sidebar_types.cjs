const fs = require('fs');

const path = 'src/components/SidebarLayout.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add getAvatarColor if missing
const avatarColorCode = `
// Avatar color palette
const AVATAR_COLORS = [
  { bg: '#3B82F6', text: '#FFFFFF' }, // Blue
  { bg: '#EF4444', text: '#FFFFFF' }, // Red
  { bg: '#10B981', text: '#FFFFFF' }, // Emerald
  { bg: '#F59E0B', text: '#FFFFFF' }, // Amber
  { bg: '#8B5CF6', text: '#FFFFFF' }, // Purple
  { bg: '#EC4899', text: '#FFFFFF' }, // Pink
  { bg: '#06B6D4', text: '#FFFFFF' }, // Cyan
  { bg: '#F97316', text: '#FFFFFF' }  // Orange
];

const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0].bg;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length].bg;
};
`;

if (!code.includes('getAvatarColor')) {
  code = code.replace(
    /interface SidebarLayoutProps \{/,
    avatarColorCode + '\ninterface SidebarLayoutProps {'
  );
}

// 2. Add 'materials' to activeNav type
code = code.replace(
  /activeNav: 'dashboard' \| 'exams' \| 'tracker' \| 'profile' \| 'notifications';/,
  `activeNav: 'dashboard' | 'exams' | 'tracker' | 'materials' | 'profile' | 'notifications';`
);

// 3. Add Study Materials to NAV_ITEMS
if (!code.includes("path: '/materials'")) {
  code = code.replace(
    /\{ key: 'tracker',       label: 'My Tracker',   icon: ListChecks,      path: '\/tracker' \},/,
    `{ key: 'tracker',       label: 'My Tracker',   icon: ListChecks,      path: '/tracker' },\n  { key: 'materials',     label: 'Study Materials', icon: Search,      path: '/materials' },`
  );
  // Need BookOpen icon instead of Search ideally, but I'll add the import if needed. Let's check imports.
  if (code.includes("import {") && !code.includes("BookOpen")) {
    code = code.replace(/import \{/, 'import {\n  BookOpen,');
    code = code.replace(/icon: Search,\s*path: '\/materials'/, 'icon: BookOpen, path: \'/materials\'');
  }
}

fs.writeFileSync(path, code);
console.log('Sidebar types fixed.');
