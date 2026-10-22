import {readFile,writeFile,rename} from 'node:fs/promises';
import {zipSync,unzipSync} from 'fflate';
import assert from 'node:assert/strict';
import {validateSite,siteRoot} from './validate-site.mjs';

const files=await validateSite();
const entries={};
for(const file of files){
  entries[`CADCAM2026_Show/${file}`]=[new Uint8Array(await readFile(`${siteRoot}/${file}`)),{mtime:new Date('1980-01-01T00:00:00Z')}];
}
const zip=zipSync(entries,{level:9});
const extracted=unzipSync(zip);
assert.deepEqual(Object.keys(extracted).sort(),Object.keys(entries).sort());
for(const [name,[bytes]] of Object.entries(entries))assert.deepEqual(extracted[name],bytes,`ZIP mismatch: ${name}`);
const destination=new URL('../CADCAM2026_Show.zip',import.meta.url);
const temporary=new URL('../CADCAM2026_Show.zip.tmp',import.meta.url);
await writeFile(temporary,zip);
await rename(temporary,destination);
console.log(`Packaged and verified ${files.length} files: ${destination.pathname} (${zip.length} bytes)`);
