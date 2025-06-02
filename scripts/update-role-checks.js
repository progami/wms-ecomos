#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Role mappings
const roleReplacements = {
  'system_admin': 'admin',
  'finance_admin': 'staff',
  'warehouse_staff': 'staff',
  'manager': 'staff',
  'viewer': 'staff'
};

// Files to update
const patterns = [
  'src/**/*.ts',
  'src/**/*.tsx',
  'src/**/*.js',
  'src/**/*.jsx'
];

// Get all files
const files = patterns.flatMap(pattern => 
  glob.sync(pattern, { cwd: path.join(__dirname, '..') })
);

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace role checks in includes() calls
  const includesPattern = /\[['"]?(system_admin|finance_admin|warehouse_staff|manager|viewer)['"]?(,\s*['"]?(system_admin|finance_admin|warehouse_staff|manager|viewer)['"]?)*\]\.includes\(/g;
  content = content.replace(includesPattern, (match) => {
    modified = true;
    // If it includes system_admin, replace with ['admin']
    if (match.includes('system_admin')) {
      // If it's only system_admin, keep it admin only
      if (!match.includes('finance_admin') && !match.includes('warehouse_staff') && !match.includes('manager') && !match.includes('viewer')) {
        return "['admin'].includes(";
      }
      // If it includes other roles, allow both admin and staff
      return "['admin', 'staff'].includes(";
    }
    // For all other roles, allow both admin and staff
    return "['admin', 'staff'].includes(";
  });

  // Replace simple role equality checks
  const equalityPattern = /role\s*===\s*['"]?(system_admin|finance_admin|warehouse_staff|manager|viewer)['"]?/g;
  content = content.replace(equalityPattern, (match, role) => {
    modified = true;
    const newRole = roleReplacements[role];
    return `role === '${newRole}'`;
  });

  // Replace UserRole enum references
  const enumPattern = /UserRole\.(system_admin|finance_admin|warehouse_staff|manager|viewer)/g;
  content = content.replace(enumPattern, (match, role) => {
    modified = true;
    const newRole = roleReplacements[role];
    return `UserRole.${newRole}`;
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${file}`);
  }
});

console.log('Role check updates complete!');