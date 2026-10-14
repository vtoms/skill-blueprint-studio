import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,existsSync,copyFileSync,constants} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {emptyWorkspace,readWorkspace} from './workspace.mjs';

export class WorkspaceConflict extends Error{
  constructor(){super('Projects changed in another browser. Back up your unsaved changes, then reload the database.');this.status=409;}
}

export function openWorkspaceDatabase(filename,{template}={}){
  const path=resolve(filename);mkdirSync(dirname(path),{recursive:true});
  if(template&&!existsSync(path))try{copyFileSync(template,path,constants.COPYFILE_EXCL);}catch(error){if(error.code!=='EEXIST')throw error;}
  const database=new DatabaseSync(path);
  try{
    database.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
    const version=database.prepare('PRAGMA user_version').get().user_version;
    if(version>1)throw new Error('This database was created by a newer application version.');
    database.exec(`CREATE TABLE IF NOT EXISTS workspace_state (
      id INTEGER PRIMARY KEY CHECK (id=1), revision INTEGER NOT NULL,
      payload TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspace_history (
      revision INTEGER PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL
    ); PRAGMA user_version=1;`);
    database.prepare('INSERT OR IGNORE INTO workspace_state VALUES (1,0,?,?)').run(JSON.stringify(emptyWorkspace()),new Date().toISOString());
    const select=database.prepare('SELECT revision,payload,updated_at FROM workspace_state WHERE id=1');
    const read=()=>{const row=select.get();if(!row)throw new Error('The workspace record is missing.');return {workspace:readWorkspace(row.payload),revision:row.revision,updatedAt:row.updated_at};};
    read(); // Corrupt content stops startup; it is never replaced with empty data.
    return {
      path,
      read,
      write(workspace,expectedRevision){
        if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw new Error('A valid database revision is required.');
        const checked=readWorkspace(JSON.stringify(workspace)),payload=JSON.stringify(checked),now=new Date().toISOString();
        database.exec('BEGIN IMMEDIATE');
        try{
          const row=select.get();
          if(row.revision!==expectedRevision)throw new WorkspaceConflict();
          database.prepare('INSERT OR REPLACE INTO workspace_history VALUES (?,?,?)').run(row.revision,row.payload,row.updated_at);
          database.prepare('UPDATE workspace_state SET revision=?,payload=?,updated_at=? WHERE id=1').run(row.revision+1,payload,now);
          database.exec('DELETE FROM workspace_history WHERE revision NOT IN (SELECT revision FROM workspace_history ORDER BY revision DESC LIMIT 5); COMMIT');
          return {workspace:checked,revision:row.revision+1,updatedAt:now};
        }catch(error){database.exec('ROLLBACK');throw error;}
      },
      history(){return database.prepare('SELECT revision,updated_at FROM workspace_history ORDER BY revision DESC').all();},
      close(){database.close();}
    };
  }catch(error){database.close();throw error;}
}
