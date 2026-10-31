import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('attendance presentation keeps closing time and controls without redundant sign-in/footer copy',()=>{
 const source=readFileSync(new URL('../src/components/attendance/attendance-presentation.tsx',import.meta.url),'utf8');
 assert.match(source,/Closes \{attendanceTime\(session.closes_at\)\}/);
 assert.match(source,/Exit presentation/);
 assert.match(source,/Scan to check in/);
 assert.match(source,/Or enter this code in GAP/);
 assert.doesNotMatch(source,/Sign in with your approved UC Davis account|Keep this screen open|<footer/);
 assert.match(source,/aria-describedby=\{open \? undefined : 'attendance-presentation-instructions'\}/);
});
