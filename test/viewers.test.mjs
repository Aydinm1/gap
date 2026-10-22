import assert from 'node:assert/strict';
import test from 'node:test';
import { selectExploreCohort } from '../src/lib/program/explore.ts';
const active={id:'active',state:'active',quarter:'fall',year:2026},archived={id:'archive',state:'archived',quarter:'winter',year:2027},draft={id:'draft',state:'draft',quarter:'spring',year:2027};
test('viewer cohort defaults prefer active, then latest archive, never drafts',()=>{
 assert.equal(selectExploreCohort([draft,archived,active]).id,'active');
 assert.equal(selectExploreCohort([draft,archived]).id,'archive');
 assert.equal(selectExploreCohort([draft]),undefined);
 assert.equal(selectExploreCohort([]),undefined);
 assert.equal(selectExploreCohort([active,archived],'archive').id,'archive');
 assert.equal(selectExploreCohort([active,draft],'draft'),undefined);
 assert.equal(selectExploreCohort([active],'invalid'),undefined);
});
