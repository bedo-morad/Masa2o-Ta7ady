import { Component, input, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScoreSheetEditor, SCORESHEET_EDITOR_SIZE } from './scoresheet-editor';
@Component({ selector: 'app-scoresheet-editor', standalone: true, imports: [FormsModule], encapsulation: ViewEncapsulation.None, styles: [`app-scoresheet-editor form{display:flex;flex-direction:column;gap:.5rem}app-scoresheet-editor input{min-height:48px;padding:.65rem .8rem;border:1px solid var(--pitch-line);border-radius:10px;background:var(--pitch-surface);color:var(--pitch-ink)}app-scoresheet-editor .teams{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}app-scoresheet-editor .team{border:1px solid var(--pitch-line);border-radius:10px;padding:.5rem}app-scoresheet-editor .lineup{list-style:none;margin:.5rem 0 0;padding:0;display:flex;flex-direction:column;gap:.45rem}`], template: `
<form [class.add]="mode() === 'add'" [class.edit]="mode() === 'edit'" class="column" (ngSubmit)="submit()">
 <input [ngModel]="mode() === 'add' ? editor().newMatch() : editor().editMatch()" (ngModelChange)="set('match',$event)" [name]="mode() === 'add' ? 'nm' : 'editMatch'" placeholder="اسم المباراة — مثال: نهائي كأس العالم 2022" />
 <div class="teams"><fieldset class="team"><legend class="team-label"><i class="fa-solid fa-shield-halved"></i> الفريق الأول</legend>
  <input class="team-name" [ngModel]="mode() === 'add' ? editor().newTeamA() : editor().editTeamA()" (ngModelChange)="set('a',$event)" [name]="mode() === 'add' ? 'nta2' : 'editTeamA'" placeholder="اسم الفريق الأول" aria-label="اسم الفريق الأول" />
  <ol class="lineup">@for (slot of slots; track slot; let i = $index) { <li><input class="player-box" [ngModel]="lineup('a',i)" (ngModelChange)="setLineup('a',i,$event)" [name]="(mode() === 'add' ? 'la' : 'ela') + slot" placeholder="اسم لاعب" aria-label="لاعب في الفريق الأول" /></li> }</ol>
 </fieldset><fieldset class="team"><legend class="team-label"><i class="fa-solid fa-shield-halved"></i> الفريق الثاني</legend>
  <input class="team-name" [ngModel]="mode() === 'add' ? editor().newTeamB() : editor().editTeamB()" (ngModelChange)="set('b',$event)" [name]="mode() === 'add' ? 'ntb' : 'editTeamB'" placeholder="اسم الفريق الثاني" aria-label="اسم الفريق الثاني" />
  <ol class="lineup">@for (slot of slots; track slot; let i = $index) { <li><input class="player-box" [ngModel]="lineup('b',i)" (ngModelChange)="setLineup('b',i,$event)" [name]="(mode() === 'add' ? 'lb' : 'elb') + slot" placeholder="اسم لاعب" aria-label="لاعب في الفريق الثاني" /></li> }</ol>
 </fieldset></div><div class="edit-actions"><button type="submit" [class.save]="mode() === 'edit'"><i class="fa-solid" [class.fa-plus]="mode() === 'add'" [class.fa-check]="mode() === 'edit'"></i> {{ mode() === 'add' ? 'إضافة مباراة' : 'حفظ' }}</button>@if (mode() === 'edit') { <button type="button" class="cancel" (click)="editor().cancel()">إلغاء</button> }</div>
</form>` })
export class ScoreSheetEditorComponent {
 readonly editor = input.required<ScoreSheetEditor>(); readonly mode = input<'add'|'edit'>('add'); readonly id = input<number>(); readonly slots = Array.from({length: SCORESHEET_EDITOR_SIZE}, (_, i) => i + 1);
 lineup(team: 'a'|'b', i: number): string { const e=this.editor(); return (this.mode()==='add' ? (team==='a'?e.lineupA():e.lineupB()) : (team==='a'?e.editLineupA():e.editLineupB()))[i]; }
 set(k: string, v: string): void { const e=this.editor(); if(k==='match') (this.mode()==='add'?e.newMatch:e.editMatch).set(v); else if(k==='a') (this.mode()==='add'?e.newTeamA:e.editTeamA).set(v); else (this.mode()==='add'?e.newTeamB:e.editTeamB).set(v); }
 setLineup(t:'a'|'b',i:number,v:string):void { const e=this.editor(); if(this.mode()==='add') (t==='a'?e.setLineupA.bind(e):e.setLineupB.bind(e))(i,v); else (t==='a'?e.setEditLineupA.bind(e):e.setEditLineupB.bind(e))(i,v); }
 submit():void { const e=this.editor(); void (this.mode()==='add'?e.add():e.save(this.id()!)); }
}
