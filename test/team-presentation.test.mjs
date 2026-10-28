import assert from 'node:assert/strict';
import test from 'node:test';
import { nextTeamName, defaultTeam } from '../src/lib/teams/presentation.ts';

test('numbered team suggestions advance above existing numbers without changing names', () => {
  const teams = Array.from({ length: 6 }, (_, i) => ({ name: `Team ${i + 1}` }));
  assert.equal(nextTeamName(teams), 'Team 7');
  assert.equal(nextTeamName([]), 'Team 1');
  assert.equal(nextTeamName([{ name: 'Research' }, { name: 'Team 2' }, { name: 'Team 9' }]), 'Team 10');
  assert.deepEqual(teams.map(team => team.name), ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5', 'Team 6']);
  assert.equal(nextTeamName([{ name: 'Team 7', isTest: true }, { name: 'Team 6', isTest: false }]), 'Team 8');
  assert.equal(nextTeamName([{ name: 'team 03' }, { name: 'Team research' }]), 'Team 4');
});

test('default selection prefers the first official team with a test-only fallback', () => {
  const testTeam = { id: 'test', name: 'Test research', isTest: true };
  const official = { id: 'official', name: 'Team 1', isTest: false };
  assert.equal(defaultTeam([testTeam, official]), official);
  assert.equal(defaultTeam([testTeam]), testTeam);
  assert.equal(defaultTeam([]), undefined);
});
