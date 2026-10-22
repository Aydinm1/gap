import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAttendanceCode, isCheckInOpen, attendanceTime } from '../src/lib/attendance/types.ts';
test('workshop code entry normalizes case, spaces and hyphens only',()=>{
 assert.equal(normalizeAttendanceCode(' ab-23\tcd '),'AB23CD');
 assert.equal(normalizeAttendanceCode('abc/12!'),'ABC/12!');
});
test('attendance expiry is exclusive and early closure always wins',()=>{
 const s={closes_at:'2026-10-21T20:00:00Z',closed_at:null};
 assert.equal(isCheckInOpen(s,'2026-10-21T19:59:59Z'),true);
 assert.equal(isCheckInOpen(s,'2026-10-21T20:00:00Z'),false);
 assert.equal(isCheckInOpen({...s,closed_at:'2026-10-21T19:00:00Z'},'2026-10-21T19:30:00Z'),false);
 assert.match(attendanceTime(s.closes_at),/PDT/);
});
