import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupUploadBatches } from '../scripts/lib/cleanup-upload-batches.mjs';

test('cleanup command runner preserves scope and failure receipts for retry',async()=>{
  for (const failure of ['storage','network','receipt',null]) {
    let claimed=false; const receipts=[];
    const db={rpc:async(_name,args)=>{
      assert.equal(args.p_owner,'fixture-owner');
      if(args.p_id){receipts.push(args);return {error:failure==='receipt'};}
      const data=claimed?[]:[{id:'fixture-intent',path:'fixture/path'}];claimed=true;return {data};
    },storage:{from:bucket=>{assert.equal(bucket,'submissions');return {remove:async paths=>{
      assert.deepEqual(paths,['fixture/path']);if(failure==='network')throw new Error('offline');return {error:failure==='storage'};
    }};}}};
    assert.deepEqual(await cleanupUploadBatches(db,'fixture-owner'),failure?{removed:0,failed:1}:{removed:1,failed:0});
    assert.equal(receipts[0].p_failed,['storage','network'].includes(failure));
  }
});
