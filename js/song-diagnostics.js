(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SongDiagnostics=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
function inspectSong(song,model){
 const raw=typeof song.rawText==='string'?song.rawText:'';
 const structured=song.editorVersion===2&&song.structuredContent&&model&&model.validateStructuredContent(song.structuredContent);
 const conversion=model&&model.convertLegacy?model.convertLegacy(raw):null;
 const lines=raw.split(/\r?\n/);
 const chordLines=lines.filter(line=>model&&model.isChordLine(line));
 const tabs=lines.reduce((n,line)=>n+(line.includes('\t')?1:0),0);
 const labels=lines.filter(line=>/^\s*\[.*\]\s*$/.test(line)).length;
 const emptyChordRows=structured&&structured.valid?song.structuredContent.blocks.flatMap(b=>b.rows).filter(r=>!r.lyric&&r.chords.length).length:0;
 let status='legacy';
 if(structured&&structured.valid)status='structured-valid';
 else if(song.structuredContent)status='structured-invalid';
 else if(conversion&&conversion.ok)status='legacy-convertible';
 else if(raw.trim())status='legacy-ambiguous';
 else status='empty';
 return {id:song.id||null,title:song.title||'',status,lineCount:lines.length,chordLineCount:chordLines.length,sectionCount:labels,tabLineCount:tabs,instrumentalStructuredRows:emptyChordRows,conversionReason:conversion&&conversion.reason||null,warnings:conversion&&!conversion.ok?conversion.warnings:[]};
}
function summarize(songs,model){const rows=(songs||[]).map(song=>inspectSong(song,model));const counts={};rows.forEach(row=>counts[row.status]=(counts[row.status]||0)+1);return {total:rows.length,counts,rows};}
return {inspectSong,summarize};
});